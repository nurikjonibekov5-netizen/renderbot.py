#!/usr/bin/env bash
# Klinika 3D nazorati: Mac va Linux uchun ishga tushirish.
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "Node.js o'rnatilmagan. https://nodejs.org saytidan 22 yoki undan yangi versiyani o'rnating."
  exit 1
fi
if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"; then
  echo "Node.js versiyasi eski. 22.13 yoki undan yangi versiyani o'rnating."
  exit 1
fi
[ -d node_modules ] || npm install
[ -f web/dist/index.html ] || npm run build
npm start
