# 自动化教程（超简版）

## 一条命令发布

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1
```

它会自动完成：
1. 预检查
2. 自动升版本
3. 更新 CHANGELOG
4. 打包到 `dist/`

## 发布完成自动打开 dist

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -OpenDist
```

## 第一次建议先预演

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 -DryRun
```

## 双击模式

直接双击 `scripts/release.bat`（已默认带 `-OpenDist`）。
