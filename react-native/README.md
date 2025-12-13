# Clinical Canvas - React Native

React Native implementation of Patient List and Patient Details screens.

## Features

- **Patient List Screen**
  - Search patients by name, MRN, or diagnosis
  - Filter by stage, pathway, and urgent status
  - Tab switching between "All Patients" and "My Patients" (pinned)
  - Pull to refresh
  - Stage-based color coding
  - Days since surgery badge

- **Patient Detail Screen**
  - Comprehensive patient information display
  - Vitals display with icons
  - Comorbidities badges
  - Urgent patient highlighting
  - Emergency contact information
  - Quick action buttons

## Project Structure

```
react-native/
├── App.tsx                    # Main entry point
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── src/
    ├── components/            # Reusable UI components
    │   ├── Header.tsx
    │   ├── PatientCard.tsx
    │   ├── StageChip.tsx
    │   ├── FilterChip.tsx
    │   └── index.ts
    ├── screens/               # Screen components
    │   ├── PatientListScreen.tsx
    │   ├── PatientDetailScreen.tsx
    │   └── index.ts
    ├── navigation/            # Navigation setup
    │   ├── RootNavigator.tsx
    │   ├── types.ts
    │   └── index.ts
    ├── services/              # API and services
    │   └── api.ts
    ├── types/                 # TypeScript types
    │   └── patient.ts
    ├── hooks/                 # Custom hooks
    └── utils/                 # Utility functions
```

## Prerequisites

Before installing, make sure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** installed

### For Android:
- **Android Studio** - [Download](https://developer.android.com/studio)
- **Java Development Kit (JDK)** 17 or higher
- Android SDK (installed via Android Studio)
- USB debugging enabled on your phone

### For iOS (macOS only):
- **Xcode** (from Mac App Store)
- **CocoaPods** (`sudo gem install cocoapods`)
- Apple Developer account (free for testing on your device)

---

## Installation on Your Phone

### Step 1: Clone and Install Dependencies

```bash
# Navigate to the react-native folder
cd react-native

# Install dependencies
npm install
```

---

## Android Phone Installation

### Option A: Using USB Cable (Recommended)

1. **Enable Developer Options on your Android phone:**
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times
   - You'll see "Developer mode enabled"

2. **Enable USB Debugging:**
   - Go to **Settings > Developer Options**
   - Enable **USB Debugging**

3. **Connect your phone via USB cable**

4. **Verify device is connected:**
   ```bash
   adb devices
   ```
   You should see your device listed.

5. **Run the app:**
   ```bash
   npx react-native run-android
   ```
   The app will be installed and launched on your phone!

### Option B: Build APK and Install Manually

1. **Generate a release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Find the APK file:**
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

3. **Transfer to your phone:**
   - Send via email, Google Drive, or USB
   - On your phone, open the APK file
   - Allow "Install from unknown sources" if prompted
   - Install the app

### Option C: Using Expo Go (Easiest for Testing)

If you convert this to an Expo project:

1. Install Expo CLI: `npm install -g expo-cli`
2. Install Expo Go app from Play Store on your phone
3. Run: `expo start`
4. Scan the QR code with Expo Go app

---

## iPhone Installation

### Option A: Using Xcode (macOS Required)

1. **Connect your iPhone via USB cable**

2. **Open iOS project in Xcode:**
   ```bash
   cd ios
   pod install
   open ClinicalCanvas.xcworkspace
   ```

3. **Configure signing:**
   - In Xcode, select your project in the navigator
   - Go to **Signing & Capabilities** tab
   - Select your **Team** (Apple ID)
   - Xcode will create a provisioning profile

4. **Trust the developer on your iPhone:**
   - Go to **Settings > General > VPN & Device Management**
   - Tap your developer certificate
   - Tap **Trust**

5. **Select your iPhone as the build target in Xcode**

6. **Click the Play button** or press `Cmd + R`

The app will install and run on your iPhone!

### Option B: Using Command Line

```bash
# Install pods
cd ios && pod install && cd ..

# Run on connected iPhone
npx react-native run-ios --device "Your iPhone Name"
```

### Option C: TestFlight (For Distribution)

1. Create an app in App Store Connect
2. Archive the app in Xcode
3. Upload to TestFlight
4. Install via TestFlight app on your phone

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android (with device connected)
npx react-native run-android

# Run on iOS (macOS only, with device connected)
npx react-native run-ios --device

# Build Android APK
cd android && ./gradlew assembleRelease

# Build iOS (via Xcode)
cd ios && pod install && open *.xcworkspace
```

---

## Troubleshooting

### Android Issues

**"No connected devices"**
```bash
# Check if device is connected
adb devices

# Restart ADB server
adb kill-server
adb start-server
```

**Build fails**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### iOS Issues

**Pod install fails**
```bash
cd ios
pod deintegrate
pod install
```

**Signing issues**
- Make sure you have a valid Apple ID
- In Xcode: Product > Clean Build Folder
- Re-select your development team

### General Issues

**Metro bundler issues**
```bash
# Clear cache and restart
npx react-native start --reset-cache
```

**Module not found**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## Dependencies

- `@react-navigation/native` - Navigation library
- `@react-navigation/native-stack` - Native stack navigator
- `react-native-screens` - Native screen containers
- `react-native-safe-area-context` - Safe area handling

## Customization

### API Integration

Replace the mock API in `src/services/api.ts` with your actual backend:

```typescript
export const patientApi = {
  async getPatients(): Promise<Patient[]> {
    const response = await fetch(`${API_BASE_URL}/patients`);
    return response.json();
  },
  // ...
};
```

### Styling

The app uses a consistent color scheme:
- Primary: `#3B82F6` (blue)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Error: `#EF4444` (red)
- Background: `#F3F4F6` (gray)

## Stage Colors

| Stage | Color |
|-------|-------|
| Onboarding | Indigo |
| Pre-Op | Yellow |
| OT (Intraop) | Red |
| Post-Op | Orange |
| Discharge Init | Green |
| Discharge | Green |
