use std::{net::{IpAddr, Ipv4Addr}, process::Command};
use if_addrs::{get_if_addrs, IfAddr};
use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Iface { pub name: String, pub ip: String, pub likely_hotspot: bool, pub r#virtual: bool, #[serde(skip)] pub broadcast: Option<Ipv4Addr> }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStatus { pub ready: bool, pub suggested_ip: Option<String>, pub ssid: Option<String>, pub interfaces: Vec<Iface> }

fn is_virtual(name: &str) -> bool {
    let n = name.to_lowercase();
    ["docker", "br-", "veth", "virbr", "vmnet", "vboxnet", "vethernet", "tailscale", "zt", "utun", "awdl", "llw", "lo"]
        .iter().any(|p| n.starts_with(p))
}

pub fn interfaces() -> Vec<Iface> {
    get_if_addrs().unwrap_or_default().into_iter().filter_map(|i| {
        if i.is_loopback() { return None; }
        let IfAddr::V4(v4) = &i.addr else { return None; };
        if !v4.ip.is_private() || v4.ip.is_link_local() { return None; }
        let o = v4.ip.octets();
        let hotspot = (o[0] == 192 && o[1] == 168 && (o[2] == 43 || o[2] == 137)) || (o[0] == 172 && o[1] == 20 && o[2] == 10);
        Some(Iface { name: i.name.clone(), ip: v4.ip.to_string(), likely_hotspot: hotspot, r#virtual: is_virtual(&i.name), broadcast: v4.broadcast })
    }).collect()
}

pub fn best_ip() -> Option<String> {
    let all = interfaces();
    all.iter().find(|i| i.likely_hotspot && !i.r#virtual)
        .or_else(|| all.iter().find(|i| !i.r#virtual))
        .map(|i| i.ip.clone())
}

pub fn broadcast_targets() -> Vec<Ipv4Addr> {
    let mut v: Vec<Ipv4Addr> = interfaces().into_iter().filter(|i| !i.r#virtual).filter_map(|i| i.broadcast).collect();
    v.push(Ipv4Addr::BROADCAST);
    v.sort(); v.dedup();
    v
}

/// The UI passes IPs it received over the network back into commands.
/// Refuse anything that is not a private IPv4 so the webview cannot be tricked
/// into calling arbitrary hosts.
pub fn parse_private_peer(ip: &str) -> Result<Ipv4Addr, String> {
    match ip.parse::<IpAddr>() {
        Ok(IpAddr::V4(v4)) if v4.is_private() || v4.is_link_local() => Ok(v4),
        _ => Err("INVALID_PEER".into()),
    }
}

fn run(cmd: &str, args: &[&str]) -> Option<String> {
    let mut c = Command::new(cmd);
    c.args(args);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; c.creation_flags(0x08000000); }
    let o = c.output().ok()?;
    if !o.status.success() { return None; }
    Some(String::from_utf8_lossy(&o.stdout).into_owned())
}

/// Best effort. May legitimately return None (permissions, wired, unsupported OS build).
pub fn current_ssid() -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        let out = run("nmcli", &["-t", "-f", "active,ssid", "dev", "wifi"])?;
        return out.lines().find_map(|l| l.strip_prefix("yes:")).map(|s| s.to_string()).filter(|s| !s.is_empty());
    }
    #[cfg(target_os = "windows")]
    {
        let out = run("netsh", &["wlan", "show", "interfaces"])?;
        return out.lines().find_map(|l| {
            let t = l.trim();
            if t.starts_with("SSID") && !t.starts_with("BSSID") { t.split_once(':').map(|(_, v)| v.trim().to_string()) } else { None }
        }).filter(|s| !s.is_empty());
    }
    #[cfg(target_os = "macos")]
    {
        let dev = macos_wifi_device()?;
        let out = run("networksetup", &["-getairportnetwork", &dev])?;
        return out.split_once(": ").map(|(_, v)| v.trim().to_string())
            .filter(|s| !s.is_empty() && !s.contains("not associated") && !s.contains("redacted"));
    }
    #[allow(unreachable_code)]
    None
}

#[cfg(target_os = "macos")]
fn macos_wifi_device() -> Option<String> {
    let out = run("networksetup", &["-listallhardwareports"])?;
    let mut lines = out.lines();
    while let Some(l) = lines.next() {
        if l.contains("Hardware Port: Wi-Fi") || l.contains("Hardware Port: AirPort") {
            return lines.next().and_then(|d| d.strip_prefix("Device: ")).map(|s| s.trim().to_string());
        }
    }
    None
}

#[tauri::command]
pub fn network_status() -> NetworkStatus {
    let interfaces = interfaces();
    let suggested_ip = best_ip();
    NetworkStatus { ready: suggested_ip.is_some(), suggested_ip, ssid: current_ssid(), interfaces }
}

// ---------- optional: join a hotspot from inside the app ----------

#[tauri::command]
pub async fn connect_wifi(ssid: String, password: String) -> Result<(), String> {
    if ssid.trim().is_empty() || ssid.len() > 64 || password.len() > 128 { return Err("INVALID_INPUT".into()); }
    tauri::async_runtime::spawn_blocking(move || connect_blocking(&ssid, &password))
        .await.map_err(|e| e.to_string())?
}

#[cfg(target_os = "linux")]
fn connect_blocking(ssid: &str, pw: &str) -> Result<(), String> {
    let o = Command::new("nmcli").args(["--wait", "20", "dev", "wifi", "connect", ssid, "password", pw])
        .output().map_err(|e| format!("nmcli not available: {e}"))?;
    if o.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&o.stderr).trim().to_string()) }
}

#[cfg(target_os = "macos")]
fn connect_blocking(ssid: &str, pw: &str) -> Result<(), String> {
    let dev = macos_wifi_device().ok_or("No Wi-Fi adapter found")?;
    let o = Command::new("networksetup").args(["-setairportnetwork", &dev, ssid, pw]).output().map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&o.stdout).to_string();
    if o.status.success() && !text.to_lowercase().contains("failed") && !text.to_lowercase().contains("error") { Ok(()) } else { Err(text.trim().to_string()) }
}

#[cfg(target_os = "windows")]
fn connect_blocking(ssid: &str, pw: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    fn esc(s: &str) -> String { s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&apos;") }
    let xml = format!(
        r#"<?xml version="1.0"?><WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1"><name>{s}</name><SSIDConfig><SSID><name>{s}</name></SSID></SSIDConfig><connectionType>ESS</connectionType><connectionMode>auto</connectionMode><MSM><security><authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption><sharedKey><keyType>passphrase</keyType><protected>false</protected><keyMaterial>{p}</keyMaterial></sharedKey></security></MSM></WLANProfile>"#,
        s = esc(ssid), p = esc(pw));
    let file = std::env::temp_dir().join(format!("zapdrop-{}.xml", uuid::Uuid::new_v4().simple()));
    std::fs::write(&file, xml).map_err(|e| e.to_string())?;
    let add = Command::new("netsh").args(["wlan", "add", "profile"]).arg(format!("filename={}", file.display()))
        .creation_flags(0x08000000).output();
    let _ = std::fs::remove_file(&file);
    let add = add.map_err(|e| e.to_string())?;
    if !add.status.success() { return Err(String::from_utf8_lossy(&add.stdout).trim().to_string()); }
    let conn = Command::new("netsh").args(["wlan", "connect"]).arg(format!("name={ssid}"))
        .creation_flags(0x08000000).output().map_err(|e| e.to_string())?;
    if conn.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&conn.stdout).trim().to_string()) }
}
