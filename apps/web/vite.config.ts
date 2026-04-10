import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import { compression } from "vite-plugin-compression2";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ command, mode }) => {
  const isProduction = command === "build";
  const isDev = command === "serve";
  const env = loadEnv(mode, process.cwd(), "");

  return {
    build: {
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      cssMinify: "esbuild",
      emptyOutDir: true,
      minify: "esbuild",
      modulePreload: {
        polyfill: false,
      },
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          experimentalMinChunkSize: 10_000,
          manualChunks: {
            "chart-vendor": ["recharts"],
            "date-vendor": ["date-fns", "react-day-picker"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "query-vendor": ["@tanstack/react-query", "@tanstack/react-query-persist-client"],
            "react-vendor": ["react", "react-dom", "react-router"],
            "table-vendor": ["@tanstack/react-table", "@tanstack/react-virtual"],
            "ui-vendor": ["radix-ui", "lucide-react", "sonner", "cmdk", "vaul"],
          },
        },
      },
      sourcemap: true,
      target: "es2022",
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
      __DEV__: JSON.stringify(isDev),
      __PROD__: JSON.stringify(isProduction),
    },

    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
      pure: isProduction ? ["console.log", "console.info", "console.debug"] : [],
    },

    optimizeDeps: {
      holdUntilCrawlEnd: false,
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-router",
        "@tanstack/react-query",
        "@tanstack/react-query-devtools",
        "lucide-react",
        "sonner",
        "react-hook-form",
        "zod",
        "clsx",
        "tailwind-merge",
      ],
    },

    plugins: [
      react(),
      tailwindcss(),
      svgr({
        include: "**/*.svg?react",
        svgrOptions: {
          exportType: "default",
          ref: true,
          svgo: true,
          titleProp: true,
        },
      }),
      checker({
        enableBuild: false,
        overlay: { initialIsOpen: false, position: "br" },
        typescript: true,
      }),
      isProduction && compression({ algorithms: ["gzip", "brotliCompress"] }),
      isProduction &&
        visualizer({
          brotliSize: true,
          filename: "dist/stats.html",
          gzipSize: true,
          open: false,
          template: "treemap",
        }),
    ],

    preview: {
      cors: true,
      host: true,
      port: 4173,
      strictPort: true,
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      cors: true,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
      hmr: {
        overlay: true,
      },
      host: true,
      open: false,
      port: 5173,
      proxy: {
        "/api": {
          changeOrigin: true,
          target: env.VITE_API_BASE_URL || "http://localhost:4000",
        },
      },
      strictPort: true,
      warmup: {
        clientFiles: [
          "./src/main.tsx",
          "./src/App.tsx",
          "./src/routes/layouts/app-shell.tsx",
          "./src/features/health/pages/health-page.tsx",
        ],
      },
    },
  };
});
