# image-rename

按模板规则批量重命名目录中的图片文件。

## 开发

```bash
# 仓库根目录
npm run tools:dev -- image-rename

# 或工具目录
cd tools/image-rename && npm run dev
```

| 服务 | 地址 |
|------|------|
| Web（iframe / 浏览器） | http://127.0.0.1:5201 |
| API | http://127.0.0.1:3201 |

环境变量（由 `scripts/dev/tools.mjs` 注入）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `TOOL_ID` | `image-rename` | 工具标识 |
| `TOOL_PORT` | `3201` | API 端口 |
| `TOOL_WEB_PORT` | `5201` | Web dev 端口 |
| `SERVE_WEB` | — | 设为 `1` 时 server 托管 `web/dist`（生产） |

## 目录

```text
server/src/
  index.ts              # Fastify 入口
  services/fs.ts        # 列目录、执行重命名
  services/rename.ts    # 排序、模板、预览
  utils/safe-path.ts    # 路径校验
web/src/
  App.tsx               # 主界面
  cache/store.ts        # localStorage
  api/client.ts         # API 客户端
  utils/template.ts     # 模板函数（示例展示，与 server 逻辑一致）
```

## API

### `GET /api/health`

```json
{ "ok": true, "toolId": "image-rename", "port": 3201 }
```

### `GET /api/fs/list`

查询参数：

| 参数 | 必填 | 说明 |
|------|------|------|
| `dir` | 是 | 目录绝对路径 |
| `imagesOnly` | 否 | 默认 `true`；传 `false` 列出全部文件 |

响应：`FileEntry[]`

```ts
interface FileEntry {
  name: string;
  ext: string;       // 含 "."
  typeLabel: string; // 如 "PNG"
  size: number;
  mtime: number;
}
```

### `POST /api/rename/preview`

请求体：

```json
{
  "dir": "/abs/path",
  "files": ["a.png", "b.jpg"],
  "sort": "name-asc",
  "rule": {
    "template": "{prefix}_{index:3}{ext}",
    "prefix": "step",
    "startIndex": 1
  },
  "allFiles": []
}
```

- `sort`：`name-asc` | `name-desc` | `mtime-asc` | `mtime-desc`
- `allFiles` 可选；省略时由 server 读取目录

响应：

```json
[
  { "from": "a.png", "to": "step_001.png" },
  { "from": "b.jpg", "to": "step_002.jpg", "conflict": "新文件名重复" }
]
```

### `POST /api/rename/apply`

请求体：

```json
{
  "dir": "/abs/path",
  "items": [
    { "from": "a.png", "to": "step_001.png" }
  ]
}
```

响应：

```json
{
  "succeeded": ["step_001.png"],
  "failed": [{ "from": "x.png", "reason": "..." }]
}
```

执行采用两阶段 `rename`（先写临时名再落最终名），降低覆盖风险。

## 命名模板

| 占位符 | 说明 |
|--------|------|
| `{prefix}` | 用户输入前缀 |
| `{index}` | 序号（不补零） |
| `{index:3}` | 序号，宽度 3、左侧补零 |
| `{name}` | 原文件名（不含扩展名） |
| `{ext}` | 扩展名（含 `.`） |

`{index}` 按当前排序对**已勾选**文件从 `startIndex` 递增编号。

默认模板：`{prefix}_{index:3}{ext}`，前缀 `step`，起始序号 `1`。

## localStorage

- Key：`vet-tool:image-rename:v1`
- 实现：`web/src/cache/store.ts`

| 字段 | 说明 |
|------|------|
| `lastDir` | 上次目录 |
| `recentDirs` | 最近路径，最多 10 条 |
| `naming.template` / `prefix` / `startIndex` | 命名规则 |
| `sort` | 排序方式 |
| `imagesOnly` | 是否仅列图片 |

清除缓存：删除 `vet-tool:image-rename:*`，不影响磁盘。

## 与宿主协作

1. 用户点「浏览」→ iframe `postMessage` `vet-tool:bridge:pick-folder`
2. 宿主调 `window.electronAPI.pickFolder()`，回传 `vet-tool:bridge:pick-folder-result`
3. 工具收到路径后自动 `loadDir`，无需再点「刷新」

独立打开 `http://127.0.0.1:5201`（非 iframe）时无选目录能力，需手动输入绝对路径。

## 图片过滤

默认扩展名：`png|jpe?g|gif|webp|bmp|svg|ico|tiff?`（`server/src/services/rename.ts`）。

## 安全

- API 仅监听 `127.0.0.1`
- `resolveDir` 校验路径存在且为目录
- 预览阶段检测：新名重复、与未选文件重名、非法字符

## 构建

```bash
npm run build          # server/dist + web/dist
npm run typecheck
```

生产由工具 server 在 `SERVE_WEB=1` 时托管 `web/dist`。
