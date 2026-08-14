# Taegeuk 1 front-view calibration baseline

Review date: 2026-08-14  
Source: `품새_태극1장.mp4` (SHA-256 `57620590af96eb0e626e758034c179687b6b2c0d2fab807bd58095154f68c798`)

## Review result

The app produced 20 boundaries for the ready segment plus 18 official movements. The full performance interval was reviewed at 10 fps, with the final transitions checked at 20 fps. The movement order was cross-checked against the Taegeuk 1 textbook reference, and stance, block, punch, and deduction criteria were checked against the supplied official rules.

| Metric | Current automatic analysis |
| --- | ---: |
| Mean absolute boundary error | 0.591 s |
| Maximum boundary error | 1.595 s |
| Internal boundaries within 0.3 s | 7 / 18 |

The largest confirmed issue is the movement 5 to movement 6 transition: the automatic boundary is approximately 0.665 seconds late.

## Promotion decision

This record is `gpt_reviewed`, but expert approval is still pending. Its effective weight is 0.6. The collective calibration profile requires at least three independent sessions and 2.5 effective samples, so this single review is intentionally not applied to live analysis.

The next valid comparison is not “this video after fitting to itself.” It must use another Taegeuk 1 front-view performance that was not used to create this reference. That holdout analysis will measure whether the calibration reduces error without overfitting.

## Next evidence required

1. Expert approval or correction of the 20 reviewed boundaries.
2. At least two more independently filmed Taegeuk 1 front-view sessions.
3. A holdout video for before/after measurement.
4. Promotion only if mean error improves and no movement boundary regresses beyond the safety threshold.
