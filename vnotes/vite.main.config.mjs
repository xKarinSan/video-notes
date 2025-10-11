import { defineConfig } from "vite";

export default defineConfig({
    plugins: [],
    base:"./",
    build: {
        sourcemap: true,
        rollupOptions: {
            external: ["ffmpeg-static", "whisper-node"],
        },
    },
});
