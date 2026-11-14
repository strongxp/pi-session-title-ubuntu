# Changelog

## 0.1.0 — StrongHE Ubuntu fork

- 首次发布 StrongHE 维护的 Ubuntu 会话标题分支，插件 ID 为 `net.stronghe.session-title-ubuntu`。
- 默认使用简体中文提示词，优先表达具体对象与核心目标，建议 12～24 个汉字。
- 使用独立命令 `ubuntu-session-title.configure` 和中英文界面名称。
- 保留模型、提示词、思考级别配置及手动改名保护；不增加权限。
- 新增 Ubuntu 安装及验收说明，明确当前分支尚未完成新的 Ubuntu 真实模型端到端复测。
- 基于 Lan 的 `vastsa/pi-session-title-plugin`，提交 `b4275d4a00e304cb6bc5a8bb1596549fa9546062`（上游 v0.1.0）；保留 LGPL-3.0-or-later 许可证。

## Upstream 0.1.0 — Lan

- Initial release of the configurable Session Titles plugin.
- Generate a title after the first completed turn using the configured prompt,
  model, and thinking level.
- Preserve manually renamed session titles.
