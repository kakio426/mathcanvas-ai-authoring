$ErrorActionPreference = "Stop"

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServerEntry = Join-Path $ProjectDir "apps\mcp-server\dist\index.js"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 20 이상이 필요합니다: https://nodejs.org/"
}

$NodeMajor = [int](& node -p 'Number(process.versions.node.split(".")[0])')
if ($NodeMajor -lt 20) {
  throw "Node.js 20 이상이 필요합니다. 현재 버전: $(& node --version)"
}

Push-Location $ProjectDir
try {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "패키지 설치에 실패했습니다." }
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw "빌드에 실패했습니다." }
  } else {
    & npx --yes pnpm@9.15.9 install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "패키지 설치에 실패했습니다." }
    & npx --yes pnpm@9.15.9 build
    if ($LASTEXITCODE -ne 0) { throw "빌드에 실패했습니다." }
  }

  if (Get-Command codex -ErrorAction SilentlyContinue) {
    & codex mcp get mathcanvas-ai *> $null
    if ($LASTEXITCODE -eq 0) {
      & codex mcp remove mathcanvas-ai
      if ($LASTEXITCODE -ne 0) { throw "기존 Codex MCP 등록 제거에 실패했습니다." }
    }
    & codex mcp add mathcanvas-ai -- node $ServerEntry
    if ($LASTEXITCODE -ne 0) { throw "Codex MCP 등록에 실패했습니다." }
    Write-Host "Codex의 mathcanvas-ai 등록을 현재 빌드로 맞췄습니다."
  }

  if (Get-Command claude -ErrorAction SilentlyContinue) {
    & claude mcp get mathcanvas-ai *> $null
    if ($LASTEXITCODE -eq 0) {
      & claude mcp remove mathcanvas-ai
      if ($LASTEXITCODE -ne 0) { throw "기존 Claude Code MCP 등록 제거에 실패했습니다." }
    }
    & claude mcp add --scope user mathcanvas-ai -- node $ServerEntry
    if ($LASTEXITCODE -ne 0) { throw "Claude Code MCP 등록에 실패했습니다." }
    Write-Host "Claude Code의 mathcanvas-ai 등록을 현재 빌드로 맞췄습니다."
  }

  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    & pnpm run doctor
  } else {
    & npx --yes pnpm@9.15.9 run doctor
  }
  if ($LASTEXITCODE -ne 0) { throw "설치 진단에 실패했습니다." }

  Write-Host ""
  Write-Host "설치가 끝났습니다. 확장 프로그램은 설치하지 않습니다."
  Write-Host "Codex 또는 Claude Code를 다시 시작한 뒤"
  Write-Host "'MathCanvas 전용 창을 열어 줘'라고 말하세요."
  Write-Host "자세한 로그인 순서는 ONBOARDING_KO.md에 있습니다."
} finally {
  Pop-Location
}
