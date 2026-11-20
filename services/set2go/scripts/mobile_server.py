#!/usr/bin/env python3
"""Set2Go Mobile Spike — minimal HTTP server for iPhone-operated workflow.

Workflow:
  1. iPhone uploads AIFF/WAV files via multipart POST to /upload
  2. Server runs BPM + key analysis and Pioneer USB library generation
  3. iPhone downloads result as ZIP archive from /export/<job_id>
  4. iPhone copies ZIP contents to a USB drive via Files app

This is a proof-of-concept spike. Not production-hardened.

Usage:
    uv run python scripts/mobile_server.py [--port 8765]

Expose on LAN for iPhone testing:
    The server binds to 0.0.0.0 so any device on the local WiFi can reach it
    at http://<mac-ip>:8765/

iPhone client options (no app required):
  A. curl (via a-Shell or similar):
       curl -F "file=@track.aiff" http://<mac-ip>:8765/upload
  B. Apple Shortcuts HTTP action (built-in, no extra app)
  C. Safari: browse to http://<mac-ip>:8765/ for the minimal web UI
"""

from __future__ import annotations

import io
import json
import shutil
import tempfile
import time
import uuid
import zipfile
from pathlib import Path

from flask import Flask, jsonify, render_template_string, request, send_file

app = Flask(__name__)

# In-memory job store (keyed by UUID, values: status + result path)
_jobs: dict[str, dict] = {}

_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set2Go</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  button { background: #1db954; color: white; border: none; padding: .8rem 1.6rem;
           border-radius: 8px; font-size: 1rem; cursor: pointer; width: 100%; margin-top:.8rem; }
  input[type=file] { width: 100%; margin-top: .5rem; }
  #status { margin-top: 1rem; font-size:.9rem; color: #555; }
  a.dl { display:block; margin-top:1rem; text-align:center; background:#0a84ff;
         color:white; padding:.8rem; border-radius:8px; text-decoration:none; }
</style>
</head>
<body>
<h1>Set2Go</h1>
<p>Select AIFF/WAV tracks, then tap <strong>Export</strong>.</p>
<form id="f" enctype="multipart/form-data">
  <input type="file" name="files" multiple accept=".aiff,.aif,.wav">
  <button type="submit">Export to CDJ USB</button>
</form>
<div id="status"></div>
<script>
const form = document.getElementById('f');
const status = document.getElementById('status');
form.onsubmit = async e => {
  e.preventDefault();
  status.textContent = 'Uploading…';
  const fd = new FormData(form);
  const r = await fetch('/upload', {method:'POST', body: fd});
  const j = await r.json();
  if (!j.job_id) { status.textContent = 'Error: ' + JSON.stringify(j); return; }
  status.textContent = 'Analysing tracks… (may take 20-60 seconds)';
  const id = j.job_id;
  for (let i = 0; i < 120; i++) {
    await new Promise(res => setTimeout(res, 2000));
    const s = await (await fetch('/status/' + id)).json();
    if (s.status === 'done') {
      status.innerHTML = 'Done! BPM: ' + JSON.stringify(s.bpm) + '<br>Key: ' + JSON.stringify(s.key);
      const a = document.createElement('a');
      a.href = '/export/' + id; a.textContent = 'Download Pioneer USB ZIP'; a.className = 'dl';
      status.appendChild(a);
      return;
    } else if (s.status === 'error') { status.textContent = 'Error: ' + s.error; return; }
  }
  status.textContent = 'Timeout.';
};
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(_HTML)


@app.route("/upload", methods=["POST"])
def upload():
    files = request.files.getlist("files") or request.files.getlist("file")
    if not files or files[0].filename == "":
        return jsonify(error="No files received"), 400

    job_id = str(uuid.uuid4())
    upload_dir = Path(tempfile.mkdtemp(prefix=f"set2go_{job_id}_"))
    tracks_dir = upload_dir / "tracks"
    tracks_dir.mkdir()

    saved = []
    total_bytes = 0
    for f in files:
        fn = Path(f.filename).name
        if not fn.lower().endswith((".aiff", ".aif", ".wav")):
            continue
        dest = tracks_dir / fn
        f.save(str(dest))
        total_bytes += dest.stat().st_size
        saved.append(dest)

    if not saved:
        shutil.rmtree(upload_dir, ignore_errors=True)
        return jsonify(error="No valid audio files"), 400

    _jobs[job_id] = {
        "status": "queued",
        "upload_dir": str(upload_dir),
        "tracks": [str(p) for p in saved],
        "total_upload_bytes": total_bytes,
    }

    import threading
    threading.Thread(target=_run_job, args=(job_id,), daemon=True).start()

    return jsonify(job_id=job_id, files=[p.name for p in saved], total_mb=round(total_bytes / 1e6, 1))


def _run_job(job_id: str):
    job = _jobs[job_id]
    upload_dir = Path(job["upload_dir"])
    try:
        job["status"] = "analysing"
        t0 = time.perf_counter()

        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
        from set2go.export import TrackSpec, export as set2go_export

        tracks = []
        for p in job["tracks"]:
            p = Path(p)
            name = p.stem
            parts = name.split(" - ", 1)
            artist = parts[0] if len(parts) > 1 else ""
            title = parts[1] if len(parts) > 1 else name
            tracks.append(TrackSpec(wav_path=p, title=title, artist=artist))

        out_dir = upload_dir / "usb"
        result = set2go_export(tracks, "Set2Go Export", out_dir)

        # Package only the PIONEER/ folder (ANLZ + PDB) for download.
        # The iPhone copies audio files directly from local storage to the USB
        # Contents/ folder — no round-trip through the server.
        zip_path = upload_dir / "set2go_pioneer.zip"
        pioneer_dir = out_dir / "PIONEER"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in pioneer_dir.rglob("*"):
                if f.is_file():
                    zf.write(f, Path("PIONEER") / f.relative_to(pioneer_dir))

        elapsed = time.perf_counter() - t0
        job.update(
            status="done",
            zip_path=str(zip_path),
            bpm={Path(k).name: v for k, v in result.bpm_map.items()},
            key={Path(k).name: v for k, v in result.key_map.items()},
            elapsed_s=round(elapsed, 1),
        )
    except Exception as exc:
        job["status"] = "error"
        job["error"] = str(exc)


@app.route("/status/<job_id>")
def status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return jsonify(error="Unknown job"), 404
    safe = {k: v for k, v in job.items() if k not in ("upload_dir", "zip_path", "tracks")}
    return jsonify(safe)


@app.route("/export/<job_id>")
def export_download(job_id: str):
    job = _jobs.get(job_id)
    if not job or job.get("status") != "done":
        return jsonify(error="Job not ready"), 404
    return send_file(
        job["zip_path"],
        as_attachment=True,
        download_name="set2go_pioneer.zip",
        mimetype="application/zip",
    )


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8765)
    args = p.parse_args()
    print(f"Set2Go Mobile Server → http://0.0.0.0:{args.port}/")
    print("Connect your iPhone to the same WiFi and open the URL above.")
    app.run(host="0.0.0.0", port=args.port, threaded=True)
