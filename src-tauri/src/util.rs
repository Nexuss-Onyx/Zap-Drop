use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::state::AppState;

/// Remote file names are UNTRUSTED. Strip anything that could escape the folder
/// or break on Windows.
pub fn sanitize_filename(name: &str) -> String {
    let mut s: String = name
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() { '_' } else { c })
        .collect();
    s = s.trim().trim_matches('.').trim().to_string();
    if s.is_empty() { s = "file".into(); }
    let stem = s.split('.').next().unwrap_or("").to_uppercase();
    const RESERVED: [&str; 22] = [
        "CON","PRN","AUX","NUL","COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
        "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
    ];
    if RESERVED.contains(&stem.as_str()) { s = format!("_{s}"); }
    if s.chars().count() > 180 {
        // keep the extension when shortening
        let ext = Path::new(&s).extension().and_then(|e| e.to_str()).unwrap_or("").to_string();
        let base: String = s.chars().take(150).collect();
        s = if ext.is_empty() { base } else { format!("{base}.{ext}") };
    }
    s
}

/// photo.jpg -> photo (1).jpg -> photo (2).jpg ...
pub fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() && !dir.join(format!("{name}.part")).exists() { return candidate; }
    let p = Path::new(name);
    let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = p.extension().and_then(|e| e.to_str());
    for i in 1..10_000 {
        let n = match ext { Some(e) => format!("{stem} ({i}).{e}"), None => format!("{stem} ({i})") };
        let c = dir.join(&n);
        if !c.exists() && !dir.join(format!("{n}.part")).exists() { return c; }
    }
    dir.join(format!("{stem}-{}", uuid::Uuid::new_v4().simple()))
}

#[tauri::command]
pub fn default_save_dir() -> String {
    dirs::download_dir()
        .or_else(dirs::document_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Zapdrop")
        .to_string_lossy()
        .into_owned()
}

/// Open a received file with the OS default app.
#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())
}

/// Show the file selected in Explorer / Finder / the Linux file manager.
#[tauri::command]
pub fn reveal_file(path: String) -> Result<(), String> {
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(|e| e.to_string())
}

/// Stop the computer sleeping mid-transfer.
#[tauri::command]
pub fn hold_awake(state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.awake.lock().unwrap();
    if g.is_none() {
        *g = keepawake::Builder::default()
            .display(false).idle(true).sleep(true)
            .reason("Zapdrop transfer").app_name("Zapdrop")
            .create().ok();
    }
    Ok(())
}

#[tauri::command]
pub fn release_awake(state: State<'_, AppState>) {
    *state.awake.lock().unwrap() = None;
}
