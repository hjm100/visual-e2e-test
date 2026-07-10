#!/usr/bin/env bash
# 使用国内镜像安装/修复 Rust stable 工具链（解决 static.rust-lang.org connection reset）
set -euo pipefail

export RUSTUP_DIST_SERVER="${RUSTUP_DIST_SERVER:-https://rsproxy.cn}"
export RUSTUP_UPDATE_ROOT="${RUSTUP_UPDATE_ROOT:-https://rsproxy.cn/rustup}"

if ! command -v rustup >/dev/null 2>&1; then
  echo "rustup 未找到，正在安装..."
  curl --proto '=https' --tlsv1.2 -sSf https://rsproxy.cn/rustup-init.sh | sh -s -- -y
fi

export PATH="${HOME}/.cargo/bin:${PATH}"

echo "清理损坏的 stable 工具链（若存在）..."
rm -rf "${HOME}/.rustup/toolchains/stable-aarch64-apple-darwin" 2>/dev/null || true

echo "安装 stable（镜像: ${RUSTUP_DIST_SERVER}，minimal 不含 rust-docs）..."
rustup toolchain install stable --profile minimal
rustup default stable

mkdir -p "${HOME}/.cargo"
if [[ ! -f "${HOME}/.cargo/config.toml" ]] || ! grep -q rsproxy "${HOME}/.cargo/config.toml" 2>/dev/null; then
  cat >> "${HOME}/.cargo/config.toml" <<'EOF'

[source.crates-io]
replace-with = "rsproxy"

[source.rsproxy]
registry = "sparse+https://rsproxy.cn/index/"
EOF
  echo "已追加 Cargo rsproxy 镜像到 ~/.cargo/config.toml"
fi

echo ""
rustc --version
cargo --version
echo "Rust 工具链就绪。可运行: npm run tauri:dev"
