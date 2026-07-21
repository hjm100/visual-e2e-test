# 工具箱（tools）

与 `workspace/` 平级的独立工具生态。每个工具是 mini-app（自有 Fastify API + Vite Web），主项目只负责注册、iframe 嵌入与 Electron 桥接。

## 结构

```text
tools/
├── registry.json              # 主项目发现清单（唯一依赖入口）
├── README.md
└── {tool-id}/
    ├── tool.json              # 工具自描述
    ├── package.json
    ├── server/                # Fastify，监听 127.0.0.1
    ├── web/                   # Vite + React
    └── scripts/dev.mjs        # 并行启动 server + web
```

主项目集成层（薄）：

```text
workspace/web/src/features/tools/     # ToolsHubPage、ToolHostPage
workspace/server/src/routes/tools-registry.ts
electron/tools/tool-manager.ts
electron/preload.ts                   # pickFolder 等系统能力
```

## 架构

```text
主工作台 (workspace/web)
  ├─ /tools              → 工具列表
  └─ /tools/:toolId      → iframe 嵌入工具 Web
        ↕ postMessage（选目录、清缓存）
工具 mini-app
  ├─ web (:webDevPort dev / :prodPort prod)
  └─ server (:devPort dev / :prodPort prod)
Electron（可选）
  └─ tool-manager 生产环境 spawn 工具 server
```

## 端口约定

在 `registry.json` 为每个工具分配三组端口，`scripts/tools/discover.mjs` 启动前校验不重复。

| 字段 | 用途 |
|------|------|
| `devPort` | 工具 API（开发） |
| `webDevPort` | 工具 Web Vite（开发；iframe 加载此端口） |
| `prodPort` | 生产：API + 静态托管 `web/dist`（`SERVE_WEB=1`） |

## 命令

```bash
npm run tools:list       # 列出已注册工具与端口
npm run tools:install    # 各工具目录 npm install
npm run tools:dev        # 启动 registry 中全部工具
npm run tools:dev -- image-rename   # 仅启动指定工具
npm run tools:build      # 构建全部工具（client 打包前执行）
```

`npm run electron:dev` 会同步拉起 `tools:dev`。

`npm run workspace` 不会自动启动工具；Web 开发时需另开终端执行 `npm run tools:dev`。

## registry.json

```json
{
  "version": 1,
  "tools": [
    {
      "id": "image-rename",
      "name": "图片批量重命名",
      "description": "按规则批量重命名文件夹中的图片",
      "entry": "image-rename",
      "icon": "picture",
      "category": "file",
      "devPort": 3201,
      "prodPort": 7201,
      "webDevPort": 5201
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `id` | 路由 `/tools/:id`、环境变量 `TOOL_ID` |
| `entry` | `tools/{entry}/` 目录名 |
| `devPort` / `prodPort` / `webDevPort` | 见上表 |

## 主项目 API

```http
GET /api/tools/registry
```

返回 `registry.json` 内容，无工具业务逻辑。

## iframe 嵌入

- 开发：iframe `src` = `http://127.0.0.1:{webDevPort}/`
- 生产：iframe `src` = `http://127.0.0.1:{prodPort}/`（工具 server 托管静态资源）
- `sandbox` 需包含 `allow-same-origin`（Vite 开发模式加载模块依赖同源）
- 进入页面前轮询 `GET http://127.0.0.1:{devPort}/api/health`

## postMessage 协议

定义于 `workspace/web/src/features/tools/types.ts`（`TOOL_MSG`）。

| 消息 | 方向 | 载荷 |
|------|------|------|
| `vet-tool:bridge:pick-folder` | 工具 → 宿主 | — |
| `vet-tool:bridge:pick-folder-result` | 宿主 → 工具 | `{ path: string \| null }` |
| `vet-tool:cache:clear` | 宿主 → 工具 | — |
| `vet-tool:cache:cleared` | 工具 → 宿主 | `{ toolId: string }` |

宿主校验 `event.origin` 与工具 Web origin 一致后再处理。

## 状态持久化

- 工具 UI 偏好存 **localStorage**，key 前缀 `vet-tool:{toolId}:`
- 无 server 端 state 文件
- 「清除缓存」只删除 localStorage，不修改磁盘文件（在内置工具内部操作）

## 自定义工具

使用者可在工具箱「自定义」分区添加外链工具，保存在 `vet-tool:hub:custom-tools:v1`（localStorage）。

| 字段 | 说明 |
|------|------|
| 名称 | 卡片标题 |
| 地址 | `http` / `https` URL，iframe 嵌入打开 |
| 图标地址 | 可选，公网图片 URL |
| 描述 | 可选 |

实现：`workspace/web/src/features/tools/custom-tools-store.ts`。部分网站禁止 iframe 嵌入，宿主页提供「在浏览器中打开」。

## 新增工具

1. 复制 `tools/image-rename/` 为模板，改 `tool.json`、`package.json`
2. 在 `registry.json` 注册，分配未占用端口
3. `npm run tools:install`
4. 独立调试：`cd tools/{id} && npm run dev`
5. 集成验证：主项目打开 `/tools/{id}`
6. `npm run tools:build`，确认 `npm run stage:sidecar` 可 staged

新增工具**不需要**修改根 `package.json` 的 scripts。

## Electron 打包

- `build:client` 包含 `tools:build`
- `scripts/pack/stage-app.mjs` 复制各工具的 `server/dist`、`web/dist`、`node_modules`、`tool.json`
- `electron/tools/tool-manager.ts` 从 `Resources/app/tools/{entry}/` 启动 server（`SERVE_WEB=1`，端口 `prodPort`）

## preload

Electron preload 须编译为 CommonJS（`electron/tsconfig.preload.json`），与 main 进程 ESM 分开构建。`npm run build:electron` 依次执行两份 tsconfig。

## 故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| iframe 空白，CORS `origin 'null'` | sandbox 缺 `allow-same-origin` | 检查 `ToolHostPage` sandbox 属性 |
| 「工具未启动」 | API health 不通 | `npm run tools:dev` |
| `electronAPI` 未定义 | preload 加载失败 | `npm run build:electron`，确认 `dist/preload.js` 为 CommonJS |
| dev / prod localStorage 不共享 | 不同 origin（5201 vs 7201） | 以实际嵌入端口为准验收 |

## 已注册工具

| id | 文档 |
|----|------|
| `image-rename` | [image-rename/README.md](./image-rename/README.md) |
