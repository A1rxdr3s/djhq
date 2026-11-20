# Product plan: waveform colour styles (requirement added 2026-10-29; labels updated 2026-10-29)

Status: PLAN. BLUE and RGB payloads are produced by the export pipeline (hardware-tested on one CDJ-2000NXS2 only, see the table below); 3Band is NOT implemented. Nothing in this document changes any accepted waveform payload.

## Requirement (from the user)
Support the waveform colour styles offered by the user's rekordbox setup: THREE labels, see below (originally two were requested; the third, 3Band, is in scope as PENDING). Priority order: (1) detailed-waveform shape, transient definition and dynamics; (2) support BOTH styles from SHARED analysis;
(3) document device-specific compatibility. The app's own preview and the CDJ's display settings are separate concerns.

## rekordbox style labels (user screenshot, Spanish UI "Color de la forma de onda")
Exact labels, in order: **BLUE**, **RGB**, **3Band**. The screenshot shows RGB selected. It identifies the rekordbox SETTING only: it does NOT establish which waveform mode the CDJ displayed in any earlier hardware test, and it does not by itself change any accepted payload. The user's live rekordbox is still not accessed; no claim about what each label writes to disk beyond what the sources below state (per the published docs: BLUE -> DAT/EXT blue sections, RGB -> EXT colour sections, 3Band -> .2EX).

### Support per style and device (status as of 2026-10-29)
| style (rekordbox label) | sections written by our exporter | status | CDJ-2000NXS2 fw 1.87 | CDJ-3000 / 3000X | older players |
|---|---|---|---|---|---|
| BLUE | PWAV, PWV2 (DAT); PWV3 (EXT) | implemented; detail rule user-reported visually accepted (v13, tested tracks) | tested with user-reported visual acceptance; whether the player drew PWV3 or PWV5 in those tests is NOT established | untested, no claim | expected to rely on this style (docs); untested here |
| RGB | PWV5, PWV4 (EXT) | implemented; PWV5 same detail source as v13; PWV4 bytes 3-5: the v17 rule (current default) is user-reported visually accepted on the tested tracks/player (stick hashes verified, better than v16; minor height limitation); v16 remains the earlier approved reference; PWV4 bytes 0-2 are an old regression fit | PWV4 shown drawn in the v15 probe on the tested player/configuration; not claimed as the only section involved | untested, no claim | not applicable (docs: Nexus 2 line) |
| 3Band | none (PWV6, PWV7, PWVC, PVDI in a new .2EX are NOT written) | **PENDING implementation AND hardware validation**; needs its own measurement round against official .2EX payloads | not applicable / unknown (the docs tie it to the CDJ-3000 line; whether the NXS2 reads .2EX is not established) | untested; no compatibility claim | not applicable |
Selecting a style in rekordbox and the CDJ's own display option are separate; a preview in our app is also separate from both.

## What is VERIFIED (sources read in this project, not assumed)
| format style (public names) | overview section | detail section | file | device generation (per Deep Symmetry docs) |
|---|---|---|---|---|
| BLUE / monochrome | PWAV (400 cols, 5-bit height + 3-bit whiteness), PWV2 (100, 4-bit) | PWV3 (150/s, 1 byte: whiteness<<5 \| height) | DAT, EXT | original Nexus; kept for older players |
| RGB / colour | PWV4 (1200 cols x 6 bytes) | PWV5 (150/s, 2 bytes: R3 G3 B3 height5) | EXT | Nexus 2 line (CDJ-2000NXS2) |
| THREE_BAND | PWV6 (1200 cols x 3 bytes) | PWV7 (150/s x 3 bytes) | **.2EX** (second extended file) | CDJ-3000 line |
- Beat Link states which file each style is read from: "ANLZ for blue, EXT for RGB, and 2EX for 3-band". A style is therefore a SET of sections (overview + detail) in a particular file, not one export format.
- The preserved official export contains, per track: .DAT (PPTH PVBR PQTZ PWAV PWV2 PCOB x2), .EXT (PPTH PWV3 PCOB x2 PCO2 x2 [PQT2] PWV5 PWV4 PSSI), .2EX (PPTH PWV7 PWV6 PWVC PVDI). OUR exports have DAT + EXT only: no .2EX and none of PWV6, PWV7, PWVC, PVDI.
- 3-band entries: one byte each for MID, HIGH, LOW in that order; drawn stacked (lows dark blue, mids amber, highs white). The docs say detail scaling "seems to be non-linear" and that no approach "perfectly matches" rekordbox: the 3-band level mapping is an OPEN problem.
- Observed official .2EX first track: PWV7 header 24 B (entry size 3, entries 57143, `00 96 00 00`), PWV6 header 20 B (entry size 3, 1200 columns), PWVC body 6 B, PVDI header 24 B with empty body.

## NOT verified / must be supplied
- ~~The exact UI names of the user's styles~~ RESOLVED by the screenshot: BLUE, RGB, 3Band. STILL UNVERIFIED: the exact mapping of each label to on-disk sections in the user's rekordbox version (taken from the public docs only, not from the user's database).
- **Whether a UI palette switch corresponds to different sections or only different colour values inside one section** (e.g. two palettes within RGB would change PWV5/PWV4 values only). Do not assume a palette switch maps to one export format.
- Whether the CDJ-2000NXS2 renders PWV3 (blue mode) or PWV5 (colour mode) in the user's setting (photos suggest blue; the player's own waveform setting is a separate, unconfirmed variable).
- CDJ-3000/3000X behaviour with our files: untested; no compatibility is claimed.

