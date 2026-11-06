#!/bin/sh
# 清理并编译 TypeScript，然后把 Kit 需要的 XRManifest.xml 复制到 build/。
set -eu
cd "$(dirname "$0")/.."
rm -rf build
./node_modules/.bin/tsc -p tsconfig.json
mkdir -p build
cp src/XRManifest.xml build/XRManifest.xml
