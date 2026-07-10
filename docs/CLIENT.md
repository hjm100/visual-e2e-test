# Visual E2E Test — 桌面客户端（Tauri + Node Sidecar）

Tauri WebView + Node sidecar（Fastify `127.0.0.1`）。

## 架构

```
Tauri (Rust WebView)
  └─ spawn Node sidecar → workspace/server
        ├─ tauri:dev  → 127.0.0.1:3100
        └─ .app       → 127.0.0.1:6100
        ├─ Fastify API + 文件读写
        ├─ Playwright 测试（channel: chrome，使用本机 Chrome）
        └─ 生产模式托管 workspace/web/dist

用户数据（持久化）:
  tauri:dev   macOS: ~/Library/Application Support/visual-e2e-test/Storage/
  .app        macOS: ~/Library/Application Support/com.visual-e2e-test.app/Storage/
  Windows 对应: %APPDATA%/visual-e2e-test/ 与 %APPDATA%/com.visual-e2e-test.app/
    ├── projects/
    └── config/settings.json
```

## 前置条件

| 工具 | 用途 |
|------|------|
| Node.js 20+ | 开发与构建 |
| Rust + Cargo | Tauri 编译（[rustup.rs](https://rustup.rs)） |
| macOS: Xcode CLT | WebView / 打包 |
| Windows: WebView2 | 运行时（Win10+ 通常已带） |
| Google Chrome | 运行 E2E 测试（客户端默认 `channel: chrome`） |

## Web 开发

```bash
npm install
npm run workspace          # Web :5173，API :3101
```

`E2E_RUNTIME=workspace`：`projects/`、`config/` 在仓库目录；API 端口 **3101**。

`/api/health` 应返回 `"runtime":"workspace"`、`"port":3101`。

## Tauri 开发

### 首次环境

```bash
npm install
npm run setup:rust         # 安装 Rust toolchain（仅需一次）
source ~/.cargo/env        # 或重启终端
npm run build:engine       # 生成 dist/cli.js
```

### 日常启动

```bash
npm run tauri:dev
```

`tauri dev` 会执行 `build:server`，并启动 Vite（`:5173`）。Sidecar 在 `127.0.0.1:3100` 起 API；WebView 加载 Vite，Vite 将 `/api` 代理到 `:3100`。

**可与已安装的 `.app` 同时运行**（`.app` 使用 `:6100` 与独立 Storage）。

### 运行模式（脚本契约）

| 命令 | `E2E_RUNTIME` | API 端口 | 数据目录 |
|------|---------------|----------|----------|
| `npm run workspace` | `workspace` | `3101` | 仓库 `projects/`、`config/` |
| `npm run tauri:dev` | `client` | `3100` | `visual-e2e-test/Storage/` |
| 安装的 `.app` | `client` | `6100` | `com.visual-e2e-test.app/Storage/` |

### dev 与 build 的差异

| 项 | `tauri:dev` | `tauri:build`（`.app`） |
|----|-------------|-------------------------|
| 代码根 `E2E_ROOT` | 仓库根目录 | `Contents/Resources/app` |
| 用户数据 | `visual-e2e-test/Storage/` | `com.visual-e2e-test.app/Storage/` |
| API 端口 | `3100` | `6100` |
| 前端 | Vite `:5173` | server 静态托管 `web/dist` |
| Node | 系统 PATH 中的 `node` | 包内 `resources/node/{platform}/bin/node` |
| `CLIENT_MODE` | `0` | `1` |

仓库内 `projects/` 仅 `npm run workspace` 使用；客户端 dev 与 prod **数据隔离**。

### 确认当前连的是哪个 server

DevTools → Network → `/api/health`：

- `"runtime":"workspace"`、`"port":3101` → 网页开发 server
- `"runtime":"client"`、`"port":3100`、仓库 `e2eRoot` → `tauri:dev` sidecar
- `"runtime":"client"`、`"port":6100`、`e2eRoot` 含 `.app` → 已安装 `.app`

### 用户数据目录（Storage）

**开发（tauri:dev）** — macOS：

```
~/Library/Application Support/visual-e2e-test/Storage/
  ├── projects/
  └── config/settings.json
```

**生产（.app）** — macOS：

```
~/Library/Application Support/com.visual-e2e-test.app/Storage/
  ├── projects/
  └── config/settings.json
```

打开目录：

```bash
# dev
open ~/Library/Application\ Support/visual-e2e-test/Storage
# .app
open ~/Library/Application\ Support/com.visual-e2e-test.app/Storage
```

App 菜单 **Visual E2E Test → 打开数据目录** 打开当前模式对应路径。

首次启动时 sidecar 创建 `Storage/projects`、`Storage/config`；若 `config/settings.json` 不存在，从 `E2E_ROOT/config/settings.json` 复制默认配置。

### 清理旧 Launcher 遗留

若存在 `~/Library/Application Support/visual-e2e-test/launcher.lock.json`（旧 Launcher 单实例锁），可安全删除；Tauri 不再使用该文件。

## 打包

```bash
npm run tauri:build:mac    # 仅 macOS → build/macos/
npm run tauri:build:win    # 仅 Windows → build/windows/
npm run tauri:build:all    # mac + win（macOS 上 win 为交叉编译）
npm run tauri:build        # 同 tauri:build:mac
```

一条命令完成：同步 `package.json` 版本 → 清空对应 `build/` 子目录 → 下载 Node sidecar → 构建 client → 打包。

| 命令 | 产物 |
|------|------|
| `tauri:build:mac` | `build/macos/`（`.app` + `.dmg`） |
| `tauri:build:win` | `build/windows/`（`.exe` / `.msi`） |
| `tauri:build:all` | 以上两者（macOS 上 win 为交叉编译 `.exe`） |

**Windows 完整 `.msi`** 需在 Windows 上运行 `tauri:build:win`。

首次在 macOS 交叉编译 Windows 需安装：

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin
```

Rust 中间产物在 `src-tauri/target/`。

安装或替换 `/Applications/Visual E2E Test.app` 后启动；数据在 `com.visual-e2e-test.app/Storage/`，与 `tauri:dev` 分开。

### 包内容

- Tauri WebView
- Node sidecar 二进制
- engine、server、web、scripts、template、node_modules
- 不含 Playwright Chromium（`channel: chrome`）

### 首次启动

Sidecar 初始化 Storage（见「用户数据目录」）。

## 环境变量（Sidecar / 启动脚本）

| 变量 | `workspace` | `tauri:dev` | `.app` |
|------|-------------|-------------|--------|
| `E2E_RUNTIME` | `workspace` | `client` | `client` |
| `WORKSPACE_PORT` | `3101` | `3100` | `6100` |
| `E2E_ROOT` | 仓库根 | 仓库根 | `Resources/app` |
| `PROJECTS_DIR` | `{repo}/projects` | `visual-e2e-test/Storage/projects` | `com.visual-e2e-test.app/Storage/projects` |
| `CONFIG_DIR` | `{repo}/config` | `visual-e2e-test/Storage/config` | `com.visual-e2e-test.app/Storage/config` |
| `SERVE_WEB` | 未设置 | `0` | `1` |
| `CLIENT_MODE` | 未设置 | `0` | `1` |
| `BUNDLED_NODE` | 清除 | 系统 Node | 包内 Node |

## 常见问题

### 运行中心 spawn node ENOENT

- `workspace`：确认 `curl :3101/api/health` 为 `"runtime":"workspace"`；勿手动设置 `BUNDLED_NODE`。
- `tauri:dev` / `.app`：Node 路径见上表；`.app` 在 `Resources/resources/node/darwin-arm64/bin/node`。

### Rust / rustup

```bash
npm run setup:rust
```

手动：

```bash
rm -rf ~/.rustup/toolchains/stable-aarch64-apple-darwin
rustup toolchain install stable --profile minimal
rustup default stable
```

`connection reset` 时：

```bash
export RUSTUP_DIST_SERVER=https://rsproxy.cn
export RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup
rm -rf ~/.rustup/toolchains/stable-aarch64-apple-darwin
rustup toolchain install stable --profile minimal
rustup default stable
```

`~/.cargo/config.toml`：

```toml
[source.crates-io]
replace-with = "rsproxy"

[source.rsproxy]
registry = "sparse+https://rsproxy.cn/index/"
```

### Rust 未安装

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 浏览器启动失败

客户端模式：`channel: chrome`，不回退 Playwright Chromium。

### 打包缺少产物

```bash
npm run build:client
```

### Windows 安装包

`.msi` 在 Windows 上构建；macOS 产出 `.dmg` / zip。
