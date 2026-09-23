import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    build: {
      sourcemap: mode !== "production",
      outDir: "dist",
    },
    esbuild: {
      jsxDev: mode !== "production",
    },
    ssr: {
      noExternal: ["react-router-dom"],
    },
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://127.0.0.1:5001",
        },
      },
    },
    plugins: [
      react({
        jsxImportSource: "react",
        devTarget: mode === "development" ? "development" : "es2020",
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../server/src/database/schema"),
        "@assets": path.resolve(__dirname, "../attached_assets"),
      },
    },
  };
});
