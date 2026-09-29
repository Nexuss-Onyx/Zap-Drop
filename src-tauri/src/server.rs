use std::{io::SeekFrom, net::SocketAddr, path::PathBuf, sync::Arc, time::{Duration, Instant}};
use axum::{
    body::Body,
    extract::{ConnectInfo, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use futures_util::StreamExt;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, State as TState};
use tokio::{fs::File, io::AsyncSeekExt, net::TcpListener, sync::oneshot};
use tokio_util::{io::ReaderStream, sync::CancellationToken};
use tower_http::cors::CorsLayer;

use crate::{net, state::{AppState, Pending}};

#[derive(Clone, Serialize)]
pub struct SharedFile {
    pub id: String, pub name: String, pub size: u64, pub mime: String,
    #[serde(skip)] pub path: PathBuf,
}

pub struct ServerHandle { pub port: u16, pub token: String, pub cancel: CancellationToken }

#[derive(Clone)]
struct Shared { token: String, files: Arc<Vec<SharedFile>>, app: AppHandle, pending: Pending, cancel: CancellationToken }

#[derive(Deserialize)] struct TokenQ { t: Option<String> }
#[derive(Deserialize)] struct HelloQ { name: Option<String>, id: Option<String> }

fn ok(s: &Shared, q: &TokenQ) -> bool { q.t.as_deref() == Some(s.token.as_str()) }

async fn bind() -> Result<TcpListener, String> {
    // A fixed port range makes firewall rules and troubleshooting possible.
    for p in 48556..=48575u16 {
        if let Ok(l) = TcpListener::bind(("0.0.0.0", p)).await { return Ok(l); }
    }
    TcpListener::bind(("0.0.0.0", 0)).await.map_err(|e| e.to_string())
}

async fn hello(State(s): State<Shared>, ConnectInfo(addr): ConnectInfo<SocketAddr>, Query(h): Query<HelloQ>) -> Response {
    let (tx, rx) = oneshot::channel::<bool>();
    let rid = uuid::Uuid::new_v4().simple().to_string();
    s.pending.lock().await.insert(rid.clone(), tx);
    let name: String = h.name.unwrap_or_else(|| "Unknown device".into()).chars().take(40).collect();
    let _ = s.app.emit("incoming_request", json!({ "requestId": rid, "name": name, "deviceId": h.id, "ip": addr.ip().to_string() }));
    let decision = tokio::time::timeout(Duration::from_secs(45), rx).await;
    s.pending.lock().await.remove(&rid);
    match decision {
        Ok(Ok(true)) => Json(json!({ "token": s.token })).into_response(),
        _ => StatusCode::FORBIDDEN.into_response(),
    }
}

async fn manifest(State(s): State<Shared>, Query(q): Query<TokenQ>) -> Response {
    if !ok(&s, &q) { return StatusCode::FORBIDDEN.into_response(); }
    Json(&*s.files).into_response()
}

async fn done(State(s): State<Shared>, ConnectInfo(addr): ConnectInfo<SocketAddr>, Query(q): Query<TokenQ>) -> Response {
    if !ok(&s, &q) { return StatusCode::FORBIDDEN.into_response(); }
    let _ = s.app.emit("send_done", json!({ "peerIp": addr.ip().to_string() }));
    "ok".into_response()
}

async fn get_file(State(s): State<Shared>, Path(id): Path<String>, Query(q): Query<TokenQ>, headers: HeaderMap) -> Response {
    if !ok(&s, &q) { return StatusCode::FORBIDDEN.into_response(); }
    let Some(f) = s.files.iter().find(|f| f.id == id).cloned() else { return StatusCode::NOT_FOUND.into_response(); };
    let Ok(mut file) = File::open(&f.path).await else { return StatusCode::NOT_FOUND.into_response(); };
    let total = match file.metadata().await { Ok(m) => m.len(), Err(_) => return StatusCode::NOT_FOUND.into_response() };

    let mut start = 0u64;
    if let Some(r) = headers.get(header::RANGE).and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("bytes=")) {
        start = r.split('-').next().and_then(|n| n.trim().parse().ok()).unwrap_or(0);
    }
    if start >= total && total > 0 { return StatusCode::RANGE_NOT_SATISFIABLE.into_response(); }
    if start > 0 && file.seek(SeekFrom::Start(start)).await.is_err() { return StatusCode::INTERNAL_SERVER_ERROR.into_response(); }

    let app = s.app.clone();
    let fid = f.id.clone();
    let mut sent = start;
    let mut last = Instant::now();
    let stream = ReaderStream::with_capacity(file, 256 * 1024)
        .take_until(s.cancel.clone().cancelled_owned())
        .map(move |chunk| {
            if let Ok(b) = &chunk {
                sent += b.len() as u64;
                if last.elapsed() >= Duration::from_millis(100) || sent == total {
                    last = Instant::now();
                    let _ = app.emit("send_progress", json!({ "id": fid, "sent": sent, "total": total }));
                }
            }
            chunk
        });

    let disp = format!("attachment; filename*=UTF-8''{}", utf8_percent_encode(&f.name, NON_ALPHANUMERIC));
    let mut b = Response::builder()
        .status(if start > 0 { StatusCode::PARTIAL_CONTENT } else { StatusCode::OK })
        .header(header::CONTENT_TYPE, f.mime.as_str())
        .header(header::CONTENT_LENGTH, total - start)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_DISPOSITION, disp);
    if start > 0 { b = b.header(header::CONTENT_RANGE, format!("bytes {}-{}/{}", start, total - 1, total)); }
    b.body(Body::from_stream(stream)).unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendSession { ip: String, port: u16, token: String, code: String, qr_payload: String, files: Vec<SharedFile> }

