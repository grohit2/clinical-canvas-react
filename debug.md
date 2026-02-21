# Clinical Canvas Mobile Incident Report (GeoTag Regression Focus)

Last updated (UTC): 2026-02-21T23:47:39Z
Owner: Codex + Rohit (device validation)
Repo: `/Users/rohitgarlapati/Documents/GitHub/clinical-canvas-react`

## 1) Executive Summary

This started after GeoTag rollout and is still **open**.

Resolved:
1. Metro 500 / missing `react-native-get-random-values` fixed.
2. `crypto.getRandomValues` runtime issue fixed at startup import.
3. Android build path works (`Hermes + New Arch`) and installs.

Still failing:
1. Native `SIGSEGV` persists in Patients flow.
2. Crash signature is Hermes native (`libhermes.so`) and now appears in both:
- `hades` thread (GC)
- `mqt_v_js` thread (JS queue)
3. GeoTag acceptance matrix has not been fully re-run after latest mitigations.

Bottom line:
1. This is not a plain JS bug.
2. It is a native/runtime stability issue, likely triggered by module interaction under Hermes/New Arch after GeoTag-era dependency/UI changes.

## 2) Latest Status Matrix

| ID | Issue | Status | Severity | Notes |
|---|---|---|---|---|
| I-01 | Native crash on Patients screen (mount/tap) | OPEN | Critical | Reproduces with breadcrumbs and crash buffer |
| I-02 | GeoTag capture/gallery visibility consistency | OPEN | High | Hardening added; full matrix pending |
| I-03 | Metro bundle 500 | RESOLVED | High | Dependency + cache reset done |
| I-04 | `crypto.getRandomValues` unsupported | RESOLVED | High | Entry import added |
| I-05 | Android build blocker (`ReactAndroid::jsctooling`) | RESOLVED | Blocker | Build now succeeds on Hermes/New Arch |

## 3) Crash Evidence (Concrete, Dated)

From `adb logcat -b crash -d` on 2026-02-21:

1. Hermes GC-thread crash:
- `02-21 18:30:29 ... Fatal signal 11 ... tid ... (hades) ... com.clinicalcanvas.app`
- `Cmdline: com.clinicalcanvas.app`
- Native frames in `libhermes.so`

2. Later Hermes JS-thread crashes:
- `02-21 18:43:17 ... Fatal signal 11 ... tid ... (mqt_v_js) ... com.clinicalcanvas.app`
- `02-21 18:43:23 ... Fatal signal 11 ... tid ... (mqt_v_js) ... com.clinicalcanvas.app`
- `02-21 18:43:32 ... Fatal signal 11 ... tid ... (mqt_v_js) ... com.clinicalcanvas.app`
- Native frames still in `libhermes.so`

3. Additional noise:
- `host.exp.exponent` also showed hades crashes around 18:31-18:34.
- Treat Expo host-process crashes as noise unless they align with app-process breadcrumbs.

Interpretation:
1. Signature widened from only `hades` to also `mqt_v_js`, but all paths still converge in Hermes native frames.
2. This keeps root cause in native/runtime boundaries (JSI/animated/native view lifecycle), not business logic.

## 4) What Changed Around GeoTag (Most Relevant Delta)

GeoTag-related additions and dependencies now active in this codebase:

