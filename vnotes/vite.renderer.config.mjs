import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
    optimizeDeps: {
    exclude: ['youtubei.js'],
  },
  build: {
    rollupOptions: {
      external: ['youtubei.js'], // keep it external (main process should require it directly)
    },
    // If you must run it in renderer (not recommended), at least:
    // minify: false,
    // commonjsOptions: { transformMixedEsModules: true }
  }
  
});