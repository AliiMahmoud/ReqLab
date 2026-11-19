#!/usr/bin/env bash
# Builds ReqLab for macOS and Windows from a clean slate:
#   1. macOS: a .dmg installer for Intel (x64) and one for Apple silicon (arm64)
#   2. Windows: installer (.exe, x64)
#   3. Windows portable: a .zip (x64), nothing to install; it runs in portable mode (data next
#      to the app)
# The app icon comes from resources/icon.* (remake them with scripts/make-icons.sh).
# Everything lands in release/. Uses Node 22 through nvm, and pnpm through corepack
# (the project's lockfile is pnpm's, so npm would not install the same versions).
set -euo pipefail

cd "$(dirname "$0")"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step "Node 22 (nvm)"
# Uses a Node 22 that is already there (active, or installed in nvm); downloads one only if none is.
if [[ "$(node --version 2>/dev/null)" == v22.* ]]; then
  echo "Using the active Node $(node --version)"
else
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    echo "Node 22 is not active and nvm was not found in $NVM_DIR. Install nvm: https://github.com/nvm-sh/nvm" >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  if nvm ls 22 >/dev/null 2>&1; then
    nvm use 22 >/dev/null
    echo "Using the installed Node $(node --version)"
  else
    echo "No Node 22 found: installing it with nvm"
    nvm install 22
  fi
fi
# Some terminals (e.g. VS Code's) set this, which makes Electron run as plain Node.
unset ELECTRON_RUN_AS_NODE ELECTRON_NO_ATTACH_CONSOLE

step "Removing old builds (release/, out/)"
rm -rf release out

step "Installing dependencies (exact versions from the lockfile)"
corepack pnpm install --frozen-lockfile

step "Compiling the app"
corepack pnpm build

step "macOS: .dmg for Intel (x64) and Apple silicon (arm64)"
# Without an Apple "Developer ID Application" certificate the app is signed ad hoc: Apple silicon
# kills apps with no valid signature at launch. (Users then right-click > Open the first time.)
mac_signing=()
if ! security find-identity -v -p codesigning 2>/dev/null | grep -q "Developer ID Application"; then
  echo "No Developer ID certificate: signing ad hoc"
  mac_signing=(
    -c.mac.identity=-
    -c.mac.entitlements=resources/entitlements.mac.adhoc.plist
    -c.mac.entitlementsInherit=resources/entitlements.mac.adhoc.plist
  )
fi
corepack pnpm exec electron-builder --mac "${mac_signing[@]}"

step "Windows: installer (x64) and portable .zip (x64)"
corepack pnpm exec electron-builder --win nsis zip --x64

# Portable mode turns on when portable.flag sits next to ReqLab.exe: the app then keeps all its
# data in "ReqLab Data" beside it. The .zip carries the flag, so unzipping it anywhere (e.g. a USB
# stick) gives a portable app.
step "Adding portable.flag to the Windows .zip"
flag_dir="$(mktemp -d)"
trap 'rm -rf "$flag_dir"' EXIT
echo "ReqLab keeps its data in the 'ReqLab Data' folder next to ReqLab.exe." >"$flag_dir/portable.flag"
for archive in release/*-win.zip release/*-win-*.zip; do
  [[ -f "$archive" ]] || continue
  zip -j -q "$archive" "$flag_dir/portable.flag"
  echo "  $archive"
done

step "Done. Builds in release/:"
for file in release/*.dmg release/*.zip release/*.exe; do
  [[ -f "$file" ]] && printf '  %6s  %s\n' "$(du -h "$file" | cut -f1)" "$file"
done
