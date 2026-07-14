# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0](https://github.com/visual-e2e/visual-e2e-test/compare/v1.0.0...v1.1.0) (2026-07-14)

### Features

- 场景管理内可直接查看运行进度
  - 在场景编辑页点击运行后，不再跳转到运行中心
  - 右侧弹出运行详情，日志随测试进行实时更新

### Fixes

- 运行中心报告与日志查看体验优化
  - 失败、取消等已结束的任务，只要生成了报告即可查看
  - 多次打开报告，或在报告内查看日志、录屏，均复用同一窗口
  - 修复日志中文显示乱码的问题
