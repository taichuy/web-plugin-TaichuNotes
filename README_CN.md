# 太初笔记 (Taichu Notes)

**中文** | [English](./README.md)

一个强大的浏览器扩展，用于剪切网页内容并推送到你的后端服务。

## 我们的故事

太初笔记，是我人生第一个创业项目，不出意料失败了，我将当初太初笔记一些功能继承到了太初y中，我原本我以为太初笔记会永远留在我记忆中，但是在想这个插件应该叫什么名字时候，我又再次从抽屉深处拿了出来。

现在请让我再次为你介绍，太初笔记。

太初笔记，是一个浏览器插件，是一个支持web上剪切快速提取网页内容，编辑，并且端对端传输到你配置好推送服务中，哪怕直接推送到本地部署服务。

希望本插件可以帮助你记下那一闪而过灵感。

## 功能特性

- **内容提取**:
  - **智能提取**: 自动检测并提取主要文章内容 (使用 Readability)。
  - **全文提取**: 提取经过清理的完整页面 HTML。
  - **选中文本**: 提取当前选中的文本。
  - **选取元素**: 允许你点击页面上的任何元素进行提取。
- **Markdown 编辑器**: 使用 Vditor 预览和编辑提取的内容。
- **后端工作流**: 配置自定义 JSON 工作流以将数据发送到你的 API。
  - 支持变量替换: `$main_text`, `$source_url`, `$web_title`, `$author`。
  - 支持按顺序执行请求。
- **主题**: 支持深色/浅色模式。

## 开发命令

### 下载依赖
```bash
yarn install
```

### 运行开发环境
```bash
yarn dev
```
这将启动 Plasmo 开发服务器并监听文件更改。
请在 Chrome 浏览器的 `chrome://extensions` 页面加载 `build/chrome-mv3-dev` 目录。

### 打包成为浏览器插件

#### Chrome / Edge / 360 / QQ 浏览器 (Chromium 内核)
```bash
yarn build
```
这将在 `build/chrome-mv3-prod` 目录中生成优化后的生产构建版本。
由于 360、QQ 等国产浏览器均基于 Chromium 内核，它们可以直接加载 Chrome 版本的插件。

#### Firefox 火狐浏览器
```bash
yarn build:firefox
```
这将在 `build/firefox-mv2-prod` 目录中生成适配 Firefox 的构建版本。

#### 扩展打包 (生成 .zip)
```bash
yarn package          # Chrome/Edge/通用
yarn package:firefox  # Firefox
yarn package:edge     # Edge 专用
```
生成的 `.zip` 文件位于 `build` 目录下，可直接提交到应用商店。

## 浏览器兼容性说明

本插件基于 Plasmo 框架开发，能够自动适配主流浏览器：

| 浏览器 | 内核 | 兼容性 | 备注 |
| :--- | :--- | :--- | :--- |
| **Google Chrome** | Chromium | ✅ 完美支持 | 使用 `yarn build` |
| **Microsoft Edge** | Chromium | ✅ 完美支持 | 可用 `yarn build` 或 `yarn build:edge` |
| **Firefox** | Gecko | ✅ 支持 | 需使用 `yarn build:firefox` (Manifest V2) |
| **360 安全/极速** | Chromium | ✅ 支持 | 使用 `yarn build`，手动加载扩展 |
| **QQ 浏览器** | Chromium | ✅ 支持 | 使用 `yarn build`，手动加载扩展 |
| **Brave / Vivaldi** | Chromium | ✅ 支持 | 使用 `yarn build` |

## 支持我们

本插件为开源免费项目，永久提供核心功能免费使用。
若你觉得插件对你有帮助，可进行小额捐赠，助力插件持续迭代维护。

### 捐赠渠道

<div style="display: flex; gap: 20px;">
  <div style="text-align: center;">
    <h4>微信支付</h4>
    <img src="src/assets/author/weichat.jpg" alt="微信支付" width="200" />
  </div>
  <div style="text-align: center;">
    <h4>支付宝</h4>
    <img src="src/assets/author/zhifubao.jpg" alt="支付宝" width="200" />
  </div>
</div>
