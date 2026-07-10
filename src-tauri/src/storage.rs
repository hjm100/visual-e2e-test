use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Clone)]
pub struct StorageLayout {
    pub storage_root: PathBuf,
    pub projects_dir: PathBuf,
    pub config_dir: PathBuf,
}

pub fn resolve_storage_layout(app: &tauri::AppHandle) -> Result<StorageLayout, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let storage_root = app_data.join("Storage");
    Ok(StorageLayout {
        projects_dir: storage_root.join("projects"),
        config_dir: storage_root.join("config"),
        storage_root,
    })
}

pub fn ensure_storage(layout: &StorageLayout, bundled_app_root: &Path) -> Result<(), String> {
    fs::create_dir_all(&layout.projects_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&layout.config_dir).map_err(|e| e.to_string())?;

    let settings_path = layout.config_dir.join("settings.json");
    if !settings_path.exists() {
        let bundled = bundled_app_root.join("config").join("settings.json");
        if bundled.exists() {
            fs::copy(&bundled, &settings_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn open_storage_in_file_manager(app: &tauri::AppHandle) -> Result<(), String> {
    let layout = resolve_storage_layout(app)?;
    app.opener()
        .open_path(layout.storage_root.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}
