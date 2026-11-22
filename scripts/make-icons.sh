#!/usr/bin/env bash
# Makes the app icons from resources/icon.svg (run again after changing the design):
#   resources/icon.png  (1024 px, Linux and the source of the others)
#   resources/icon.icns (macOS)
#   resources/icon.ico  (Windows: the rounded square fills the icon, without macOS's margin, so the
#                        taskbar shows it as large as other apps)
# Needs macOS (sips, iconutil) and the project's Electron (node_modules).
set -euo pipefail
cd "$(dirname "$0")/.."

unset ELECTRON_RUN_AS_NODE
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

node_modules/.bin/electron scripts/render-icon.cjs resources/icon.svg resources/icon.png

mkdir "$work/icon.iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" resources/icon.png --out "$work/icon.iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" resources/icon.png --out "$work/icon.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$work/icon.iconset" -o resources/icon.icns

# Windows: the same design cropped to the rounded square (keeping 8 px of 1024 so its edge is not cut).
sed 's/viewBox="0 0 1024 1024"/viewBox="92 92 840 840"/' resources/icon.svg >"$work/icon-windows.svg"
node_modules/.bin/electron scripts/render-icon.cjs "$work/icon-windows.svg" "$work/icon-windows.png"
for size in 16 32 48 64 128 256; do
  sips -z "$size" "$size" "$work/icon-windows.png" --out "$work/ico-$size.png" >/dev/null
done
node scripts/make-ico.mjs resources/icon.ico "$work"/ico-{16,32,48,64,128,256}.png

ls -lh resources/icon.png resources/icon.icns resources/icon.ico
