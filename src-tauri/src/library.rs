use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};

use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::{DirEntry, WalkDir};

use crate::state::AppState;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub mime: String,
    pub kind: String,     // image | video | audio | doc | app | archive | other
    pub folder: String,   // Downloads | Documents | Pictures | Videos | Music | Desktop | Screenshots | <custom>
    pub modified: u64,    // epoch ms
}

#[derive(Serialize)]
pub struct FolderInfo { pub name: String, pub count: usize, pub size: u64 }

#[derive(Serialize)]
pub struct Page { pub items: Vec<FileEntry>, pub total: usize }

pub fn kind_of(ext: &str) -> &'static str {
    match ext {
        "jpg"|"jpeg"|"png"|"gif"|"webp"|"bmp"|"heic"|"heif"|"avif"|"svg"|"tiff"|"raw"|"cr2"|"nef" => "image",
        "mp4"|"mkv"|"mov"|"avi"|"webm"|"m4v"|"wmv"|"flv"|"3gp"|"mpg"|"mpeg" => "video",
        "mp3"|"flac"|"wav"|"aac"|"m4a"|"ogg"|"opus"|"wma"|"aiff" => "audio",
        "pdf"|"doc"|"docx"|"xls"|"xlsx"|"ppt"|"pptx"|"txt"|"md"|"odt"|"ods"|"odp"|"csv"|"rtf"|"epub" => "doc",
        "apk"|"exe"|"msi"|"dmg"|"pkg"|"deb"|"rpm"|"appimage"|"flatpak"|"snap" => "app",
        "zip"|"rar"|"7z"|"tar"|"gz"|"xz"|"bz2"|"zst" => "archive",
        _ => "other",
    }
}

fn make_id(path: &str) -> String {
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    format!("{:016x}", h.finish())
}

pub fn entry_from_path(path: &Path, folder: &str) -> Option<FileEntry> {
    let md = fs::metadata(path).ok()?;
    if !md.is_file() || md.len() == 0 { return None; }
    let name = path.file_name()?.to_string_lossy().into_owned();
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let mime = mime_guess::from_path(path).first_or_octet_stream().essence_str().to_string();
    let modified = md.modified().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64).unwrap_or(0);
    let p = path.to_string_lossy().into_owned();
    Some(FileEntry { id: make_id(&p), path: p, name, size: md.len(), mime, kind: kind_of(&ext).into(), folder: folder.into(), modified })
}

fn roots(extra: &[String]) -> Vec<(String, PathBuf)> {
    let mut v: Vec<(String, PathBuf)> = Vec::new();
    let mut push = |label: &str, p: Option<PathBuf>| { if let Some(p) = p { if p.is_dir() { v.push((label.into(), p)); } } };
    push("Downloads", dirs::download_dir());
    push("Documents", dirs::document_dir());
    push("Pictures", dirs::picture_dir());
    push("Videos", dirs::video_dir());
    push("Music", dirs::audio_dir());
    push("Desktop", dirs::desktop_dir());
    for e in extra {
        let p = PathBuf::from(e);
        if p.is_dir() {
            let label = p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "Folder".into());
            v.push((label, p));
        }
    }
    v
}

fn skip(e: &DirEntry) -> bool {
    if e.depth() == 0 { return false; }
    let n = e.file_name().to_string_lossy();
    n.starts_with('.')
        || matches!(n.as_ref(), "node_modules" | "target" | "__pycache__" | "$RECYCLE.BIN" | "System Volume Information" | "AppData")
}

fn scan_blocking(app: &AppHandle, extra: &[String]) -> Vec<FileEntry> {
    let mut out: Vec<FileEntry> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for (label, root) in roots(extra) {
        let mut n = 0usize;
        for e in WalkDir::new(&root).max_depth(6).follow_links(false).into_iter()
            .filter_entry(|e| !skip(e)).filter_map(Result::ok)
        {
            if !e.file_type().is_file() { continue; }
            let path = e.path();
            // a Screenshots subfolder becomes its own folder card
            let in_shots = path.components().any(|c| {
                let s = c.as_os_str().to_string_lossy().to_lowercase();
                s == "screenshots" || s == "screenshot"
            });
            let folder = if in_shots { "Screenshots" } else { label.as_str() };
            if let Some(entry) = entry_from_path(path, folder) {
                if seen.insert(entry.id.clone()) { out.push(entry); n += 1; }
            }
            if n % 500 == 0 && n > 0 {
                let _ = app.emit("library_progress", json!({ "folder": label, "count": n }));
            }
        }
    }
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    out
}

