$ErrorActionPreference = "Stop"

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServerEntry = Join-Path $ProjectDir "apps\mcp-server\dist\index.js"
$ExtensionDir = Join-Path $ProjectDir "apps\chrome-extension\dist"

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
    & pnpm check
    if ($LASTEXITCODE -ne 0) { throw "검증 또는 빌드에 실패했습니다." }
  } else {
    & npx --yes pnpm@9.15.9 install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "패키지 설치에 실패했습니다." }
    & npx --yes pnpm@9.15.9 check
    if ($LASTEXITCODE -ne 0) { throw "검증 또는 빌드에 실패했습니다." }
  }

  $PairingCode = (& node (Join-Path $ProjectDir "apps\mcp-server\dist\pairing-code.js")).Trim()

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
  Write-Host "Chrome 확장 프로그램 폴더:"
  Write-Host $ExtensionDir
  Write-Host ""
  Write-Host "확장 프로그램 옵션에 입력할 연결 코드:"
  Write-Host $PairingCode
  Write-Host ""
  Write-Host "다음 단계는 ONBOARDING_KO.md를 따라 주세요."
} finally {
  Pop-Location
}
