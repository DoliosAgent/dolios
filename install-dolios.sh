#!/usr/bin/env bash
# ============================================================================
# Dolios installer (macOS / Linux / WSL)
#   curl -fsSL https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.sh | bash
#
# Dolios is a distribution of Hermes Agent (Nous Research, MIT). This wrapper runs the
# Hermes installer against the Dolios repository into its own home (~/.dolios), installs
# GMGN's gmgn-cli, and adds a `dolios` command to ~/.local/bin.
# Overrides: DOLIOS_REPO (owner/name), DOLIOS_BRANCH, DOLIOS_HOME.
# ============================================================================
set -euo pipefail
REPO="${DOLIOS_REPO:-DoliosAgent/dolios}"
BRANCH="${DOLIOS_BRANCH:-main}"
DHOME="${DOLIOS_HOME:-$HOME/.dolios}"

printf '\n\033[36m  ██████╗  ██████╗ ██╗     ██╗ ██████╗ ███████╗\033[0m\n'
printf '\033[32m  ██╔══██╗██╔═══██╗██║     ██║██╔═══██╗██╔════╝\033[0m\n'
printf '\033[33m  ██║  ██║██║   ██║██║     ██║██║   ██║███████╗\033[0m\n'
printf '\033[33m  ██████╔╝╚██████╔╝███████╗██║╚██████╔╝███████║\033[0m\n'
printf '\033[31m  ╚═════╝  ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ╚══════╝\033[0m\n'
printf '\033[90m  The cunning trading agent for GMGN  ·  built on Hermes Agent\033[0m\n\n'

export HERMES_REPO_URL="https://github.com/${REPO}.git"
curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/scripts/install.sh" \
  | bash -s -- --branch "$BRANCH" --hermes-home "$DHOME" --dir "$DHOME/dolios" </dev/tty

if command -v npm >/dev/null 2>&1; then
  echo "Installing gmgn-cli..."
  npm install -g gmgn-cli || echo "npm install failed - run: npm install -g gmgn-cli (may need sudo or a Node version manager)"
else
  echo "Node.js not found. Install Node 18+ then run: npm install -g gmgn-cli"
fi

mkdir -p "$HOME/.local/bin"
TARGET="$DHOME/dolios/.hermes/bin/hermes"
[ -x "$TARGET" ] || TARGET="$(command -v hermes || true)"
if [ -n "$TARGET" ]; then
  printf '#!/bin/sh\nexport HERMES_HOME="${HERMES_HOME:-%s}"\nexec "%s" "$@"\n' "$DHOME" "$TARGET" > "$HOME/.local/bin/dolios"
  chmod +x "$HOME/.local/bin/dolios"
  echo "dolios command installed at ~/.local/bin/dolios"
fi

printf '\n\033[32mDone. Open a new terminal and run:  dolios\033[0m\n'
printf '\033[90mFirst chat: say "connect my GMGN account" and Dolios walks you through it.\033[0m\n'