/// Build (or rebuild) the index. Call once at startup and on pull-to-refresh.
#[tauri::command]
pub async fn scan_library(app: AppHandle, state: State<'_, AppState>, extra_roots: Vec<String>) -> Result<usize, String> {
    let app2 = app.clone();
    let files = tauri::async_runtime::spawn_blocking(move || scan_blocking(&app2, &extra_roots))
        .await.map_err(|e| e.to_string())?;
    let n = files.len();
    // keep files the user added by hand (folder == "Added") across rescans
    let mut idx = state.index.lock().unwrap();
    let added: Vec<FileEntry> = idx.iter().filter(|f| f.folder == "Added").cloned().collect();
    *idx = files;
    for a in added { if !idx.iter().any(|f| f.id == a.id) { idx.insert(0, a); } }
    Ok(n)
}

#[tauri::command]
pub fn list_folders(state: State<'_, AppState>) -> Vec<FolderInfo> {
    let idx = state.index.lock().unwrap();
    let mut map: std::collections::HashMap<String, (usize, u64)> = Default::default();
    for f in idx.iter() {
        let e = map.entry(f.folder.clone()).or_insert((0, 0));
        e.0 += 1; e.1 += f.size;
    }
    let order = ["Downloads", "Documents", "Pictures", "Videos", "Music", "Desktop", "Screenshots"];
    let mut v: Vec<FolderInfo> = map.into_iter()
        .filter(|(k, _)| k != "Added")
        .map(|(name, (count, size))| FolderInfo { name, count, size }).collect();
    v.sort_by_key(|f| order.iter().position(|o| *o == f.name).unwrap_or(99));
    v
}

#[tauri::command]
pub fn list_files(
    state: State<'_, AppState>,
    kind: Option<String>, folder: Option<String>, query: Option<String>,
    offset: usize, limit: usize,
) -> Page {
    let idx = state.index.lock().unwrap();
    let q = query.map(|s| s.to_lowercase()).filter(|s| !s.is_empty());
    let want_kind = kind.filter(|k| k != "all");
    let matches: Vec<&FileEntry> = idx.iter().filter(|f| {
        want_kind.as_ref().map_or(true, |k| &f.kind == k)
            && folder.as_ref().map_or(true, |d| &f.folder == d)
            && q.as_ref().map_or(true, |q| f.name.to_lowercase().contains(q))
    }).collect();
    let total = matches.len();
    let items = matches.into_iter().skip(offset).take(limit.min(200)).cloned().collect();
    Page { items, total }
}

/// Register files/folders the user picked with the dialog or dropped on the window.
/// Directories are expanded (depth-limited). Returns the entries so the UI can select them.
#[tauri::command]
pub async fn add_paths(state: State<'_, AppState>, paths: Vec<String>) -> Result<Vec<FileEntry>, String> {
    let entries = tauri::async_runtime::spawn_blocking(move || {
        let mut out = Vec::new();
        for p in paths {
            let path = PathBuf::from(&p);
            if path.is_dir() {
                for e in WalkDir::new(&path).max_depth(8).into_iter().filter_map(Result::ok) {
                    if e.file_type().is_file() {
                        if let Some(x) = entry_from_path(e.path(), "Added") { out.push(x); }
                    }
                }
            } else if let Some(x) = entry_from_path(&path, "Added") {
                out.push(x);
            }
        }
        out
    }).await.map_err(|e| e.to_string())?;

    let mut idx = state.index.lock().unwrap();
    for e in &entries {
        if let Some(existing) = idx.iter_mut().find(|f| f.id == e.id) { *existing = e.clone(); }
        else { idx.insert(0, e.clone()); }
    }
    Ok(entries)
}

// ---------------- thumbnails ----------------

static THUMB_SEM: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(4);

