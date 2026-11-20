from pathlib import Path

from set2go.export import TrackSpec, export_library


def test_real_export_analysis_boundaries(tmp_path):
    sources = Path(__file__).parent / 'fixtures'
    files = [sources / f'track_{letter}.wav' for letter in 'abc']
    events = []
    result = export_library({'test': [TrackSpec(p) for p in files]}, tmp_path / 'export',
                            analyse=True, rhythm_backend="fourier", on_unresolved="exclude", progress_callback=lambda event, track: events.append((event, track)))
    assert events == [
        ('track_started', 'track_a.wav'), ('track_completed', 'track_a.wav'),
        ('track_started', 'track_b.wav'), ('track_completed', 'track_b.wav'),
        ('track_started', 'track_c.wav'), ('track_completed', 'track_c.wav'),
        ('batch_finalizing', None),
    ]
    assert result.engine_report is not None
