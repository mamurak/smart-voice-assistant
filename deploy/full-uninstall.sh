#!/usr/bin/env bash
# Full uninstall: remove the web UI AND all models (STT/LLM/TTS).
#
#   ./full-uninstall.sh [-n NAMESPACE]
set -euo pipefail
usage() { grep -E '^# ' "$0" | sed 's/^# //'; }
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
parse_args "$@"; resolve_ns
banner "Full uninstall → namespace: $NS"
uninstall_app
uninstall_models
printf "\n%s✅ Everything removed from %s%s\n" "$BOLD$GRN" "$NS" "$RST"
