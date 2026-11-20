#!/usr/bin/env bash
# Set up aubio for the Set2Go project.
#
# aubio 0.4.9 cannot be built from source under Python 3.15 (build system
# incompatibility). The Homebrew formula provides a pre-built binary for
# Homebrew's own Python 3.15. This script copies it into the uv venv.
#
# Run this once after `uv sync`:
#   bash scripts/setup_aubio.sh
#
# What it does:
#   1. Confirms aubio is installed via Homebrew.
#   2. Copies the aubio package directory into .venv/lib/python3.15/site-packages/.
#   3. Verifies the import works.
#
# Required: Homebrew (brew install aubio), uv sync already run.
# Platform: macOS Apple Silicon (arm64).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BREW_AUBIO="/opt/homebrew/lib/python3.15/site-packages/aubio"
VENV_SITE="$PROJECT_ROOT/.venv/lib/python3.15/site-packages"

echo "[1/4] Checking Homebrew aubio..."
if [[ ! -d "$BREW_AUBIO" ]]; then
    echo "ERROR: Homebrew aubio not found at $BREW_AUBIO"
    echo "       Run: brew install aubio"
    exit 1
fi

AUBIO_SO="$BREW_AUBIO/_aubio.cpython-315-darwin.so"
if [[ ! -f "$AUBIO_SO" ]]; then
    echo "ERROR: aubio native extension not found at $AUBIO_SO"
    echo "       The Homebrew formula may have changed. Check the path manually."
    exit 1
fi
echo "  Found Homebrew aubio: $BREW_AUBIO"

echo "[2/4] Checking uv venv..."
if [[ ! -d "$VENV_SITE" ]]; then
    echo "ERROR: .venv not found. Run: uv sync"
    exit 1
fi

echo "[3/4] Copying aubio into venv..."
DEST="$VENV_SITE/aubio"
if [[ -d "$DEST" ]]; then
    chmod -R u+w "$DEST"
fi
cp -R "$BREW_AUBIO" "$DEST"
echo "  Copied to $DEST"

echo "[4/4] Verifying import..."
"$PROJECT_ROOT/.venv/bin/python" -c "
import aubio
print('  aubio OK — version:', getattr(aubio, 'version', '(unknown)'))
print('  tempo object:', aubio.tempo)
"

echo ""
echo "Setup complete. You can now run: uv run scripts/export_usb.py"
