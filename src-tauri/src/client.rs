use std::{path::PathBuf, time::{Duration, Instant}};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, State};
use tokio::{fs::OpenOptions, io::AsyncWriteExt};
use tokio_util::sync::CancellationToken;

use crate::{net::parse_private_peer, state::AppState, util::{sanitize_filename, unique_path}};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RemoteFile { pub id: String, pub name: String, pub size: u64, #[serde(default)] pub mime: String }

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .no_proxy()
        .connect_timeout(Duration::from_secs(8))
        .read_timeout(Duration::from_secs(30))
        .build().map_err(|e| e.to_string())
}

/// Radar path: ask the sender for access. Blocks until the sender's user answers (max ~45 s).
#[tauri::command]
pub async fn request_access(ip: String, port: u16, name: String, device_id: String) -> Result<String, String> {
    let ip = parse_private_peer(&ip)?;
    let res = http()?
        .get(format!("http://{ip}:{port}/hello"))
        .query(&[("name", name.as_str()), ("id", device_id.as_str())])
        .timeout(Duration::from_secs(60))
        .send().await.map_err(|e| format!("UNREACHABLE: {e}"))?;
    if !res.status().is_success() { return Err("DECLINED".into()); }
    let v: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    v["token"].as_str().map(String::from).ok_or_else(|| "BAD_RESPONSE".into())
}

#[tauri::command]
pub async fn fetch_manifest(ip: String, port: u16, token: String) -> Result<Vec<RemoteFile>, String> {
    let ip = parse_private_peer(&ip)?;
    let res = http()?.get(format!("http://{ip}:{port}/manifest")).query(&[("t", token.as_str())])
        .timeout(Duration::from_secs(15)).send().await.map_err(|e| format!("UNREACHABLE: {e}"))?;
    if !res.status().is_success() { return Err(format!("HTTP_{}", res.status().as_u16())); }
    res.json::<Vec<RemoteFile>>().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_receive(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    if let Some(t) = state.downloads.lock().await.get(&session_id) { t.cancel(); }
    Ok(())
}

/// Downloads every file in `files`. Progress is streamed through events; the command
/// resolves with the saved paths when everything is done.
#[tauri::command]
pub async fn start_receive(
    app: AppHandle, state: State<'_, AppState>,
    session_id: String, ip: String, port: u16, token: String,
    peer_name: String, files: Vec<RemoteFile>, save_dir: Option<String>,
) -> Result<Vec<String>, String> {
    let ip = parse_private_peer(&ip)?;
    let cancel = CancellationToken::new();
    state.downloads.lock().await.insert(session_id.clone(), cancel.clone());

    let dir = PathBuf::from(save_dir.unwrap_or_else(crate::util::default_save_dir));
    tokio::fs::create_dir_all(&dir).await.map_err(|e| format!("CANNOT_CREATE_DIR: {e}"))?;

    let client = http()?;
    let base = format!("http://{ip}:{port}");
    let count = files.len();
    let mut saved: Vec<String> = Vec::new();
    let mut result: Result<(), String> = Ok(());

    for (i, f) in files.iter().enumerate() {
        match download_one(&app, &client, &base, &token, f, &dir, &cancel, i, count, &session_id).await {
            Ok(p) => {
                let p = p.to_string_lossy().into_owned();
                let _ = app.emit("recv_file_done", json!({ "sessionId": session_id, "fileId": f.id, "name": f.name, "size": f.size, "path": p, "peerName": peer_name }));
                saved.push(p);
            }
            Err(e) => { let _ = app.emit("recv_error", json!({ "sessionId": session_id, "fileId": f.id, "error": e })); result = Err(e); break; }
        }
    }

    state.downloads.lock().await.remove(&session_id);
    if result.is_ok() {
        let _ = client.get(format!("{base}/done")).query(&[("t", token.as_str())]).timeout(Duration::from_secs(5)).send().await;
        let _ = app.emit("recv_done", json!({ "sessionId": session_id, "saved": saved }));
    }
    result.map(|_| saved)
}

#[allow(clippy::too_many_arguments)]
async fn download_one(
    app: &AppHandle, client: &reqwest::Client, base: &str, token: &str, f: &RemoteFile,
    dir: &PathBuf, cancel: &CancellationToken, idx: usize, count: usize, session: &str,
) -> Result<PathBuf, String> {
    let final_path = unique_path(dir, &sanitize_filename(&f.name));
    let part = PathBuf::from(format!("{}.part", final_path.display()));
    let url = format!("{base}/file/{}", f.id);

    let started = Instant::now();
    let mut attempts = 0u8;

    loop {
        let have = tokio::fs::metadata(&part).await.map(|m| m.len()).unwrap_or(0);
        if f.size > 0 && have == f.size { break; }

        let mut req = client.get(&url).query(&[("t", token)]);
        if have > 0 { req = req.header("Range", format!("bytes={have}-")); }

        let res = match req.send().await {
            Ok(r) => r,
            Err(e) => { attempts += 1; if attempts >= 3 { return Err(format!("UNREACHABLE: {e}")); } tokio::time::sleep(Duration::from_secs(1)).await; continue; }
        };
        let status = res.status();
        if !status.is_success() { return Err(format!("HTTP_{}", status.as_u16())); }

        let resumed = status == reqwest::StatusCode::PARTIAL_CONTENT;
        let mut opts = OpenOptions::new();
        opts.create(true).write(true);
        if resumed { opts.append(true); } else { opts.truncate(true); }
        let mut out = opts.open(&part).await.map_err(|e| format!("WRITE_FAILED: {e}"))?;

        let mut got = if resumed { have } else { 0 };
        let total = if f.size > 0 { f.size } else { got + res.content_length().unwrap_or(0) };
        let base_bytes = got;
        let mut last = Instant::now();
        let mut stream = res.bytes_stream();
        let mut broken = false;

        loop {
            tokio::select! {
                _ = cancel.cancelled() => { drop(out); return Err("CANCELLED".into()); }
                next = stream.next() => match next {
                    None => break,
                    Some(Ok(chunk)) => {
                        out.write_all(&chunk).await.map_err(|e| format!("WRITE_FAILED: {e}"))?;
                        got += chunk.len() as u64;
                        if last.elapsed() >= Duration::from_millis(100) {
                            last = Instant::now();
                            let secs = started.elapsed().as_secs_f64().max(0.001);
                            let _ = app.emit("recv_progress", json!({
                                "sessionId": session, "fileId": f.id, "fileName": f.name, "loaded": got, "total": total,
                                "fileIndex": idx, "fileCount": count, "speedBps": ((got - base_bytes) as f64 / secs) as u64
                            }));
                        }
                    }
                    Some(Err(_)) => { broken = true; break; }
                }
            }
        }
        out.flush().await.map_err(|e| e.to_string())?;
        if broken { attempts += 1; if attempts >= 3 { return Err("CONNECTION_LOST".into()); } continue; }
        break;
    }

    let len = tokio::fs::metadata(&part).await.map(|m| m.len()).unwrap_or(0);
    if f.size > 0 && len != f.size { return Err(format!("SIZE_MISMATCH: expected {} got {}", f.size, len)); }
    tokio::fs::rename(&part, &final_path).await.map_err(|e| e.to_string())?;
    let _ = app.emit("recv_progress", json!({
        "sessionId": session, "fileId": f.id, "fileName": f.name, "loaded": len, "total": len,
        "fileIndex": idx, "fileCount": count, "speedBps": 0
    }));
    Ok(final_path)
}
