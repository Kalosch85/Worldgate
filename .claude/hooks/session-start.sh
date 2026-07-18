#!/bin/bash
# SessionStart hook: install npm dependencies so tests, linters, and the build
# work immediately in Claude Code on the web sessions.
#
# Synchronous: the session waits for install to finish (no race where the agent
# runs tests before node_modules exists). `npm install` (not `npm ci`) so the
# post-hook container cache is reused across sessions.
set -euo pipefail

# Only needed in remote (web) sessions; local checkouts manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Send install output to stderr so it stays out of the session context.
npm install --no-audit --no-fund 1>&2

echo "SessionStart: npm dependencies installed." 1>&2
