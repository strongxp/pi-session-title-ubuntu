# Ubuntu 会话标题 / Ubuntu Session Titles

面向 Ubuntu 上的 PI-Desktop，首轮有效对话完成后，把默认截取的会话标题改为简洁、便于检索的简体中文标题。支持自定义提示词、模型及思考级别。

这是 StrongHE 维护的独立分支，基于 Lan 的 [PI-Desktop Session Titles](https://github.com/vastsa/pi-session-title-plugin)，上游提交为 `b4275d4a00e304cb6bc5a8bb1596549fa9546062`（`v0.1.0`）。原插件 ID 为 `net.aiuo.session-title`；本分支 ID 为 `net.stronghe.session-title-ubuntu`。

## 本分支的变化

- 默认使用简体中文标题提示词，优先表达“具体对象＋核心动作或目标”，建议 12～24 个汉字，保留必要的英文技术名。
- 使用独立插件 ID、配置命令和界面名称，明确区分上游与本分支。
- 提供面向 Ubuntu 的安装、配置和验收说明，保留上游作者及 LGPL 许可证。

标题由所选模型生成，语言、长度及质量受模型输出影响；12～24 个汉字是提示词要求，不是截断规则。

## 适用范围

- 要求 PI-Desktop **0.18.0 或更新版本**，并支持 `session.autoTitle` API。
- 作用于普通本地 Desktop 会话。已手动改名或已生成标题的会话由宿主保护；远程会话与原生 Pi 会话不在本插件承诺的范围内。
- 本分支面向 Ubuntu 使用。它使用宿主提供的 API，不包含 Ubuntu 专有二进制或强制操作系统拦截；本次发布工作不包括 macOS 安装与适配验收。
- 本分支已通过 Node 自动化测试和 PI 官方打包校验；当前构建主机为 macOS，尚未在 Ubuntu 上对本分支执行新的真实模型端到端复测。上游教程的历史验证不能代替本分支的运行验证。

## 在 Ubuntu 安装

1. 在 PI 的「设置 → 插件 → 插件市场」搜索 **Ubuntu 会话标题**或 `net.stronghe.session-title-ubuntu`。市场可用性以本分支完成上架审核为准。
2. 如果已启用原版「会话标题」（`net.aiuo.session-title`），先停用原版，再启用本分支，避免两个插件对同一会话发起重复模型请求。独立配置不会自动继承原版设置。
3. 安装并授予 `ui.panel`、`models.list`、`agent.complete`、`session.autoTitle` 权限。
4. 打开命令面板，运行 **Ubuntu 会话标题：配置** / **Ubuntu Session Titles: Configure**。
5. 模型留空时优先跟随会话模型，再回退到默认可用模型；默认思考级别为 `off`。可以直接使用内置中文提示词。

离线安装时，在「设置 → 插件 → 从文件安装插件」选择 `net.stronghe.session-title-ubuntu-0.1.0.piplug`。开发加载可以选择此源码目录。

## 验收方法

1. 新建普通本地会话，输入具体需求，例如“定位 Ubuntu 上 PI 启动后会话列表为空的原因”。
2. 等助手回合完整结束以及标题模型请求完成，观察标题是否变为简洁中文标题。
3. 手动重命名测试会话，再继续一轮，确认手动标题保留。
4. 如果标题没有变化，检查插件启用状态、权限、可用模型及会话是否仍满足宿主的自动标题条件。

这些步骤是用户可执行的验收流程，不表示本分支已在 Ubuntu 上完成上述测试。

## 数据与模型调用

插件仅通过宿主取得首条需求、首条回复的有限摘录，并通过 PI 的补全 API 发给所选模型。每次符合条件的生成会消耗一次模型补全，可能计入已有模型额度或费用。失败后可在后续符合条件的回合重试。插件不直接读取完整对话、服务商凭据、任意文件或外部网络。

自定义模板必须保留 `{{userPrompt}}`；可用 `{{assistantReply}}` 引入首条回复作为参考。会话文本在系统提示中被指定为不可信数据。

## 测试与打包

本仓库没有运行时依赖。

```bash
npm test
```

使用 PI 官方 `PluginCheck` 验证源码目录，再使用 `PluginPack` 生成可安装的 `.piplug`。不要用普通压缩工具替代官方打包器。

## 来源与许可证

- 上游作者：Lan；上游仓库：<https://github.com/vastsa/pi-session-title-plugin>。
- 本分支维护：StrongHE。
- 变更：中文默认提示词、独立身份与配置命令、Ubuntu 使用和发布说明；标题引擎与宿主 API 调用流程沿用上游。
- 许可证：**LGPL-3.0-or-later**，见 [LICENSE](LICENSE)。分发时保留许可证、作者及源码来源；本分支源码应与发布 tag 一并公开提供。
