#!/bin/bash
# Build the libKeyFinder ctypes wrapper dylib.
# Requires: brew install keyfinder
# Output: $SET2GO_KEYFINDER_DYLIB or /tmp/libkf_wrapper.dylib (per-machine; not committed)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="${SET2GO_KEYFINDER_DYLIB:-/tmp/libkf_wrapper.dylib}"
c++ -std=c++17 -O2 \
    -I/opt/homebrew/include \
    -L/opt/homebrew/lib \
    -lkeyfinder \
    -shared -fPIC \
    "$SCRIPT_DIR/kf_wrapper.cpp" \
    -o "$OUTPUT"
echo "Built $OUTPUT"
