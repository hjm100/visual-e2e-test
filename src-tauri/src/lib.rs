mod installer_cleanup;
mod sidecar;
mod storage;

use installer_cleanup::cleanup_if_needed;

use sidecar::{start_sidecar, stop_sidecar, SidecarState};
use storage::open_storage_in_file_manager;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

fn external_url(raw: &str) -> Result<WebviewUrl, String> {
    raw.parse()
        .map(WebviewUrl::External)
        .map_err(|e| format!("Invalid URL {raw}: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_state = SidecarState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(sidecar_state)
        .setup(|app| {
            let is_dev = cfg!(debug_assertions);

            if !is_dev {
                if let Err(err) = cleanup_if_needed(app.handle()) {
                    eprintln!("installer cleanup: {err}");
                }
            }

            let state = app.state::<SidecarState>();
            let (_layout, base_url) = start_sidecar(app.handle(), &state, is_dev)?;

            let target_url = if is_dev {
                "http://localhost:5173".to_string()
            } else {
                base_url
            };

            WebviewWindowBuilder::new(app, "main", external_url(&target_url)?)
                .title("Visual E2E Test")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 640.0)
                .center()
                .build()
                .map_err(|e| e.to_string())?;

            let open_data = MenuItem::with_id(app, "open-data", "打开数据目录", true, None::<&str>)
                .map_err(|e| e.to_string())?;
            let about = MenuItem::with_id(app, "about", "关于 Visual E2E Test", true, None::<&str>)
                .map_err(|e| e.to_string())?;
            let quit = PredefinedMenuItem::quit(app, None).map_err(|e| e.to_string())?;
            let app_menu = Submenu::with_items(app, "Visual E2E Test", true, &[&about, &open_data, &quit])
                .map_err(|e| e.to_string())?;
            let menu = Menu::with_items(app, &[&app_menu]).map_err(|e| e.to_string())?;
            app.set_menu(menu).map_err(|e| e.to_string())?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "open-data" => {
                    let is_dev = cfg!(debug_assertions);
                    if let Err(err) = open_storage_in_file_manager(app, is_dev) {
                        eprintln!("open-data: {err}");
                    }
                }
                "about" => {
                    eprintln!("Visual E2E Test — 本地 E2E 测试工作台");
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<SidecarState>() {
                    stop_sidecar(&state);
                }
            }
        });
}
