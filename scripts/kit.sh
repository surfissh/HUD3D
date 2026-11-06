#!/bin/sh
# IrisView 开发入口：解析 Kit、切换到 Vite+ 管理的 Node、检查前置条件，
# 再用 scripts/irisview.py 调用 Kit（开发模式下绕过 Ubuntu-only 的 host gate）。
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

# 1) 显式指定的 Node 优先。
if [ -n "${IRISVIEW_NODE_BIN:-}" ]; then
  PATH="$IRISVIEW_NODE_BIN:$PATH"
  export PATH

# 2) 当前 Node 与 .node-version 不一致时，用 Vite+ 的 pinned Node 重新执行自己。
#    这样 `npm run build` 在 Node 26 的 shell 里也能自动切到 24.13.0。
elif [ "${IRISVIEW_VP_REEXEC:-0}" != "1" ] && command -v vp >/dev/null 2>&1; then
  PINNED_NODE=$(cat "$ROOT/.node-version" 2>/dev/null || echo "24.13.0")
  if [ "$(node -v 2>/dev/null || true)" != "v$PINNED_NODE" ]; then
    IRISVIEW_VP_REEXEC=1
    export IRISVIEW_VP_REEXEC
    exec vp env exec --node "$PINNED_NODE" -- sh "$ROOT/scripts/kit.sh" "$@"
  fi
fi

KIT="${IRISVIEW_KIT:-$ROOT/IrisView-Developer-Kit-v1.0.0}"
case "$KIT" in
  /*) ;;
  *) KIT="$ROOT/$KIT" ;;
esac
export IRISVIEW_KIT="$KIT"
export FUSIONUI_DEVELOPER_KIT_ROOT="$KIT"

# 可选：把 Kit 的 state 目录放到工作区内（默认是 ~/IrisView-Developer-Kit-Data）。
if [ "${1:-}" = "run" ] && [ -n "${IRISVIEW_STATE_DIR:-}" ]; then
  set -- "$@" --state-dir "$IRISVIEW_STATE_DIR"
fi

node "$ROOT/scripts/preflight.mjs" "$@"
exec python3 "$ROOT/scripts/irisview.py" "$@"
