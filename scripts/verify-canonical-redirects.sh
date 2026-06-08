#!/usr/bin/env bash
# Verify builder alias paths 308 → /tools/<name> and canonical paths return 200.
set -uo pipefail

BASE_URL="${1:-https://www.aibotcheck.io}"

BUILDERS=(
  llms-builder
  robots-builder
  sitemap-builder
  security-builder
  manifest-builder
  ads-builder
  humans-builder
  ai-builder
)

pass=0
fail=0

check_alias() {
  local name="$1"
  local headers
  headers=$(curl -sI "${BASE_URL}/${name}")
  local status location
  status=$(echo "$headers" | head -1 | tr -d '\r')
  location=$(echo "$headers" | grep -i '^location:' | tr -d '\r' | awk '{print $2}' | tr -d '\r')

  if [[ "$status" == *"308"* ]] && [[ "$location" == *"/tools/${name}"* ]]; then
    echo "PASS  alias /${name} → ${status} Location: ${location}"
    pass=$((pass + 1))
  else
    echo "FAIL  alias /${name} → ${status} Location: ${location:-<none>}"
    fail=$((fail + 1))
  fi
}

check_canonical() {
  local name="$1"
  local headers
  headers=$(curl -sI "${BASE_URL}/tools/${name}")
  local status
  status=$(echo "$headers" | head -1 | tr -d '\r')

  if [[ "$status" == *"200"* ]]; then
    echo "PASS  canonical /tools/${name} → ${status}"
    pass=$((pass + 1))
  else
    echo "FAIL  canonical /tools/${name} → ${status}"
    fail=$((fail + 1))
  fi
}

echo "Checking ${BASE_URL}"
echo "--- Alias redirects (expect 308 → /tools/<name>) ---"
for name in "${BUILDERS[@]}"; do
  check_alias "$name"
done

echo "--- Canonical paths (expect 200) ---"
for name in "${BUILDERS[@]}"; do
  check_canonical "$name"
done

echo "---"
echo "Results: ${pass} passed, ${fail} failed"
exit "$fail"
