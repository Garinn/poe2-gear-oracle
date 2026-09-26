#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v git >/dev/null
command -v luajit >/dev/null || { echo 'Install LuaJIT and lua-utf8 first; see README or use Docker.'; exit 1; }
mkdir -p .pob
if [ ! -d .pob/PathOfBuilding-PoE2/.git ]; then
 git init -q .pob/PathOfBuilding-PoE2
 git -C .pob/PathOfBuilding-PoE2 remote add origin https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2.git
fi
git -C .pob/PathOfBuilding-PoE2 fetch --depth 1 origin ce566eac45ea8a86477f513c7ee65a1ebe60014e
git -C .pob/PathOfBuilding-PoE2 checkout --detach FETCH_HEAD
luajit -e 'require("lua-utf8")'
echo 'Pinned PoB2 is ready. Run npm run dev.'
