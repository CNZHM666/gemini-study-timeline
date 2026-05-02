# vendor 依赖说明（MV3 本地脚本）

Manifest V3 的默认 CSP 为 `script-src 'self'`，因此不能在 `sidepanel.html` 直接引用 CDN 脚本。
请在本目录放入以下文件：

1. `marked.min.js`
2. `highlight.min.js`（可选）

## 一键下载示例（PowerShell）

```powershell
curl.exe -L https://cdn.jsdelivr.net/npm/marked/marked.min.js -o .\vendor\marked.min.js
curl.exe -L https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js -o .\vendor\highlight.min.js
```

如果你暂时不放 `highlight.min.js`，扩展仍可运行，只是代码块不做语法高亮。
