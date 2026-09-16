import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: ".",
  base: "/",
  plugins: [
    viteStaticCopy({
      targets: [
        { src: "public/favicon.ico", dest: "." },
        { src: "public/assets/*", dest: "assets" },
      ],
      verbose: false,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html",
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
});
