use std::{collections::HashMap, net::{SocketAddr, SocketAddrV4}, sync::{atomic::{AtomicU16, Ordering}, Arc}, time::{Duration, Instant}};
use serde_json::json;
use socket2::{Domain, Protocol, Socket, Type};
use tauri::{AppHandle, Emitter, State};
use tokio::net::UdpSocket;
use tokio_util::sync::CancellationToken;

use crate::{net::broadcast_targets, state::AppState};

const PORT: u16 = 48555;
const PLATFORM: &str = if cfg!(target_os = "windows") { "windows" } else if cfg!(target_os = "macos") { "macos" } else { "linux" };

fn make_socket() -> std::io::Result<UdpSocket> {
    let s = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
    s.set_reuse_address(true)?;
    #[cfg(unix)] s.set_reuse_port(true)?;
    s.set_broadcast(true)?;
    s.set_nonblocking(true)?;
    s.bind(&SocketAddr::from(([0, 0, 0, 0], PORT)).into())?;
    UdpSocket::from_std(s.into())
}

async fn run(app: AppHandle, id: String, name: String, my_port: Arc<AtomicU16>, cancel: CancellationToken) -> std::io::Result<()> {
    let sock = make_socket()?;
    let clean_name = name.replace('|', "/");
    let mut tick = tokio::time::interval(Duration::from_secs(2));
    let mut buf = [0u8; 1024];
    let mut seen: HashMap<String, (Instant, (String, u16))> = HashMap::new();

    loop {
        tokio::select! {
            _ = cancel.cancelled() => break,

            _ = tick.tick() => {
                let msg = format!("ZAPDROP|{}|{}|{}|{}", id, clean_name, my_port.load(Ordering::Relaxed), PLATFORM);
                for b in broadcast_targets() {
                    let _ = sock.send_to(msg.as_bytes(), SocketAddrV4::new(b, PORT)).await;
                }
                let gone: Vec<String> = seen.iter().filter(|(_, (t, _))| t.elapsed() > Duration::from_secs(8)).map(|(k, _)| k.clone()).collect();
                for k in gone { seen.remove(&k); let _ = app.emit("device_lost", json!({ "id": k })); }
            }

            Ok((n, from)) = sock.recv_from(&mut buf) => {
                let Ok(text) = std::str::from_utf8(&buf[..n]) else { continue };
                let p: Vec<&str> = text.split('|').collect();
                if p.len() < 4 || p[0] != "ZAPDROP" || p[1] == id { continue; }
                let port: u16 = p[3].parse().unwrap_or(0);
                let name = p[2].to_string();
                let key = (name.clone(), port);
                let changed = seen.get(p[1]).map_or(true, |(_, last)| *last != key);
                seen.insert(p[1].to_string(), (Instant::now(), key));
                if changed {
                    let _ = app.emit("device_found", json!({
                        "id": p[1], "name": name, "ip": from.ip().to_string(), "port": port,
                        "platform": p.get(4).copied().unwrap_or("unknown")
                    }));
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn start_discovery(app: AppHandle, state: State<'_, AppState>, device_id: String, name: String) -> Result<(), String> {
    let mut g = state.discovery.lock().await;
    if g.is_some() { return Ok(()); }
    let cancel = CancellationToken::new();
    *g = Some(cancel.clone());
    let port = state.beacon_port.clone();
    tokio::spawn(async move {
        if let Err(e) = run(app.clone(), device_id, name, port, cancel).await {
            let _ = app.emit("discovery_error", json!({ "error": e.to_string() }));
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn stop_discovery(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(c) = state.discovery.lock().await.take() { c.cancel(); }
    Ok(())
}
