import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      port: 8080,
      proxy: {
        "/api": {
          target:
            "https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env": {
        VITE_API_BASE_URL: JSON.stringify(env.VITE_API_BASE_URL),
        VITE_USE_REAL_API: JSON.stringify(env.VITE_USE_REAL_API),
        VITE_ENABLE_AUTH_API: JSON.stringify(env.VITE_ENABLE_AUTH_API),
        VITE_ENABLE_PATIENTS_API: JSON.stringify(env.VITE_ENABLE_PATIENTS_API),
        VITE_ENABLE_TASKS_API: JSON.stringify(env.VITE_ENABLE_TASKS_API),
        VITE_ENABLE_DASHBOARD_API: JSON.stringify(env.VITE_ENABLE_DASHBOARD_API),
        VITE_ENABLE_MEDIA: JSON.stringify(env.VITE_ENABLE_MEDIA),
      },
    },
  };
});
