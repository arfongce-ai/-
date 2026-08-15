# Taegeuk 4 front-view calibration baseline

Review date: 2026-08-15  
Source: `품새_태극4장.mp4` (SHA-256 `0b32ff1f1e9e05dd4cd92e776bc6752354a85ef52eaa021228a4f8ca1b53b408`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 1.136 s |
| Maximum boundary error | 2.533 s |
| Internal boundaries within 0.3 s | 4 / 20 |

The largest errors occur around compound kick-and-block movements and the late consecutive punching sequence. Several automatic boundaries cut into the current compound movement instead of waiting for the next official movement to begin.

At 27.4 seconds the source changes to a composited view containing synchronized front and rear demonstrators. The timing remains reviewable, but this interval is not suitable for single-subject pose-score training. Its calibration record therefore uses a 0.65 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.39.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
