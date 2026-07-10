use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use reqwest::blocking::Client;
use tauri::{AppHandle, Manager};

use crate::storage::{ensure_storage, resolve_storage_layout, StorageLayout};

const DEV_PORT: u16 = 3100;
const PROD_PORT: u16 = 6100;

fn client_port(is_dev: bool) -> u16 {
    if is_dev {
        DEV_PORT
    } else {
        PROD_PORT
    }
}

pub struct SidecarState {
    child: Mutex<Option<Child>>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

pub fn stop_sidecar(state: &SidecarState) {
    if let Ok(mut guard) = state.child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".."))
}

fn resource_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {e}"))
}

fn bundled_app_root(app: &AppHandle, is_dev: bool) -> Result<PathBuf, String> {
    if is_dev {
        return Ok(repo_root());
    }
    Ok(resource_root(app)?.join("resources").join("app"))
}

fn resolve_dev_node() -> PathBuf {
    if let Ok(from_env) = std::env::var("BUNDLED_NODE") {
        let path = PathBuf::from(from_env.trim());
        if path.exists() {
            return path;
        }
    }

    #[cfg(unix)]
    {
        if let Ok(output) = Command::new("which").arg("node").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    let candidate = PathBuf::from(&path);
                    if candidate.exists() {
                        return candidate;
                    }
                }
            }
        }
    }

    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("where").arg("node").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    let candidate = PathBuf::from(&path);
                    if candidate.exists() {
                        return candidate;
                    }
                }
            }
        }
    }

    PathBuf::from("node")
}

fn node_binary(app: &AppHandle, is_dev: bool) -> Result<PathBuf, String> {
    if is_dev {
        return Ok(resolve_dev_node());
    }

    let resources = resource_root(app)?;
    let key = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => "darwin-arm64",
        ("macos", "x86_64") => "darwin-x64",
        ("windows", "x86_64") => "win32-x64",
        (os, arch) => return Err(format!("Unsupported platform: {os}/{arch}")),
    };

    let platform_dir = resources.join("resources").join("node").join(key);
    let bin = if cfg!(windows) {
        platform_dir.join("node.exe")
    } else {
        platform_dir.join("bin").join("node")
    };

    if !bin.exists() {
        return Err(format!(
            "Bundled Node not found at {}. Run: npm run download:node",
            bin.display()
        ));
    }
    Ok(bin)
}

fn server_entry(app_root: &Path, is_dev: bool) -> PathBuf {
    if is_dev {
        let dist = app_root.join("workspace/server/dist/index.js");
        if dist.exists() {
            return dist;
        }
        return app_root.join("workspace/server/src/index.ts");
    }
    app_root.join("workspace/server/dist/index.js")
}

fn wait_for_health(port: u16, timeout: Duration) -> Result<(), String> {
    let url = format!("http://127.0.0.1:{port}/api/health");
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;
    let started = Instant::now();

    while started.elapsed() < timeout {
        if let Ok(resp) = client.get(&url).send() {
            if resp.status().is_success() {
                return Ok(());
            }
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    Err(format!("Server did not become ready at {url}"))
}

pub fn start_sidecar(
    app: &AppHandle,
    state: &SidecarState,
    is_dev: bool,
) -> Result<(StorageLayout, String), String> {
    let app_root = bundled_app_root(app, is_dev)?;
    let node = node_binary(app, is_dev)?;
    let entry = server_entry(&app_root, is_dev);

    if !entry.exists() {
        return Err(format!(
            "Server entry missing: {}. Run: npm run build:server",
            entry.display()
        ));
    }

    let port = client_port(is_dev);
    let layout = resolve_storage_layout(app, is_dev)?;
    ensure_storage(&layout, &app_root)?;

    let mut cmd = Command::new(&node);
    cmd.current_dir(&app_root);
    cmd.env("E2E_ROOT", &app_root);
    cmd.env("PROJECTS_DIR", &layout.projects_dir);
    cmd.env("CONFIG_DIR", &layout.config_dir);
    cmd.env("WORKSPACE_PORT", port.to_string());
    cmd.env("WORKSPACE_HOST", "127.0.0.1");
    cmd.env("E2E_RUNTIME", "client");
    cmd.env("BUNDLED_NODE", node.to_string_lossy().to_string());
    cmd.env("CLIENT_MODE", if is_dev { "0" } else { "1" });

    if is_dev {
        cmd.env("SERVE_WEB", "0");
    } else {
        cmd.env("SERVE_WEB", "1");
    }

    if is_dev && entry.extension().is_some_and(|ext| ext == "ts") {
        cmd.arg("--import");
        cmd.arg("tsx");
        cmd.arg(&entry);
    } else {
        cmd.arg(&entry);
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let child = cmd.spawn().map_err(|e| {
        format!(
            "Failed to spawn sidecar (node={}, entry={}): {e}",
            node.display(),
            entry.display()
        )
    })?;

    {
        let mut guard = state.child.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    wait_for_health(port, Duration::from_secs(60))?;

    let base_url = format!("http://127.0.0.1:{port}");
    Ok((layout, base_url))
}
