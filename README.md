# HUD3D · IrisView 烤箱倒计时 HUD

可运行的 IrisView 应用 + [可行性调研](HUD3D-烤箱倒计时-可行性调研.md)。

应用在 640×480 单绿画布上显示一个厨房倒计时：大号剩余时间、进度条、完成态，
按秒增量更新，生命周期暂停/恢复。它验证的是“头戴固定 HUD”，不是空间锚定
（原因见调研报告）。

## 目录

```
src/index.ts           应用源码（TypeScript）
src/XRManifest.xml     Runtime 入口元数据
tsconfig.json          TS 配置（paths 指向 Kit 的 SDK 类型）
build/                 tsc 输出 + 复制后的 XRManifest.xml（git 忽略）
FusionUIApp.json       应用清单（id、版本、能力）
fusionui.config.json   Kit 构建配置（build → dist）
package.json           应用元数据 + 开发脚本（由 npm 维护）
scripts/compile.sh     清理并编译 TS，复制 XRManifest.xml
scripts/kit.sh         统一入口：Kit 路径、Vite+ Node、前置检查
scripts/irisview.py    开发用 Kit 包装器（非 Ubuntu 主机绕过 OS 白名单）
scripts/preflight.mjs  调用 Kit 前的快速检查
```

## 前置

- **Vite+ + 依赖**：仓库带 `.node-version`（24.13.0）。首次执行：
  ```bash
  vp env install
  npm install        # 安装 devDependency：TypeScript 7
  ```
- **IrisView Developer Kit**：放在仓库根目录的 `IrisView-Developer-Kit-v1.0.0/`，
  或用 `IRISVIEW_KIT` 指向 Kit 根目录（该目录不入库）。`tsconfig.json` 的 `paths`
  默认指向这个位置；移动 Kit 时需同步调整。
- 调研报告中的文档链接指向 `IrisView-Platform-Alpha-中英双语版-v3/`（同样不入库）；
  需要离线查阅时把该目录放回仓库根目录。
- 推荐 Ubuntu 22.04/26.04。非白名单主机（如 Fedora）会由 `scripts/irisview.py`
  在开发模式下跳过 Kit 的 OS 检查，并打印警告；`IRISVIEW_STRICT_HOST=1` 可关闭。

## 常用命令

推荐用 `vp run`（自动使用 `.node-version` 里的 Node）：

| 命令 | 作用 |
|---|---|
| `vp run typecheck` | 只做 TypeScript 类型检查 |
| `vp run compile` | `tsc` 编译到 `build/` 并复制 `XRManifest.xml` |
| `vp run verify` | 类型检查 + 编译 + Kit `test` |
| `vp run build` | 编译后构建到 `dist/` |
| `vp run package` | 生成未签名调试包 `release/oven-hud.fuiapp` |
| `vp run start` | 启动模拟器（单目） |
| `vp run run:stereo` | 启动模拟器（双目并排） |
| `vp run dev` | build + package + start |
| `vp run dry-run` | 只打印启动计划 |
| `vp run doctor` | Kit 环境诊断 |
| `vp run clean` | 删除 `build/`、`dist/` 与 `release/` |

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

`scripts/kit.sh` 默认把 `NPM_CONFIG_USERCONFIG` 指向 `/dev/null`，避免用户级
`.npmrc` 干扰 Kit 的 npm 版本检查；需要自定义时显式设置该变量。

## 版本与本地替换

- 当前 `FusionUIApp.json` 为 `1.0.1` / `versionCode: 2`。
- 源码变化会改变包字节；如果 `versionCode` 不变，Kit 默认拒绝替换已安装包。
- 本地开发脚本 `start` / `run:stereo` / `dry-run` 已带 `--allow-debug-replace`，
  方便反复迭代；正式发布前请提高 `FusionUIApp.json` 的 `version` 与 `versionCode`。

## 包管理

应用保持零运行时依赖；`typescript` 只作为 devDependency 参与构建。
`package.json` 的 `engines` 与 `.node-version` 都锁在 Node 24.13.0
（Kit 会在 `build`/`test`/`package` 时精确校验）。`package.json` 由 npm 维护，
加脚本用 `npm pkg set`，不要手写。