/// Returns the path of a cached 320px JPEG, or None (UI keeps its file-type icon).
/// The JS side calls this lazily for cards that scroll into view, then uses
/// convertFileSrc(path) as the <img src>.
#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, path: String) -> Result<Option<String>, String> {
    let _permit = THUMB_SEM.acquire().await.map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, String> {
        let src = PathBuf::from(&path);
        let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let kind = kind_of(&ext);
        if kind != "image" && kind != "video" { return Ok(None); }
        if matches!(ext.as_str(), "svg" | "heic" | "heif" | "raw" | "cr2" | "nef") { return Ok(None); }

        let md = fs::metadata(&src).map_err(|e| e.to_string())?;
        let mtime = md.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
        let mut h = DefaultHasher::new();
        (path.as_str(), mtime, md.len()).hash(&mut h);

        let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("thumbs");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let out = dir.join(format!("{:016x}.jpg", h.finish()));
        if out.exists() { return Ok(Some(out.to_string_lossy().into_owned())); }

        if kind == "image" {
            let img = image::open(&src).map_err(|e| e.to_string())?;
            img.thumbnail(320, 320).to_rgb8().save(&out).map_err(|e| e.to_string())?;
        } else {
            // Videos: use ffmpeg when installed; otherwise no thumbnail.
            let mut cmd = Command::new("ffmpeg");
            cmd.args(["-y", "-loglevel", "error", "-ss", "1", "-i"]).arg(&src)
               .args(["-frames:v", "1", "-vf", "scale=320:-2"]).arg(&out);
            #[cfg(windows)]
            { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
            match cmd.status() { Ok(s) if s.success() && out.exists() => {}, _ => return Ok(None) }
        }
        Ok(Some(out.to_string_lossy().into_owned()))
    }).await.map_err(|e| e.to_string())?
}

// ---------------- directory explorer ----------------

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
    pub item_count: Option<usize>,
    pub extension: Option<String>,
}

#[derive(Serialize)]
pub struct DirectoryResult {
    pub path: String,
    pub items: Vec<DirectoryItem>,
}

#[tauri::command]
pub fn list_directory(path: Option<String>) -> Result<DirectoryResult, String> {
    let target_path = match path {
        Some(ref p) if !p.is_empty() && p != "root" => PathBuf::from(p),
        _ => {
            let mut items = Vec::new();
            let mut push = |label: &str, p: Option<PathBuf>| {
                if let Some(p) = p {
                    if p.is_dir() {
                        let sub_count = fs::read_dir(&p).map(|r| r.count()).unwrap_or(0);
                        let mod_time = fs::metadata(&p).ok()
                            .and_then(|m| m.modified().ok())
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_millis() as u64).unwrap_or(0);
                        items.push(DirectoryItem {
                            name: label.to_string(),
                            path: p.to_string_lossy().into_owned(),
                            is_directory: true,
                            size: 0,
                            modified: mod_time,
                            item_count: Some(sub_count),
                            extension: None,
                        });
                    }
                }
            };
            push("Downloads", dirs::download_dir());
            push("Documents", dirs::document_dir());
            push("Pictures", dirs::picture_dir());
            push("Videos", dirs::video_dir());
            push("Music", dirs::audio_dir());
            push("Desktop", dirs::desktop_dir());
            if let Some(home) = dirs::home_dir() {
                if !items.iter().any(|i| i.path == home.to_string_lossy()) {
                    let sub_count = fs::read_dir(&home).map(|r| r.count()).unwrap_or(0);
                    items.push(DirectoryItem {
                        name: "Home".to_string(),
                        path: home.to_string_lossy().into_owned(),
                        is_directory: true,
                        size: 0,
                        modified: 0,
                        item_count: Some(sub_count),
                        extension: None,
                    });
                }
            }
            return Ok(DirectoryResult {
                path: "root".to_string(),
                items,
            });
        }
    };

    if !target_path.is_dir() {
        return Err("Target path is not a directory".to_string());
    }

    let mut items = Vec::new();
    if let Ok(entries) = fs::read_dir(&target_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
            if name.starts_with('.') {
                continue;
            }
            let is_dir = path.is_dir();
            let (size, modified) = fs::metadata(&path).ok().map(|m| {
                let s = if is_dir { 0 } else { m.len() };
                let t = m.modified().ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64).unwrap_or(0);
                (s, t)
            }).unwrap_or((0, 0));

            let item_count = if is_dir {
                fs::read_dir(&path).ok().map(|r| r.count())
            } else {
                None
            };

            let extension = if is_dir {
                None
            } else {
                path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase())
            };

            items.push(DirectoryItem {
                name,
                path: path.to_string_lossy().into_owned(),
                is_directory: is_dir,
                size,
                modified,
                item_count,
                extension,
            });
        }
    }

    items.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(DirectoryResult {
        path: target_path.to_string_lossy().into_owned(),
        items,
    })
}
