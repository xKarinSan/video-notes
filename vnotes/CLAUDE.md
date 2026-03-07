# VNotes

Video annotation desktop app — "Watch. Snap. Replay. Learn."
Users add YouTube/local videos, take timestamped snapshots, write notes, generate AI summaries, and export as PDF.

## Tech Stack

- **Desktop:** Electron 37 + Electron Forge (Vite plugin)
- **Frontend:** React 19, TypeScript, Tailwind CSS 4 + DaisyUI 5
- **AI:** OpenAI (GPT-3.5-turbo for summaries, Whisper for transcription), LangChain
- **Media:** FFmpeg (ffmpeg-static), youtube-dl-exec, youtube-transcript-plus
- **Storage:** electron-store for settings, JSON files for metadata, filesystem for videos/snapshots
- **PDF:** jsPDF

## Commands

```bash
npm start       # Dev mode (Electron Forge + Vite hot reload)
npm run package # Package the app
npm run make    # Build installers (Squirrel/ZIP/DEB/RPM)
npm run publish # Publish to GitHub releases
```

No test framework is configured.

## Architecture

### Process Model

- **Main process** (`src/main.js`): IPC endpoints via `ipcMain.handle()`, file I/O, AI calls
- **Preload** (`src/preload.js`): Context bridge exposing `window.api`, `window.notes`, `window.settings`
- **Renderer** (`src/renderer.jsx`): React app entry point

### Data Storage

All user data lives in `app.getPath('userData')/user_data/`:
- `metadata.json` — video records
- `notes_metadata.json` — notes records
- `videos/` — downloaded MP4 files
- `notes/{notesId}.json` — individual notes content
- `snapshots/{notesId}/` — JPEG snapshot files
- `transcripts/{videoId}.txt` — transcript text
- `thumbnails/{videoId}.jpg` — video thumbnails

Path constants defined in `const.ts`.

### Key Data Flow

**YouTube video import:** URL → yt-dlp download → metadata extraction → transcript (YouTube API, fallback to Whisper) → save to filesystem

**AI summary:** transcript → split into 1000-char chunks (200 overlap) → parallel GPT summarization → combine → final summary → return as notes items

**Notes editing:** auto-save with 1000ms debounce, force-save on `beforeunload`

## Project Structure

```
src/
├── main.js              # Electron main process (IPC handlers)
├── preload.js           # Context bridge
├── renderer.jsx         # React entry
├── Layout.tsx           # Sidebar navigation layout
├── const.ts             # Path constants
├── prompts.ts           # AI prompt templates
├── classes/             # TypeScript interfaces (Video, Notes, Pdf)
├── components/          # React components
├── pages/               # Route pages (Homepage, Video, Notes)
└── utils/               # Domain-grouped utility functions
    ├── youtubeVideo.utils.ts
    ├── files.utils.ts
    ├── notes.utils.ts
    ├── notesItems.utils.ts
    ├── transcripts.utils.ts
    ├── summary.utils.ts
    ├── thumbnails.utils.ts
    ├── timestamp.utils.ts
    └── pdfExport.utils.ts
```

## Conventions

- Utility files use `.utils.ts` suffix, grouped by domain
- Interfaces/types live in `src/classes/` with `.tsx` extension
- All functions use camelCase, explicitly exported
- Use absolute file paths (never relative) for data operations
- IPC communication only — renderer never accesses Node APIs directly
- Main process is CommonJS (`main.js`, `preload.js`); renderer is TypeScript/ESM
- React state via hooks (useState, useEffect, useRef) — no global state manager
- Toast notifications (react-toastify) for user feedback
- Try-catch with graceful fallbacks in async functions

## Vite Configs

Three separate Vite configs for Electron Forge:
- `vite.main.config.mjs` — main process
- `vite.preload.config.mjs` — preload script
- `vite.renderer.config.mjs` — React renderer
