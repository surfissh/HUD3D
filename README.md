# HUD3D · IrisView 烤箱倒计时 HUD

可运行的 IrisView 应用 + [可行性调研](HUD3D-烤箱倒计时-可行性调研.md)。

应用在 640×480 单绿画布上显示一个厨房倒计时：大号剩余时间、进度条、完成态，
按秒增量更新，生命周期暂停/恢复。它验证的是“头戴固定 HUD”，不是空间锚定
（原因见调研报告）。

## 目录

```
src/                   应用源码（index.js / application-data.js / XRManifest.xml）
FusionUIApp.json       应用清单（id、版本、能力）
fusionui.config.json   Kit 构建配置（src → dist）
package.json           应用元数据 + 开发脚本
scripts/kit.sh         统一入口：Kit 路径、Vite+ Node、前置检查
scripts/irisview.py    开发用 Kit 包装器（非 Ubuntu 主机绕过 OS 白名单）
scripts/preflight.mjs  调用 Kit 前的快速检查
```

## 前置

- **Vite+**：仓库带 `.node-version`（24.13.0）。首次执行：
  ```bash
  vp env install
  ```
- **IrisView Developer Kit**：放在仓库根目录的 `IrisView-Developer-Kit-v1.0.0/`，
  或用 `IRISVIEW_KIT` 指向 Kit 根目录（该目录不入库）。
- 推荐 Ubuntu 22.04/26.04。非白名单主机（如 Fedora）会由 `scripts/irisview.py`
  在开发模式下跳过 Kit 的 OS 检查，并打印警告；`IRISVIEW_STRICT_HOST=1` 可关闭。

## 常用命令

推荐用 `vp run`（自动使用 `.node-version` 里的 Node）：

| 命令 | 作用 |
|---|---|
| `vp run verify` | 校验 JS 语法与依赖元数据（Kit `test`） |
| `vp run build` | 构建到 `dist/` |
| `vp run package` | 生成未签名调试包 `release/oven-hud.fuiapp` |
| `vp run start` | 启动模拟器（单目） |
| `vp run run:stereo` | 启动模拟器（双目并排） |
| `vp run dev` | build + package + start |
| `vp run dry-run` | 只打印启动计划 |
| `vp run doctor` | Kit 环境诊断 |
| `vp run clean` | 删除 `dist/` 与 `release/` |

`npm run <script>` 同样可用：`scripts/kit.sh` 发现当前 Node 不是 24.13.0 时，
会自动通过 Vite+ 解析 `.node-version` 并切换到 pin 的 Node。

> `vp run` 会提示“项目未迁移到 Vite+”，可以忽略；这里只用它做 Node 版本管理与任务运行。

## 环境变量

| 变量 | 作用 |
|---|---|
| `IRISVIEW_KIT` | Kit 根目录（默认 `./IrisView-Developer-Kit-v1.0.0`） |
| `IRISVIEW_NODE_BIN` | 显式指定 Node 24.13.0 的 `bin` 目录，跳过 Vite+ 切换 |
| `IRISVIEW_STATE_DIR` | Kit 的 state 目录（默认 `~/IrisView-Developer-Kit-Data`） |
| `IRISVIEW_STRICT_HOST=1` | 不绕过 Kit 的 Ubuntu 白名单（用于验证官方检查） |

## 包管理

应用保持零运行时依赖。`package.json` 的 `engines` 与 `.node-version` 都锁在
Node 24.13.0（Kit 会在 `build`/`test`/`package` 时精确校验）。
