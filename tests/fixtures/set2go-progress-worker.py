#!/usr/bin/env python3
import json
import os
import sys
import time

job_id = sys.argv[1]

def emit(kind, track=None):
    os.write(3, (json.dumps({'jobId': job_id, 'type': kind, 'trackId': track}) + '\n').encode())

emit('job_started')
for track in ('track-1.wav', 'track-2.wav', 'track-3.wav'):
    emit('track_started', track)
    time.sleep(0.3)
    emit('track_failed' if track == 'track-2.wav' else 'track_completed', track)
    time.sleep(0.5)
emit('batch_finalizing')
time.sleep(1)
