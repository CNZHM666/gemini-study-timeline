# Hajimi Timeline

[English](README.md) | [简体中文](README.zh-CN.md)

![版本](https://img.shields.io/badge/version-1.1.236-4c6ef5?style=for-the-badge)
![Manifest V3](https://img.shields.io/badge/manifest-v3-0f766e?style=for-the-badge)
![本地优先](https://img.shields.io/badge/storage-local--first-7c3aed?style=for-the-badge)
![MIT 协议](https://img.shields.io/badge/license-MIT-16a34a?style=for-the-badge)

> 一个本地优先的 Gemini Study Timeline，帮助你更专注地学习、记笔记和回看复习。

Hajimi Timeline 是一个面向 Gemini 深度使用者的浏览器扩展。你也可以把它理解成一个本地优先的 Gemini Study Timeline: 它不是把 Gemini 当成一次性问答工具，而是把长对话拆成可以持续学习的问题队列，让你可以一次只专注一道题、保留本地笔记，并在之后继续回到原来的学习上下文。

**快速导航：** [项目概览](#项目概览) · [亮点功能](#亮点功能) · [素材规划](#readme-素材规划) · [使用流程](#典型使用流程) · [开发安装](#开发环境安装) · [开发命令](#开发命令) · [项目结构](#项目结构)

## 项目概览

| 项目 | 说明 |
| --- | --- |
| 产品类型 | 面向 Gemini 的浏览器侧边栏扩展 |
| 核心价值 | 把长对话整理成结构化学习流程 |
| 存储方式 | 基于 `chrome.storage.local` 的本地优先 |
| 适合人群 | 学生、备考用户、长时间使用 Gemini 的学习者 |
| 当前重点 | 流程清晰度、笔记体验、复习流程、长对话性能 |

## 亮点功能

- 从 Gemini 对话中整理出学习队列
- 提供专注的分问题学习工作台
- 支持本地笔记、图片笔记、分类与完成状态
- 提供学习地图，用于查看分类与整体进度
- 保存笔记后可直接衔接复习与完成流程
- 对超长 Gemini 对话做了渲染性能优化
- 支持本地 JSON 导出与导入备份

## 核心支柱

| 支柱 | 说明 |
| --- | --- |
| 专注 | 不再反复在超长对话里来回翻找，而是一次只处理一个问题 |
| 记录 | 在同一个工作台里保留本地笔记、图片笔记和学习进度 |
| 回看 | 通过分类、复习流程和保存的上下文，之后还能顺畅继续学习 |

## README 素材规划

如果你准备让仓库首页更直观，建议按下面顺序补素材：

1. `docs/images/hero-overview.png`
2. `docs/demo/demo-start-learning.gif`
3. `docs/images/study-workspace.png`
4. `docs/images/note-review-flow.png`

推荐首屏主图写法：

```md
![Hajimi Timeline overview](docs/images/hero-overview.png)
```

推荐后续演示 GIF 写法：

```md
![Start learning demo](docs/demo/demo-start-learning.gif)
```

## 为什么做这个项目

Gemini 的长对话很强，但也很容易变乱：

- 有价值的问题会被淹没在很长的滚动历史里
- 后续追问线程不容易回看
- 笔记和复习状态通常散落在别处
- 对话一长，阅读和整理成本都会明显上升

Hajimi Timeline 想把这个过程整理成更平稳的学习流：

- 先从对话里提取学习队列
- 每次只打开一个问题进入专注工作台
- 边追问边记录笔记和图片
- 按主题把问题分类
- 之后再回来看，仍然保留原本的学习状态

## 典型使用流程

1. 打开一个 Gemini 对话。
2. 从浏览器侧边栏打开 Hajimi Timeline。
3. 查看学习地图与待学习队列。
4. 在队列中选中一个问题。
5. 点击 **Start learning** 进入专注工作台。
6. 继续追问、记录笔记、整理分类，然后完成本题。

队列和分类点击只负责“选中问题”，真正进入工作台的动作只有 **Start learning**，这样整体导航会更稳定、更容易理解。

## 隐私说明

- 只在 `https://gemini.google.com/*` 下运行
- 笔记、分类、设置和学习状态都保存在 `chrome.storage.local`
- 不会把 Gemini 对话内容发送到第三方服务器
- 可在 **Workspace Settings > Data & Privacy** 中导出或导入本地备份
- 卸载扩展后，本地扩展存储是否保留取决于浏览器行为

## 开发环境安装

1. 先构建扩展，或直接使用 `dist/` 目录中的最新版本。
2. 打开 `edge://extensions/` 或 `chrome://extensions/`。
3. 开启 **Developer mode**。
4. 点击 **Load unpacked**。
5. 选择扩展目录，例如 `dist/gemini-study-timeline-v1.1.236`。
6. 打开 `https://gemini.google.com` 并开始使用侧边栏。

## 开发命令

仅构建：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

发布流程：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1
```

发布预演：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -DryRun
```

如果你使用 npm：

```bash
npm run build
npm run release
npm run release:dry
npm run check
```

## 性能调试

打开 Gemini 页面 DevTools 控制台：

```js
await window.__hajimiPerf.clear()
window.__hajimiPerf.table()
```

常用字段：

- `renderNativeChatTimeline`：Gemini 页面时间轴渲染耗时
- `scanConversation`：Gemini DOM 扫描耗时
- `syncInlineAnnotations`：页面级标注同步耗时
- `renderTimeline`：侧边栏时间轴渲染耗时

如果要提交性能问题，建议附上 `window.__hajimiPerf.table()` 的输出或截图。

## 常见问题

- 看不到总览：先打开一个真实的 Gemini 对话，再刷新侧边栏
- 队列加载慢：等 Gemini 页面水合完成后再点击刷新
- 拖动不顺滑：在设置中启用 **Low footprint mode**
- 重装后笔记丢失：导入之前导出的备份
- 数学公式复制不正常：请直接选中渲染后的公式本体再复制

## 项目结构

扩展运行入口文件仍保留在仓库根目录，因为浏览器 `manifest.json` 直接引用它们。其余配套文档、脚本和素材位已经整理到独立目录中，仓库看起来会更清爽。

```text
.
├─ .github/              GitHub issue 模板与工作流
├─ docs/                 指南、截图位、演示素材位
├─ scripts/              构建与发布脚本
├─ vendor/               打包进扩展的第三方前端库
├─ background.js         扩展 service worker
├─ content.js            Gemini 页面集成逻辑
├─ perf-bridge.js        页面性能桥接
├─ sidepanel.html        侧边栏入口
├─ sidepanel.js          侧边栏主逻辑
├─ style.css             侧边栏样式
├─ manifest.json         浏览器扩展清单
├─ package.json          开发命令
├─ CHANGELOG.md          发布记录
├─ CONTRIBUTING.md       贡献说明
├─ ROADMAP.md            项目路线图
├─ LICENSE               开源许可证
└─ README.md             英文首页
```

## 演示素材

仓库已经为公开展示预留了这些素材目录：

- `docs/images/`：静态截图
- `docs/demo/`：演示 GIF
- `docs/guides/`：贡献、发布、上线相关指南

建议优先准备：

- 学习地图与学习队列总览图
- 进入专注工作台的 GIF
- 笔记与复习流程图
- 长对话性能前后对比图

## 项目状态

项目仍处于持续迭代中，目前重点在于：

- 学习流程更清晰
- 本地持久化更可靠
- 侧边栏体验更简洁
- 长对话下性能更稳定

## 相关文档

- `ROADMAP.md`：查看当前方向与优先级
- `CONTRIBUTING.md`：查看贡献方式与本地检查要求
- `docs/guides/GITHUB_LAUNCH_CHECKLIST.md`：查看 GitHub 公布前检查清单
- `docs/guides/RELEASE_TEMPLATE.md`：查看 Release 文案模板

## License

MIT
