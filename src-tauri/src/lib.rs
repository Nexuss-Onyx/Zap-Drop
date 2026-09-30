mod client;
mod discovery;
mod library;
mod net;
mod server;
mod state;
mod util;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Only one instance: two copies would fight over UDP port 48555.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            library::scan_library,
            library::list_folders,
            library::list_files,
            library::list_directory,
            library::add_paths,
            library::get_thumbnail,
            net::network_status,
            net::connect_wifi,
            server::start_send,
            server::stop_send,
            server::answer_request,
            discovery::start_discovery,
            discovery::stop_discovery,
            client::request_access,
            client::fetch_manifest,
            client::start_receive,
            client::cancel_receive,
            util::open_file,
            util::reveal_file,
            util::default_save_dir,
            util::hold_awake,
            util::release_awake,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zapdrop");
}