## Plan (order of work; each step needs its own controlled hardware test, one change at a time)
1. Style names: DONE (BLUE, RGB, 3Band). Still open: for each, whether it needs different SECTIONS or only different VALUES (the docs say different sections: DAT/EXT blue, EXT colour, .2EX three-band).
2. Detail shape/transients/dynamics first (DONE for BLUE/RGB detail, integrated in the normal pipeline; user-reported visual acceptance, not byte equivalence): height rule round(31*(peak/global_peak)^2) (measured MAE 0.25-0.28 vs official PWV3 on 3 tracks), PWV3 whiteness from the low-band share, PWV5 colour from band shares. Then decide on evidence.
3. Shared analysis layer: ONE per-frame band analysis (low/mid/high peaks and mono peak at exact 150 fps frames, plus 1200-column overview measures) computed once per track and cached; each style is a different ENCODER over it:
   - BLUE encoder -> PWAV, PWV2, PWV3;  RGB encoder -> PWV4, PWV5;  THREE_BAND encoder -> PWV6, PWV7 (+ PWVC, PVDI, PPTH in a new .2EX writer).
   This keeps analysis cost independent of the number of styles and lets styles be added without re-analysing.
4. 3Band is PENDING and not part of the current consolidation. It is the least understood: needs its own measurement round against the official .2EX payloads (levels per byte, scaling, non-linearity) BEFORE any claim; the existing band split (<200, 200-2000, >2000 Hz) is an assumption to re-examine, since 3-band bytes are mid/high/low heights.
5. Device compatibility matrix to document and test per style: CDJ-2000NXS2 (BLUE+RGB), CDJ-3000/3000X (3-band; needs .2EX; OneLibrary question separate), older players (BLUE only). Writing extra files must not break players that ignore them (test on the NXS2 first).
6. App preview vs CDJ display: the app preview renders from the shared analysis in the app's own palette; the CDJ's own display options (colour/blue mode, zoom) are device settings. Keep them as separate concerns in code and in tests; a preview must never be used as evidence about the CDJ.
7. Reproducibility: each style encoder gets a measured-rule record (what was measured, on which tracks, MAE) like the height rule, and a hardware result before it becomes a default.

## Guardrails
No payload copied from the official reference; official data is used only to measure and compare. No claim about CDJ-3000/3000X until tested. The validated baseline desktop_v12_full stays immutable. 3Band stays untouched until its own step is requested.

## Future refinement (tracked)
- Overview height: the accepted v17 PWV4 could use slightly more height (user feedback). Do not change scaling until a controlled one-change test is requested; candidate directions to evaluate locally first: byte-5 level mapping, the byte 4/5 exponent, or the strongest-band normalisation reference. Measure against the aligned quiet/loud ratios, not whole-track averages.

## Roadmap status (2026-10-29, after the v18 hardware regression)
- DONE: BLUE-looking detail + overview pipeline, consolidated in the normal export (desktop_v18_consolidated = the current stable desktop baseline, frozen in frozen/desktop_v18_consolidated/). Hardware: CDJ-2000NXS2, ten tracks, the checks performed passed; all waveforms looked blue (this does not identify the player's waveform mode).
- DEFERRED (future work, user decision 2026-10-29: do not start now): (1) RGB investigation: why waveforms looked blue and whether the player draws PWV5/PWV4 colour; (2) 3Band (PWV6/PWV7/PWVC/PVDI in a .2EX writer) = PENDING implementation and hardware validation; (3) slightly more overview height (see Future refinement).
- Partial, unfinished RGB findings (file measurements only, NO experiment run, nothing inferred about the player): our PWV5 contains real colour variation similar in spread to the official one (distinct RGB triples 149-165 vs 115-145; no R==G==B columns); our PWV3/PWV5/PWV4 section headers are byte-identical to the official ones; our files lack the official extra sections (DAT: PVBR; EXT: PCOB x2, PCO2 x2, PQT2, PSSI; and the whole .2EX) and our PMAI file-header bytes 12-27 are zeros where the official has `00000001 00010000 00010000 00000000` (see HANDOFF.md); primary documentation read (Deep Symmetry) does not say how a player chooses blue vs colour; the manufacturer manual could not be fetched (404/redirect; web search blocked by policy). The user's observation that appearance follows how the library is exported is unverified.
- CDJ-3000/3000X: untested; no compatibility claim.

## Milestone closure: desktop export stabilization (2026-10-29)
CLOSED. `desktop_v18_consolidated` (frozen in `frozen/desktop_v18_consolidated/`) is the current hardware-validated stable baseline for the CDJ-2000NXS2, scoped to the ten-track regression and the checks actually performed.
- Working (checks performed): playlists, artist/title display, navigation (INFO/ARTIST browse), playback, artwork, overview and detailed waveforms (all looked blue), BPM/grid checks on the tracks checked.
- Deferred (future work, not blockers): RGB and 3Band (3Band = pending implementation and hardware validation), slight overview-height refinement, broader library testing, remaining grid validation, CDJ-3000/3000X compatibility (untested; no claim).
- Known limitations preserved, not blockers: waveform rules and band edges/exponents come from three development tracks with no independent validation; PWV4 bytes 0-2 are an old regression fit; the player's waveform mode is not established; bar origin is a model prediction (unstable on four tracks); Alex Preston uses the fallback grid; grid accuracy not checked on six tracks.
- Next phase: the musical analysis engine (see HANDOFF.md). The waveform styles plan above is unchanged by it.
