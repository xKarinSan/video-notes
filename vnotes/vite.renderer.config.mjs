import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [tailwindcss(), react()],
    resolve: {
        dedupe: ["onnxruntime-web", "@huggingface/transformers"],
        alias: {
            "onnxruntime-web/webgpu": "onnxruntime-web/webgpu",
            "onnxruntime-web": "onnxruntime-web",
        },
    },
    optimizeDeps: {
        include: ["onnxruntime-web", "@huggingface/transformers"],
        exclude: ["youtubei.js"],
    },
    worker: { format: "es" },
    build: {
        rollupOptions: {
            external: ["youtubei.js"],
        },
    },
});
