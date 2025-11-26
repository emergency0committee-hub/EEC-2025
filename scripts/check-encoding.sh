#!/usr/bin/env bash
set -euo pipefail

# Scan common source/doc types for likely UTF-8 mangling (Ã, �)
bad=$(rg -n "Ã|�" src --glob '*.js' --glob '*.jsx' --glob '*.ts' --glob '*.tsx' --glob '*.json' --glob '*.md' || true)

if [[ -n "$bad" ]]; then
  echo "Found possible encoding issues:"
  echo "$bad"
  exit 1
fi

echo "Encoding check passed."
