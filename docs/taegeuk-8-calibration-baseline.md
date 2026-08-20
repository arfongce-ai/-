# Taegeuk 8 front-view calibration baseline

Review date: 2026-08-20
Source: `품새_태극8장.mp4` (SHA-256 `6b3823c89a8c4570fac5cb83e882fe38e2e3e2b42c3c31b91382145e921f2342`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 3.111 s |
| Maximum boundary error | 6.600 s |
| Internal boundaries within 0.3 s | 0 / 27 |

The automatic analysis missed the ready transition at 5.8 seconds and the first official movement at 9.3 seconds. It began the sequence at 13.2 seconds, after the jumping-front-kick combination had already started, so the early and middle boundaries were shifted roughly 5–7 seconds late.

The source contains composited front/rear demonstrators from 42.3 to 46.7 seconds. Timing remains reviewable, but that interval is not suitable for single-subject pose-score training. The calibration record therefore uses a 0.75 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.45.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
