# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.5.3 - Full codebase and configuration files
- JavaScript (JSX/TSX) - React components and build configuration

**Secondary:**
- Python - Backend services (separate deployment)

## Runtime

**Environment:**
- Node.js (version unspecified in package.json, inferred ES2020+ compatible)

**Package Manager:**
- npm (with package-lock.json present)
- Alternative: Bun (bun.lockb file present)

**Lockfile:**
- package-lock.json - Primary lockfile
- bun.lockb - Alternative lockfile for Bun package manager

## Frameworks

**Core:**
- React 18.3.1 - UI framework and components
- React Router DOM 6.26.2 - Client-side routing
- React Native 0.76.9 - Mobile/cross-platform components (integrated but not primary target)

**UI & Components:**
- Radix UI (multiple primitives @1.x-2.x versions) - Unstyled accessible components foundation
  - 25+ component packages including accordion, dialog, select, toast, tabs, etc.
- shadcn/ui (via components.json) - Pre-built Radix UI + Tailwind components
- Tailwind CSS 3.4.11 - Utility-first CSS framework
- TailwindCSS Animate 1.0.7 - Animation utilities

**Forms & Validation:**
- React Hook Form 7.53.0 - Form state management
- @hookform/resolvers 3.9.0 - Validation resolvers
- Zod 3.23.8 - TypeScript-first schema validation

**Data Management:**
- TanStack React Query 5.56.2 - Server state management and caching
- React DOM 18.3.1 - DOM utilities

**Animation & Motion:**
- Framer Motion 12.23.12 - Animation library
- Embla Carousel React 8.3.0 - Carousel/slider component

**Data Visualization:**
- Recharts 2.12.7 - Chart and graph library

**Utilities:**
- date-fns 3.6.0 - Date manipulation
- class-variance-authority 0.7.1 - Component variant utilities
- clsx 2.1.1 - Conditional classname utility
- tailwind-merge 2.5.2 - Merge Tailwind classes intelligently
- next-themes 0.3.0 - Dark mode theme management

**UI Enhancements:**
- Sonner 1.5.0 - Toast notifications
- Lucide React 0.462.0 - Icon library
- Input OTP 1.2.4 - OTP input component
- React Resizable Panels 2.1.3 - Resizable panel layout
- React Day Picker 8.10.1 - Date picker component
- Vaul 0.9.3 - Drawer component
- cmdk 1.0.0 - Command menu/palette
- Expo Vector Icons 14.0.4 - Icon pack

**Document Generation:**
- docx 8.6.0 - Word document generation

**QR Code:**
- qrcode 1.5.4 - QR code generation
- @types/qrcode 1.5.5 - TypeScript definitions

**Image Processing:**
- browser-image-compression 2.0.2 - Client-side image compression
- heic2any 0.0.4 - HEIC/HEIF image format conversion

## Build & Dev Tools

**Build:**
- Vite 5.4.1 - Build tool and dev server
- @vitejs/plugin-react-swc 3.5.0 - React plugin with SWC compiler

**Transpilation:**
- Babel Core 7.29.0+ - JavaScript transpiler
- Babel modules and utilities (@babel/generator, @babel/traverse, etc.)

**Linting & Code Quality:**
- ESLint 9.9.0 - JavaScript/TypeScript linter
- typescript-eslint 8.0.1 - TypeScript ESLint support
- eslint-plugin-react-hooks 5.1.0-rc.0 - React hooks linting
- eslint-plugin-react-refresh 0.4.9 - React refresh linting
- @eslint/js 9.9.0 - JavaScript linting config

**Git Hooks:**
- Husky 9.0.10 - Git hook management
- lint-staged 15.2.4 - Pre-commit hook for staged files

**Testing:**
- Vitest 4.0.14 - Unit test framework (configured in vite.config.ts)
- @testing-library/react 16.3.0 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- JSDOM 27.2.0 - DOM implementation for testing
- Playwright 1.57.0 - E2E testing framework

**CSS Processing:**
- PostCSS 8.4.47 - CSS transformation
- Autoprefixer 10.4.20 - Browser vendor prefix automation

**Type Checking:**
- TypeScript 5.5.3 - TypeScript compiler
- @types/node 22.5.5 - Node.js type definitions
- @types/react 18.3.3 - React type definitions
- @types/react-dom 18.3.0 - React DOM type definitions

**Utilities:**
- globals 15.9.0 - Global object references for ESLint

## Performance & Monitoring

**Analytics & Observability:**
- @vercel/speed-insights 1.2.0 - Vercel Web Vitals tracking

## Configuration

**Environment:**
- Configured via Vite environment variables (VITE_* prefix)
- `.env.local` file in root directory

**Required Environment Variables:**
- `VITE_API_BASE_URL` - API endpoint base path (default: `/api`)
- `VITE_PROXY_TARGET` - Backend proxy target for dev (e.g., Lambda URL or localhost:8000)
- `VITE_PATIENT_FORM_V2` - Feature flag (1 for V2 patient form, 0 for legacy)
- `VITE_CDN_DOMAIN` - CloudFront CDN domain for optimized images

**Vite Configuration:**
- `vite.config.ts` - Dev server setup with path aliases and test environment config
- Dev server runs on port 8080
- API proxy configured to rewrite `/api` requests to backend

**TypeScript Configuration:**
- `tsconfig.json` - Root configuration with references
- `tsconfig.app.json` - Application-specific settings
- `tsconfig.node.json` - Build tool configuration
- Target: ES2020
- Module resolution: bundler
- Path aliases: @, @app, @shared, @entities, @features

**Build Output:**
- Vite produces output to `dist/` directory
- Development mode builds with `vite build --mode development`

## Platform Requirements

**Development:**
- Node.js ES2020+ compatible
- npm or Bun package manager
- Husky-enabled git repository
- Port 8080 available (Vite dev server)

**Production:**
- Vercel deployment (evidenced by playwright.config.ts base URL)
- CloudFront CDN for optimized image delivery
- AWS Lambda backend (from .env.local configuration)
- AWS S3 for file storage with presigned URLs

---

*Stack analysis: 2026-02-09*
