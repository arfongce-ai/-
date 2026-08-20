# Taegeuk 6 front-view calibration baseline

Review date: 2026-08-20  
Source: `품새_태극6장.mp4` (SHA-256 `a004df027f1c976adc66949b0fc61fdc877c02a6a6155ccce5d4da5d193c88dc`)

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 1.428 s |
| Maximum boundary error | 7.166 s |
| Internal boundaries within 0.3 s | 7 / 19 |

The dominant error is the transition from the long hold after the low opening block to the next forward-stance twisting knife-hand block. The automatic analysis places that boundary about 7.17 seconds too early. Several early compound kick/block transitions and the late front-kick sequence are also split too early.

The source contains one demonstrator throughout the analyzed interval and achieved a 100% pose-detection rate. It is suitable for both timing review and single-subject pose-score training, so the calibration record keeps the full GPT review weight of 0.6.

This single review is not promoted to a live collective profile. Independent sessions and an expert or additional trusted anchor are still required.