#[tauri::command]
pub async fn start_send(
    app: AppHandle, state: TState<'_, AppState>,
    file_ids: Vec<String>, name: String, device_id: String, ip: Option<String>,
) -> Result<SendSession, String> {
    use std::sync::atomic::Ordering;
    let ip = ip.or_else(net::best_ip).ok_or("NO_NETWORK")?;

    let files: Vec<SharedFile> = {
        let idx = state.index.lock().unwrap();
        file_ids.iter().filter_map(|id| idx.iter().find(|f| &f.id == id)).map(|f| SharedFile {
            id: f.id.clone(), name: f.name.clone(), size: f.size, mime: f.mime.clone(), path: PathBuf::from(&f.path),
        }).collect()
    };
    if files.is_empty() { return Err("NO_FILES".into()); }

    if let Some(old) = state.server.lock().await.take() { old.cancel.cancel(); }

    let listener = bind().await?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let token = uuid::Uuid::new_v4().simple().to_string();
    let cancel = CancellationToken::new();

    let shared = Shared { token: token.clone(), files: Arc::new(files.clone()), app, pending: state.pending.clone(), cancel: cancel.clone() };
    let router = Router::new()
        .route("/hello", get(hello))
        .route("/manifest", get(manifest))
        .route("/file/:id", get(get_file))
        .route("/done", get(done))
        .layer(CorsLayer::permissive())
        .with_state(shared);

    let shutdown = cancel.clone();
    tokio::spawn(async move {
        let _ = axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
            .with_graceful_shutdown(async move { shutdown.cancelled().await })
            .await;
    });

    state.beacon_port.store(port, Ordering::Relaxed);
    *state.server.lock().await = Some(ServerHandle { port, token: token.clone(), cancel });

    let qr = json!({
        "v": 1, "ip": ip, "port": port, "token": token, "name": name, "deviceId": device_id,
        "files": files.iter().map(|f| json!({ "id": f.id, "name": f.name, "size": f.size, "mime": f.mime })).collect::<Vec<_>>()
    });
    let qr_payload = if qr.to_string().len() > 2500 {
        json!({ "v": 1, "ip": ip, "port": port, "token": token, "name": name, "deviceId": device_id, "files": [] }).to_string()
    } else { qr.to_string() };

    Ok(SendSession { code: format!("{ip}:{port}:{token}"), ip, port, token, qr_payload, files })
}

#[tauri::command]
pub async fn stop_send(state: TState<'_, AppState>) -> Result<(), String> {
    state.beacon_port.store(0, std::sync::atomic::Ordering::Relaxed);
    if let Some(h) = state.server.lock().await.take() { h.cancel.cancel(); }
    state.pending.lock().await.clear();
    Ok(())
}

#[tauri::command]
pub async fn answer_request(state: TState<'_, AppState>, request_id: String, accept: bool) -> Result<(), String> {
    if let Some(tx) = state.pending.lock().await.remove(&request_id) { let _ = tx.send(accept); }
    Ok(())
}