1. Permissions/config:
- `apps/mobile/app.json` (`expo-location` plugin + permission text)
- `apps/mobile/android/app/src/main/AndroidManifest.xml` (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`)

2. GeoTag capture pipeline:
- `src/domains/patient-documents/mobile/geotag/geoTagPhoto.ts`
- `src/domains/patient-documents/mobile/geotag/burnGeoMetadata.ts` (`react-native-image-marker`)
- `src/domains/patient-documents/mobile/hooks/usePhotoCapture.ts`

3. Documents data model changed for geo fields:
- `src/domains/patient-documents/mobile/offline/db.ts` (`geo_lat`, `geo_lng`, `geo_address`, `geo_captured_at`)
- `src/domains/patient-documents/mobile/offline/sync.ts` (geo payload/caption serialization)
- `src/domains/patient-documents/core/mapFromApi.ts` (geo parse path)

4. UI/render surface added around docs/activity:
- `src/domains/patient-documents/mobile/screens/DocumentsRootScreen.native.tsx`
- `src/domains/patient-documents/mobile/screens/DocumentsFolderScreen.native.tsx`
- `src/domains/patient-documents/mobile/components/GalleryGrid.native.tsx`
- `src/domains/patient-documents/mobile/components/YearCardsStrip.native.tsx`
- `src/domains/patient-documents/mobile/hooks/useScrollScrubber.ts` (Reanimated usage)

5. Runtime dependencies that matter for this crash class:
- `react-native-reanimated`
- `react-native-worklets` (requires New Architecture)
- `react-native-screens`
- `react-native-svg`
- `react-native-image-marker`
- `expo-location`

## 5) Backend Validation (Patient With Documents)

Live endpoint checks completed against current API base:
`https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws`

Verified patient used in breadcrumbs has documents:
1. Patient ID: `01KDS73Q4TB2ZW51HDRM4RNZDD`
2. Name: `Malayadri V`
3. Latest MRN: `20250636747`
4. Document count: `15`

Other high-document patients found:
1. `01K9KC1620MB625PFTQAMER5KZ` (`BUJJAMMA B`) count `32`
2. `01KA35A3NNFFYKJ9VFQXK480J9` (`Sk GHOUSE BASHA`) count `23`
3. `01KA5D14PXTNCQJ30RCVHDWTRF` (`MEERAMBI`) count `20`

## 6) Existing Mitigations Already in Code

1. `apps/mobile/index.js`
- Startup polyfill import.
- Diagnostics install.
- Android default disables native screens/freeze unless `EXPO_PUBLIC_ENABLE_NATIVE_SCREENS=1`.

2. `apps/mobile/app/_layout.tsx`
- Android default disables stack animations unless `EXPO_PUBLIC_DISABLE_SCREEN_ANIMATIONS=0`.

3. `apps/mobile/app/(tabs)/patients.tsx`
- Android default minimal Patients screen unless `EXPO_PUBLIC_PATIENTS_SCREEN_VARIANT=full`.
- Breadcrumbs on mount/list/tap.
- Direct route push to `/patient/:id`.

4. `src/domains/patient-documents/mobile/debug/breadcrumbs.ts`
- Unhandled rejection listener always attached.
- keep-awake rejection suppression improved.

5. Storage isolation
- `EXPO_PUBLIC_PINNED_STORAGE_BACKEND=memory` still crashes, so MMKV is not the primary trigger.

## 7) Related Files To Touch For Final Fix

Crash/runtime control:
1. `apps/mobile/index.js`
2. `apps/mobile/app/_layout.tsx`
3. `apps/mobile/app/(tabs)/patients.tsx`
4. `src/domains/patient-documents/mobile/debug/breadcrumbs.ts`
5. `apps/mobile/android/gradle.properties`
6. `apps/mobile/package.json`

GeoTag path:
1. `src/domains/patient-documents/mobile/geotag/geoTagPhoto.ts`
2. `src/domains/patient-documents/mobile/geotag/burnGeoMetadata.ts`
3. `src/domains/patient-documents/mobile/hooks/usePhotoCapture.ts`
4. `src/domains/patient-documents/mobile/hooks/useDocumentSync.ts`
5. `src/domains/patient-documents/mobile/offline/db.ts`
6. `src/domains/patient-documents/mobile/offline/sync.ts`
7. `src/domains/patient-documents/core/mapFromApi.ts`
8. `src/domains/patient-documents/mobile/components/DocumentCard.native.tsx`
9. `src/domains/patient-documents/mobile/screens/DocumentsRootScreen.native.tsx`
10. `src/domains/patient-documents/mobile/screens/DocumentsFolderScreen.native.tsx`

Route/API boundary:
1. `apps/mobile/app/patient/[id]/index.tsx`
2. `apps/mobile/app/patient/[id]/documents/index.tsx`
3. `apps/mobile/app/patient/[id]/documents/[category].tsx`
4. `src/domains/patient-documents/api/documentsApi.ts`
5. `apps/mobile/src/lib/api.ts`

## 8) Prioritized Fix Plan (Do In Order)

### Phase A: Isolate runtime trigger (no code churn)
1. Run with safest toggles:
```bash
EXPO_PUBLIC_DEBUG_BREADCRUMBS=1 \
EXPO_PUBLIC_PINNED_STORAGE_BACKEND=memory \
EXPO_PUBLIC_PATIENTS_SCREEN_VARIANT=minimal \
EXPO_PUBLIC_DISABLE_SCREEN_ANIMATIONS=1 \
EXPO_PUBLIC_ENABLE_NATIVE_SCREENS=0
```
2. Repro matrix:
- 20 taps on a patient card
- 5-minute idle on Patients
- 5 deep-link launches to `clinical-canvas://patients`
3. Capture crash buffer each run.

### Phase B: GeoTag feature kill-switches (must add next)
Add explicit env flags and gate these paths:
1. `EXPO_PUBLIC_ENABLE_GEO_TAG=0|1` for `resolveGeoTagContext`.
2. `EXPO_PUBLIC_ENABLE_GEO_BURN=0|1` for `burnGeoMetadataOnImage`.
3. `EXPO_PUBLIC_ENABLE_DOCS_SCROLL_SCRUBBER=0|1` for Reanimated scrubber.
4. `EXPO_PUBLIC_DOCS_ICON_MODE=svg|text` to bypass SVG pressure during diagnostics.

Why:
1. You need one-variable toggles to bisect without editing source each time.
2. This is the fastest path to a stable production profile.

### Phase C: If still crashing
1. Pin/upgrade matrix for:
- `react-native-reanimated`
- `react-native-worklets`
- `react-native-screens`
- `react-native-svg`
2. Keep `newArchEnabled=true` (worklets assertion blocks disabling New Arch).
3. JSC fallback currently not viable in this dependency state.

## 9) Runbook Commands

1. Start Metro:
```bash
cd /Users/rohitgarlapati/Documents/GitHub/clinical-canvas-react/apps/mobile
EXPO_PUBLIC_DEBUG_BREADCRUMBS=1 \
EXPO_PUBLIC_PINNED_STORAGE_BACKEND=memory \
EXPO_PUBLIC_PATIENTS_SCREEN_VARIANT=minimal \
EXPO_PUBLIC_DISABLE_SCREEN_ANIMATIONS=1 \
EXPO_PUBLIC_ENABLE_NATIVE_SCREENS=0 \
pnpm start -- --clear --port 8081
```

2. Device tunnel:
```bash
/Users/rohitgarlapati/Library/Android/sdk/platform-tools/adb reverse tcp:8081 tcp:8081
```

3. Build/install:
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
PATH=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin:$PATH \
pnpm --filter clinical-canvas-mobile android
```

4. Logs:
```bash
/Users/rohitgarlapati/Library/Android/sdk/platform-tools/adb logcat -c
/Users/rohitgarlapati/Library/Android/sdk/platform-tools/adb logcat | rg "cc-debug|ReactNativeJS|SIGSEGV|Fatal signal|hades|mqt_v_js|com.clinicalcanvas.app"
/Users/rohitgarlapati/Library/Android/sdk/platform-tools/adb logcat -b crash -d | rg "Fatal signal|hades|mqt_v_js|Cmdline: com.clinicalcanvas.app"
```

5. Backend endpoint checks:
```bash
curl -sS 'https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws/patients' | head
curl -sS 'https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws/patients/01KDS73Q4TB2ZW51HDRM4RNZDD/documents'
```

## 10) Definition Of Done

Fix is complete only when all are true:
1. 20/20 patient taps no native crash.
2. 5-minute idle on Patients no native crash.
3. 5 deep-link launches no native crash.
4. GeoTag camera capture + gallery import persists and appears in Activity.
5. No fatal Hermes native signal in `adb logcat -b crash -d` for app process.
