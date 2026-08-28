#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_BIN="timeout"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_BIN="gtimeout"
else
  TIMEOUT_BIN=""
fi

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

node "${script_dir}/materialize-release-assets.mjs"

control_center_dir="${SITES_PROJECT_ROOT}/../control-center-web"
if [[ ! -f "${control_center_dir}/package.json" ]]; then
  echo "The public control-center-web source is required to build the embedded PAWOS showcase." >&2
  exit 66
fi

echo "Building the public synthetic-data PAWOS surface..."
if command -v pnpm >/dev/null 2>&1; then
  (cd "${control_center_dir}" && pnpm build)
elif command -v corepack >/dev/null 2>&1; then
  (cd "${control_center_dir}" && corepack pnpm build)
else
  echo "pnpm is unavailable; install the package manager declared by control-center-web/package.json." >&2
  exit 69
fi

node "${script_dir}/materialize-pawos-showcase.mjs"
cleanup_pawos_showcase() {
  node "${script_dir}/materialize-pawos-showcase.mjs" --clean
}
trap cleanup_pawos_showcase EXIT

echo "Running bounded vinext build..."
if [[ -n "${TIMEOUT_BIN}" ]]; then
  "${TIMEOUT_BIN}" \
    --signal=TERM \
    --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
    "${SITES_BUILD_TIMEOUT:-3m}" \
    "${vinext}" build
else
  "${vinext}" build
fi
