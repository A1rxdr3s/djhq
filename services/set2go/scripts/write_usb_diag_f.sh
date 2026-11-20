#!/bin/bash
# Write diag_f candidate to REKTEST USB.
# Run ONLY when REKTEST is mounted and you've confirmed it's the correct device.
# Preserves all existing USB content (no format, no wipe).
#
# Usage: bash scripts/write_usb_diag_f.sh
set -euo pipefail

USB_MOUNT="/Volumes/REKTEST"
CANDIDATE="diagnostic/diag_f"
LOG_FILE="diagnostic/diag_f/USB_WRITE_LOG.txt"

if [ ! -d "$USB_MOUNT" ]; then
    echo "ERROR: $USB_MOUNT not mounted. Connect REKTEST USB and try again."
    exit 1
fi

# Sanity check: confirm REKTEST contains a PIONEER directory
if [ ! -d "$USB_MOUNT/PIONEER" ]; then
    echo "WARNING: $USB_MOUNT/PIONEER not found — is this the correct USB?"
    read -p "Type 'yes' to continue: " confirm
    [ "$confirm" != "yes" ] && exit 1
fi

# Show what's currently on the USB
echo "=== Current REKTEST state ==="
ls -la "$USB_MOUNT/" 2>/dev/null || true
echo ""
echo "=== Writing diag_f ==="

# Copy PIONEER directory (ANLZ + PDB)
echo "Copying PIONEER/ ..."
rsync -av --checksum \
    "$CANDIDATE/PIONEER/" \
    "$USB_MOUNT/PIONEER/"

# Copy audio to Contents/
echo "Copying Contents/ ..."
mkdir -p "$USB_MOUNT/Contents"
rsync -av --checksum \
    "$CANDIDATE/Contents/" \
    "$USB_MOUNT/Contents/"

# Verify SHA-256 of all audio copies
echo "Verifying audio SHA-256 ..."
fail=0
while IFS= read -r -d '' src_file; do
    filename=$(basename "$src_file")
    dst_file="$USB_MOUNT/Contents/$filename"
    if [ ! -f "$dst_file" ]; then
        echo "MISSING: $dst_file"
        fail=1
        continue
    fi
    src_hash=$(shasum -a 256 "$src_file" | cut -d' ' -f1)
    dst_hash=$(shasum -a 256 "$dst_file" | cut -d' ' -f1)
    if [ "$src_hash" = "$dst_hash" ]; then
        echo "  OK  $filename"
    else
        echo "  HASH MISMATCH: $filename"
        fail=1
    fi
done < <(find "$CANDIDATE/Contents" -type f -print0)

if [ "$fail" -ne 0 ]; then
    echo "HASH VERIFICATION FAILED. Do not eject."
    exit 1
fi

echo ""
echo "=== All hashes verified. Listing USB PIONEER/ structure ==="
find "$USB_MOUNT/PIONEER" -name "ANLZ*" | sort

echo ""
echo "=== WRITE COMPLETE ==="
echo "Tracks:  7 unseen (diag_f)"
echo "PDB:     $(stat -f%z "$USB_MOUNT/PIONEER/rekordbox/export.pdb") bytes"
echo "Eject:   diskutil eject $USB_MOUNT"
echo ""
echo "Record results in: diagnostic/diag_f/DIAG_F_MANIFEST.json"
echo "Then physically test on CDJ-2000NXS2 using the checklist in CHECKLIST.md"

# Log
{
    echo "diag_f USB write: $(date)"
    echo "USB: $USB_MOUNT"
    df -h "$USB_MOUNT"
} >> "$LOG_FILE"
