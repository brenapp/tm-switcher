# Copies binaries from bundle to tauri sidecar binaries folders, and names them to the appropriate target triple
mkdir -p host/src-tauri/binaries
cp bundle/tm-switcher-linux-x64 host/src-tauri/binaries/tm-switcher-x86_64-unknown-linux-gnu
cp bundle/tm-switcher-macos-arm64 host/src-tauri/binaries/tm-switcher-aarch64-apple-darwin
cp bundle/tm-switcher-macos-x64 host/src-tauri/binaries/tm-switcher-x86_64-apple-darwin
cp bundle/tm-switcher-win-x64.exe host/src-tauri/binaries/tm-switcher-x86_64-pc-windows-msvc.exe

