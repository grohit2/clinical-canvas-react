import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env': {
      VITE_API_BASE_URL: JSON.stringify('http://localhost:3001/api'),
      VITE_USE_REAL_API: JSON.stringify('false'),
      VITE_ENABLE_AUTH_API: JSON.stringify('true'),
      VITE_ENABLE_PATIENTS_API: JSON.stringify('true'),
      VITE_ENABLE_TASKS_API: JSON.stringify('true'),
      VITE_ENABLE_DASHBOARD_API: JSON.stringify('true'),
    }
  },
}));
