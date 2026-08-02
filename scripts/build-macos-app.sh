#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"
SOURCE_DIR="$PROJECT_DIR/apps/desktop-launcher/macos"
OUTPUT_DIR="$PROJECT_DIR/dist/macos"
APP_NAME="MathCanvas 수업 준비.app"
APP_PATH="$OUTPUT_DIR/$APP_NAME"
CONTENTS="$APP_PATH/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"
BUILD_DIR="$OUTPUT_DIR/.build"
ICONSET_DIR="$BUILD_DIR/AppIcon.iconset"

print "교사용 화면을 준비하고 있습니다…"
cd "$PROJECT_DIR"
pnpm --filter @mathcanvas/teacher-ui... build

rm -rf "$APP_PATH" "$BUILD_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR" "$ICONSET_DIR"
cp "$SOURCE_DIR/Info.plist" "$CONTENTS/Info.plist"
print -r -- "$PROJECT_DIR" > "$RESOURCES_DIR/project-root.txt"

print "macOS 실행기를 만들고 있습니다…"
swiftc -parse-as-library -swift-version 5 -O -target arm64-apple-macosx12.0 \
  -framework AppKit \
  "$SOURCE_DIR/MathCanvasLauncher.swift" \
  -o "$BUILD_DIR/MathCanvasTeacher-arm64"
swiftc -parse-as-library -swift-version 5 -O -target x86_64-apple-macosx12.0 \
  -framework AppKit \
  "$SOURCE_DIR/MathCanvasLauncher.swift" \
  -o "$BUILD_DIR/MathCanvasTeacher-x86_64"
lipo -create \
  "$BUILD_DIR/MathCanvasTeacher-arm64" \
  "$BUILD_DIR/MathCanvasTeacher-x86_64" \
  -output "$MACOS_DIR/MathCanvasTeacher"
chmod 755 "$MACOS_DIR/MathCanvasTeacher"

swift "$SOURCE_DIR/RenderIcon.swift" "$BUILD_DIR/AppIcon-1024.png"
sips -z 16 16 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$BUILD_DIR/AppIcon-1024.png" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
cp "$BUILD_DIR/AppIcon-1024.png" "$ICONSET_DIR/icon_512x512@2x.png"
iconutil -c icns "$ICONSET_DIR" -o "$RESOURCES_DIR/AppIcon.icns"

rm -rf "$BUILD_DIR"
codesign --force --deep --sign - "$APP_PATH" >/dev/null

if [[ "${1:-}" == "--install" ]]; then
  INSTALL_PATH="/Applications/$APP_NAME"
  if [[ -e "$INSTALL_PATH" ]]; then
    BACKUP_PATH="$HOME/.Trash/MathCanvas 수업 준비-$(date +%Y%m%d-%H%M%S).app"
    mv "$INSTALL_PATH" "$BACKUP_PATH"
    print "기존 앱은 휴지통에 백업했습니다: $BACKUP_PATH"
  fi
  ditto "$APP_PATH" "$INSTALL_PATH"
  codesign --verify --deep --strict "$INSTALL_PATH"
  print ""
  print "설치 완료: $INSTALL_PATH"
  print "응용 프로그램에서 ‘MathCanvas 수업 준비’를 더블클릭하세요."
else
  print ""
  print "앱 생성 완료: $APP_PATH"
fi
