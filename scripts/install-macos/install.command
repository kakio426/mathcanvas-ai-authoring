#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
SERVER_ENTRY="$PROJECT_DIR/apps/mcp-server/dist/index.js"
EXTENSION_DIR="$PROJECT_DIR/apps/chrome-extension/dist"

if ! command -v node >/dev/null 2>&1; then
  print "Node.js 20 이상이 필요합니다: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 20 )); then
  print "Node.js 20 이상이 필요합니다. 현재 버전: $(node --version)"
  exit 1
fi

cd "$PROJECT_DIR"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm check
else
  npx --yes pnpm@9.15.9 install --frozen-lockfile
  npx --yes pnpm@9.15.9 check
fi
PAIRING_CODE="$(node "$PROJECT_DIR/apps/mcp-server/dist/pairing-code.js")"

if command -v codex >/dev/null 2>&1; then
  if codex mcp get mathcanvas-ai >/dev/null 2>&1; then
    codex mcp remove mathcanvas-ai
  fi
  codex mcp add mathcanvas-ai -- node "$SERVER_ENTRY"
  print "Codex의 mathcanvas-ai 등록을 현재 빌드로 맞췄습니다."
fi

if command -v claude >/dev/null 2>&1; then
  if claude mcp get mathcanvas-ai >/dev/null 2>&1; then
    claude mcp remove mathcanvas-ai
  fi
  claude mcp add --scope user mathcanvas-ai -- node "$SERVER_ENTRY"
  print "Claude Code의 mathcanvas-ai 등록을 현재 빌드로 맞췄습니다."
fi

pnpm run doctor 2>/dev/null || npx --yes pnpm@9.15.9 run doctor

print ""
print "Chrome 확장 프로그램 폴더:"
print "$EXTENSION_DIR"
print ""
print "확장 프로그램 옵션에 입력할 연결 코드:"
print "$PAIRING_CODE"
print ""
print "다음 단계는 ONBOARDING_KO.md를 따라 주세요."
