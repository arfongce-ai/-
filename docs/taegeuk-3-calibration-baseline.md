# Taegeuk 3 front-view calibration baseline

Review date: 2026-08-14  
Source: `품새_태극3장.mp4` (SHA-256 `7115a55b4cb91dc059baa8854a81334d891ec2e24a3e2e9e0ae5af159830b337`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 0.711 s |
| Maximum boundary error | 1.690 s |
| Internal boundaries within 0.3 s | 7 / 20 |

The largest errors occur after compound kick-and-double-punch movements and in the late consecutive sequence. Several automatic boundaries cut into the current compound movement instead of waiting for the next official movement to begin.

At 29.75 seconds the source changes to a composited view containing synchronized front and rear demonstrators. The timing remains reviewable, but this interval is not suitable for single-subject pose-score training. Its calibration record therefore uses a 0.65 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.39.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
