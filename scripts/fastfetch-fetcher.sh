#!/usr/bin/env bash
set -euo pipefail

# Config
REPO="fastfetch-cli/fastfetch"
TAG="${FASTFETCH_TAG:-latest}"   # set FASTFETCH_TAG=v2.54.0 to pin a version (with or without the 'v')
OUT_DIR="${1:-fastfetch-binaries}"
VERIFY="${VERIFY:-0}"            # set VERIFY=1 to check SHA256 against release notes
GH_API="https://api.github.com/repos/${REPO}/releases"
AUTH_HEADER=()
[[ -n "${GITHUB_TOKEN:-}" ]] && AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")

# Helpers
die(){ echo "Error: $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "'$1' is required"; }

need curl; need jq; need unzip

# Get release JSON (latest or by tag)
if [[ "$TAG" == "latest" ]]; then
  rel_json="$(curl -fsSL "${GH_API}/latest" "${AUTH_HEADER[@]}")"
else
  tag="${TAG#v}"
  rel_json="$(curl -fsSL "${GH_API}/tags/${tag}" "${AUTH_HEADER[@]}")"
fi

# Extract assets for target OS/arch combos
# We prefer the non-musl, non-polyfilled zips where available.
declare -A patterns=(
  [linux-amd64]='^fastfetch-linux-amd64\.zip$'
  [windows-amd64]='^fastfetch-windows-amd64\.zip$'
  [macos-amd64]='^fastfetch-macos-amd64\.zip$'
  [macos-aarch64]='^fastfetch-macos-aarch64\.zip$'
)

mkdir -p "$OUT_DIR"
echo "Output: $OUT_DIR"

download_asset() {
  local key="$1" re="${patterns[$1]}"
  local name url
  name="$(jq -r --arg re "$re" '.assets[] | select(.name|test($re)) | .name' <<<"$rel_json" | head -n1)"
  [[ -n "$name" ]] || { echo "Skipping ${key}: no matching asset in this release"; return 1; }
  url="$(jq -r --arg re "$re" '.assets[] | select(.name|test($re)) | .browser_download_url' <<<"$rel_json" | head -n1)"
  mkdir -p "$OUT_DIR/$key"
  echo "Downloading ${name} -> $OUT_DIR/$key/"
  curl -fL --retry 3 -o "$OUT_DIR/$key/$name" "$url"
}

extract_binary() {
  local key="$1" zip="$2" outbin target
  case "$key" in
    windows-*) outbin="$OUT_DIR/$key/fastfetch.exe"; target='fastfetch.exe' ;;
    *)         outbin="$OUT_DIR/$key/fastfetch";     target='fastfetch' ;;
  esac
  # Find the path to the binary inside the zip (root or subfolder)
  local inner
  inner="$(unzip -Z1 "$zip" | grep -E "^(.*/)?${target}$" | head -n1 || true)"
  [[ -n "$inner" ]] || die "Binary '${target}' not found in $zip"
  unzip -p "$zip" "$inner" > "$outbin"
  chmod +x "$outbin" || true
  echo "Extracted $(basename "$outbin") from $(basename "$zip")"
}

verify_sha256_if_enabled() {
  [[ "$VERIFY" = "1" ]] || return 0
  local zip="$1" name expected actual
  name="$(basename "$zip")"
  # Release body includes lines like: "<SHA256>  fastfetch-linux-amd64/fastfetch-linux-amd64.zip"
  expected="$(jq -r '.body' <<<"$rel_json" \
    | sed -nE "s/^([0-9a-f]{64})[[:space:]]+.*\/${name}$/\1/p" | head -n1)"
  [[ -n "$expected" ]] || { echo "No checksum found in release notes for ${name}, skipping verify"; return 0; }
  actual="$(sha256sum "$zip" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    die "SHA256 mismatch for ${name}: expected ${expected}, got ${actual}"
  fi
  echo "SHA256 OK for ${name}"
}

# Download
for key in "${!patterns[@]}"; do
  if download_asset "$key"; then
    zipfile="$(ls -1 "$OUT_DIR/$key"/*.zip 2>/dev/null | head -n1 || true)"
    [[ -n "$zipfile" ]] || continue
    verify_sha256_if_enabled "$zipfile"
    extract_binary "$key" "$zipfile"
  fi
done

echo "Done. Binaries are in:"
find "$OUT_DIR" -maxdepth 2 -type f \( -name fastfetch -o -name fastfetch.exe \) -print
