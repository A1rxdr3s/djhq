from set2go.analysis import review as RV


def test_review_reasons_name_signals_and_limits_without_probabilities():
    r = RV.review_reasons({"phase_status": "model_consistent", "downbeat_majority_share": 0.78, "tempo_disagree_bpm": 0.0}, None)
    assert r[0]["area"] == "downbeat" and r[0]["value"] == 0.78 and r[0]["limit"] == RV.LIMITS["downbeat_majority_share_min"]
    assert not any("probab" in str(x).lower() for x in r)


def test_inconsistent_beats_and_key_disagreement_flagged():
    r = RV.review_reasons({"phase_status": "model_inconsistent", "reasons": ["lost beat"]},
                          {"estimators": {"a": {"camelot": "7A", "parallel_gap": 0.2}, "b": {"camelot": "8A", "parallel_gap": 0.01}},
                           "tag": {"camelot": "1A"}})
    reasons = {(x["area"], x["reason"]) for x in r}
    assert ("beats", "model beats inconsistent with a constant grid") in reasons and ("key", "independent estimators disagree") in reasons
    assert any("nearly tied" in x["reason"] for x in r) and any("embedded tag" in x["reason"] for x in r)


def test_clean_result_has_no_reasons():
    assert RV.review_reasons({"phase_status": "model_consistent", "downbeat_majority_share": 0.99, "tempo_disagree_bpm": 0.0},
                             {"estimators": {"a": {"camelot": "7A", "parallel_gap": 0.3}}, "tag": {"camelot": "7A"}}) == []
