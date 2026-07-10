use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use tauri::{AppHandle, Manager};

use crate::storage::resolve_storage_layout;

const PRODUCT_NAME: &str = "Visual E2E Test";
const CLEANUP_FLAG: &str = "installer_cleanup.done";

/// 生产环境首次启动时删除安装包（macOS: .dmg）。
pub fn cleanup_if_needed(app: &AppHandle) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    cleanup_macos_dmg(app)
}

#[cfg(target_os = "macos")]
fn cleanup_macos_dmg(app: &AppHandle) -> Result<(), String> {
    let layout = resolve_storage_layout(app, false)?;
    fs::create_dir_all(&layout.config_dir).map_err(|e| e.to_string())?;

    let flag = layout.config_dir.join(CLEANUP_FLAG);
    if flag.exists() {
        return Ok(());
    }

    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("home_dir: {e}"))?;

    let mut candidates = collect_dmg_from_hdiutil(PRODUCT_NAME);
    for dir in [home.join("Downloads"), home.join("Desktop")] {
        candidates.extend(collect_dmg_in_dir(&dir, PRODUCT_NAME));
    }
    candidates.sort();
    candidates.dedup();

    for path in &candidates {
        if let Err(err) = remove_dmg(path) {
            eprintln!("installer cleanup: skip {} ({err})", path.display());
        }
    }

    fs::write(&flag, "1").map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn collect_dmg_from_hdiutil(product: &str) -> Vec<PathBuf> {
    let output = match Command::new("hdiutil").arg("info").output() {
        Ok(o) if o.status.success() => o,
        _ => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut paths = Vec::new();

    for section in text.split("==============") {
        if !section.contains(product) {
            continue;
        }
        for line in section.lines() {
            let trimmed = line.trim();
            if let Some(path) = trimmed
                .strip_prefix("image-path")
                .map(|s| s.trim().trim_start_matches(':').trim())
            {
                if path.ends_with(".dmg") {
                    paths.push(PathBuf::from(path));
                }
            }
        }
    }

    paths
}

#[cfg(target_os = "macos")]
fn collect_dmg_in_dir(dir: &Path, product: &str) -> Vec<PathBuf> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().is_some_and(|ext| ext == "dmg")
                && path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n.starts_with(product))
        })
        .collect()
}

#[cfg(target_os = "macos")]
fn remove_dmg(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    detach_if_mounted(path);
    fs::remove_file(path).map_err(|e| format!("remove {}: {e}", path.display()))
}

#[cfg(target_os = "macos")]
fn detach_if_mounted(image_path: &Path) {
    let _ = Command::new("hdiutil")
        .args(["detach", image_path.to_string_lossy().as_ref(), "-quiet"])
        .status();
}
