use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

/// Dev-only user data folder (legacy Launcher name; separate from production bundle id).
const DEV_APP_DATA_FOLDER: &str = "visual-e2e-test";

#[derive(Debug, Clone)]
pub struct StorageLayout {
    pub storage_root: PathBuf,
    pub projects_dir: PathBuf,
    pub config_dir: PathBuf,
}

fn layout_from_root(storage_root: PathBuf) -> StorageLayout {
    StorageLayout {
        projects_dir: storage_root.join("projects"),
        config_dir: storage_root.join("config"),
        storage_root,
    }
}

fn dev_storage_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = app
            .path()
            .home_dir()
            .map_err(|e| format!("home_dir: {e}"))?;
        return Ok(home
            .join("Library")
            .join("Application Support")
            .join(DEV_APP_DATA_FOLDER)
            .join("Storage"));
    }

    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA")
            .map_err(|e| format!("APPDATA env: {e}"))?;
        return Ok(PathBuf::from(appdata)
            .join(DEV_APP_DATA_FOLDER)
            .join("Storage"));
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = app
            .path()
            .home_dir()
            .map_err(|e| format!("home_dir: {e}"))?;
        Ok(home.join(".local").join("share").join(DEV_APP_DATA_FOLDER).join("Storage"))
    }
}

pub fn resolve_storage_layout(app: &tauri::AppHandle, is_dev: bool) -> Result<StorageLayout, String> {
    let storage_root = if is_dev {
        dev_storage_root(app)?
    } else {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("app_data_dir: {e}"))?;
        app_data.join("Storage")
    };
    Ok(layout_from_root(storage_root))
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

pub fn open_storage_in_file_manager(app: &tauri::AppHandle, is_dev: bool) -> Result<(), String> {
    let layout = resolve_storage_layout(app, is_dev)?;
    app.opener()
        .open_path(
            layout.storage_root.to_string_lossy().to_string(),
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}
