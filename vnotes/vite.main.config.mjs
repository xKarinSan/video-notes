import { defineConfig } from "vite";

export default defineConfig({
    plugins: [],
    build: {
        sourcemap: true,
        rollupOptions: {
            external: [
                "ffmpeg-static",
                "youtube-transcript-plus",
                "update-electron-app",
                "electron-squirrel-startup",
                "youtube-dl-exec",
                "openai",
                "@langchain/openai",
                "@langchain/core/prompts",
                "@langchain/textsplitters",
            ],
        },
    },
});
