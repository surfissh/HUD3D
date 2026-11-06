#!/usr/bin/env node
// 在调用 Kit 之前做最小的环境检查，把常见错误变成一行可操作的提示。

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUIRED_NODE = "24.13.0";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kit = path.resolve(
  root,
  process.env.IRISVIEW_KIT || "IrisView-Developer-Kit-v1.0.0",
);
const artifact = path.join(root, "release", "oven-hud.fuiapp");
const args = process.argv.slice(2);
const command = args[0] || "";

function fail(title, hint) {
  console.error(`\n✗ ${title}`);
  if (hint) console.error(hint.replace(/^/gm, "  ").replace(/[ \t]+$/gm, ""));
  process.exit(1);
}

if (process.versions.node !== REQUIRED_NODE) {
  fail(
    `Node ${process.versions.node}，IrisView Kit 要求精确的 ${REQUIRED_NODE}`,
    [
      "vp:   vp run <script>        # 使用 .node-version 里 pin 的 Node",
      `nvm:  nvm install ${REQUIRED_NODE} && nvm use ${REQUIRED_NODE}`,
      `或:   IRISVIEW_NODE_BIN=/path/to/node-v${REQUIRED_NODE}-linux-x64/bin npm run <script>`,
      "",
      "Kit 的 build/test/package 会在启动时校验版本，不能用新版本代替。",
    ].join("\n"),
  );
}

if (!existsSync(path.join(kit, "bin", "irisview"))) {
  fail(
    `找不到 IrisView Kit：${kit}`,
    [
      "把 Kit 放在仓库根目录，或用 IRISVIEW_KIT 指向 Kit 根目录，例如：",
      "IRISVIEW_KIT=$HOME/IrisView/LLVISION/IrisView-Developer-Kit-v1.0.0 vp run build",
    ].join("\n"),
  );
}

if (["test", "build"].includes(command) &&
    !existsSync(path.join(root, "build", "index.js"))) {
  fail("TypeScript 尚未编译", "先执行：npm run compile");
}

if (command === "package") {
  if (!existsSync(path.join(root, "dist", "linux")) ||
      !existsSync(path.join(root, "dist", "android"))) {
    fail("应用还没有构建产物", "先执行：vp run build");
  }
  try {
    execFileSync("git", ["-C", root, "rev-parse", "--verify", "HEAD"], {
      stdio: "ignore",
    });
  } catch {
    fail(
      "应用没有 Git 提交，package 需要 source revision",
      "git add -A && git commit -m \"init\"",
    );
  }
}

if (command === "run" && args[1] && args[1].endsWith(".fuiapp")) {
  const packagePath = path.resolve(root, args[1]);
  if (!existsSync(packagePath)) {
    fail(`找不到应用包：${packagePath}`, "先执行：vp run package");
  }
}

console.log(`✓ Node ${process.versions.node} · Kit ${kit}`);
