# Koryo front-view calibration baseline

Review date: 2026-08-20
Source: `품새_고려.mp4` (SHA-256 `662f53451ce612937848ad36f099084f71df32c36e0f234fd3a38796a5d903a8`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 5.363 s |
| Maximum boundary error | 11.900 s |
| Internal boundaries within 0.3 s | 0 / 30 |

The automatic analysis split the long ready hold before the first official movement at 9.4 seconds into several movement scenes. It then kept the official movement labels shifted and ended the performance at 46.3 seconds, although the slow covered hammer-fist sequence continues to 49.2 seconds and the final four movements run from 50.6 to 56.7 seconds.

The source contains composited front/rear demonstrators from 49.3 to 56.9 seconds. Timing remains reviewable, but that interval is not suitable for single-subject pose-score training. The calibration record therefore uses a 0.65 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.39.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
