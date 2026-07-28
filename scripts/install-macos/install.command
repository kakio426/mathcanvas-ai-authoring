#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h:h}"
SERVER_ENTRY="$PROJECT_DIR/apps/mcp-server/dist/index.js"

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
  pnpm build
else
  npx --yes pnpm@9.15.9 install --frozen-lockfile
  npx --yes pnpm@9.15.9 build
fi

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

if command -v pnpm >/dev/null 2>&1; then
  pnpm run doctor
else
  npx --yes pnpm@9.15.9 run doctor
fi

print ""
print "설치가 끝났습니다. 확장 프로그램은 설치하지 않습니다."
print "Codex 또는 Claude Code를 다시 시작한 뒤"
print "‘MathCanvas 전용 창을 열어 줘’라고 말하세요."
print "자세한 로그인 순서는 ONBOARDING_KO.md에 있습니다."
