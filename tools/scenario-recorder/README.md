# 场景录制

在受控浏览器中录制用户操作，生成 visual-e2e-test 场景 JSON。

## 使用

```bash
cd tools/scenario-recorder
npm install
npm run dev
```

或通过主项目：

```bash
npm run tools:install
npm run tools:dev -- scenario-recorder
```

| 服务 | 地址 |
|------|------|
| Web | http://127.0.0.1:5202 |
| API | http://127.0.0.1:3202 |

## 流程

1. 填写场景 ID、名称、模块、起始 URL
2. 点击「启动浏览器」
3. 在浏览器中完成登录等准备（此阶段不录制）
4. 点击「开始录制」，执行目标操作
5. 点击「结束录制」或关闭浏览器，自动导出 JSON

## 浏览器环境

工具复用主项目 `browser-runtime.json` 与 `settings.json`，不维护独立 config。需先在主项目设置中安装或配置测试浏览器。

## 录制范围

- `click` / `input` / `keyboard` / `wait`
- 开始录制时自动写入一条入口 `link`（当前页 URL）与 `setup.entryRoute`；录制过程中的跳转不再额外生成 `link`
- 页面侧监听 `pointerdown`/`click` 等事件，经 `exposeBinding` 即时上报到服务端（非轮询）
- 密码字段脱敏为 `{password}`

断言、截图、就绪等待等步骤请在场景编辑器中补充。
