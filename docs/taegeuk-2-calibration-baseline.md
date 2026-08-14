# Taegeuk 2 front-view calibration baseline

Review date: 2026-08-14  
Source: `품새_태극2장.mp4` (SHA-256 `115dea6c97b1742baa689e8e9b4c91cbcfddb7e456689fcbce6b828e816f8ab5`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 0.449 s |
| Maximum boundary error | 1.727 s |
| Internal boundaries within 0.3 s | 10 / 18 |

The largest error occurs around movements 6–8. The detector placed three consecutive boundaries about 1.03, 0.89, and 1.73 seconds late, obscuring the separate inside-block, low-block, and kick-punch transitions.

At 30.4 seconds the source changes to a composited view containing synchronized front and rear demonstrators. The timing remains reviewable, but this interval is not suitable for single-subject pose-score training. Its calibration record therefore uses a 0.65 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.39.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
