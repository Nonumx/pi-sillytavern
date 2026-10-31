#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

exec pi \
  --no-extensions \
  --extension . \
  --no-builtin-tools \
  --no-skills \
  --no-prompt-templates \
  --no-themes \
  --no-context-files \
  --no-mcp \
  "$@"
