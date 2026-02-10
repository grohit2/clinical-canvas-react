# Clinical Canvas Mobile

React Native mobile app built with Expo, sharing core logic with the web app.

## Tech Stack

- **Expo SDK 52** with Expo Router
- **NativeWind** (Tailwind CSS for React Native)
- **TanStack Query** for data fetching
- **MMKV** for fast local storage
- **Lucide React Native** for icons

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   └── (tabs)/            # Tab navigator
│       ├── _layout.tsx
│       ├── index.tsx      # Dashboard
│       ├── patients.tsx   # Patient list
│       ├── tasks.tsx      # Tasks
│       └── profile.tsx    # Profile
├── src/
│   ├── components/        # UI components
│   │   ├── ui/           # Base components (Card, Badge, Button)
│   │   └── patient/      # Patient-specific components
│   ├── hooks/            # React hooks
│   └── lib/              # Utilities
├── assets/               # Images, fonts
└── global.css           # Tailwind imports
```

## Shared Code

Core logic is shared from `packages/core`:

- **Types**: Patient, Task, Note, etc.
- **API Client**: Platform-agnostic fetch wrapper
- **Patient Utilities**: enrichPatient, filterPatients, stage helpers
- **Storage Interface**: Adapter pattern for localStorage/MMKV

## Getting Started

1. Install dependencies:
   ```bash
   cd apps/mobile
   pnpm install
   ```

2. Start development server:
   ```bash
   pnpm start
   ```

3. Run on device/simulator:
   ```bash
   pnpm ios     # iOS Simulator
   pnpm android # Android Emulator
   ```

## Key Differences from Web

| Web | Mobile |
|-----|--------|
| `react-router-dom` | Expo Router |
| `localStorage` | MMKV |
| `lucide-react` | `lucide-react-native` |
| Tailwind CSS | NativeWind |
| `div`, `span`, `p` | `View`, `Text` |
| `onClick` | `onPress` |
| `window.open()` | `Linking.openURL()` |

## Environment Variables

Create `.env` file:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.clinicalcanvas.com/api
```

## Building for Production

```bash
# Create development build (required for MMKV)
pnpm prebuild

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```
