# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0](https://github.com/visual-e2e/visual-e2e-test/compare/v1.0.0...v1.1.0) (2026-07-14)

### Fixes

- fix(web): 优化运行中心报告查看与日志编码
  - 非 running 且存在 reportFile 时允许查看报告
  - Web/Electron 复用同一报告窗口，报告内日志链接同窗打开
  - 运行产物接口为文本类型补充 charset=utf-8，修复日志中文乱码
