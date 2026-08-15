# Taegeuk 5 front-view calibration baseline

Review date: 2026-08-15  
Source: `품새_태극5장.mp4` (SHA-256 `aad76f3a63c3a84a25dfae440829e47496256b89a7233ac6022c6922a1842ea4`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 0.914 s |
| Maximum boundary error | 2.427 s |
| Internal boundaries within 0.3 s | 8 / 20 |

The largest errors occur around the consecutive front-kick combinations and the late block, side-kick, and elbow-strike sequence. Some automatic boundaries cut a compound movement early, while several late boundaries start the next official movement too late.

The source contains composited front/rear demonstrators at 25.8–30.3 seconds and again after 38.2 seconds. Timing remains reviewable, but these intervals are not suitable for single-subject pose-score training. The calibration record therefore uses a 0.65 subject-tracking confidence multiplier, reducing the GPT review weight from 0.6 to 0.39.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
