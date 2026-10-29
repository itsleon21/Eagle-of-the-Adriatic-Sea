#!/bin/bash
set -e
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo '请先安装 Node.js 24 LTS，然后重新打开。'
  read -r -p '按回车关闭。'
  exit 1
fi
if [ ! -d node_modules ]; then npm ci --no-fund --no-audit; fi
npm run dev -- --open
