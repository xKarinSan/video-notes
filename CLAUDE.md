# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **dual-architecture project** for video-based learning:

1. **VNotes Desktop App** (`/vnotes/`) - Production Electron app (v0.2.0) for taking notes from videos with AI summarization
2. **VNotes Notion Integration** (`/vnotes-notion/`) - Integration bringing VNotes features to Notion workspaces
3. **Python CLI** (`/src/`, `/ui/`) - Experimental agent-based system for prototyping features

Most active development happens in `/vnotes/`. The Python code is for experimentation only.

## Working with the Electron App

### Development Commands

```bash
# Navigate to the electron app directory
cd vnotes

# Install dependencies
npm install

# Start development server (with hot reload)
npm start

# Package for distribution
npm run package

# Create distribution artifacts (installers/zips)
npm run make

# Publish to GitHub releases (requires env vars)
npm run publish
```

### Environment Setup

The app requires a Gemini API key for video summarization:

1. Create `vnotes/production.env`:
   ```
   GEMINI_API_KEY="your-api-key-here"
   ```

2. For development, this file is loaded from `process.cwd()`
3. For production builds, it's copied to `process.resourcesPath` (see `forge.config.js:38`)

**CRITICAL**: Never commit `.env`, `dev.env`, or `production.env` files. These should contain sensitive credentials only.

## Architecture: Electron Three-Process Model

### Main Process (`vnotes/src/main.js`)

Runs in Node.js with full system access. Handles:

- **IPC endpoints**: All `ipcMain.handle()` calls that the renderer invokes
- **Video management**: Download (YouTube via `youtubei.js`), upload, storage, deletion
- **Notes CRUD**: Create, read, update, delete notes and note items
- **AI integration**: Gemini API calls for video summarization
- **File operations**: All disk I/O through utility modules in `src/utils/`
- **Caching**: Electron Store for YouTube video mappings and uploaded Gemini files

### Preload Script (`vnotes/src/preload.js`)

Security bridge using `contextBridge`. Exposes three namespaces to renderer:

- `window.api.*` - Video operations (list, add, delete, get)
- `window.notes.*` - Notes operations (create, save, delete, generate AI summary)
- `window.settings.*` - Configuration and preferences

**Critical pattern**: Handles Buffer ↔ Blob conversions between processes:
- Renderer uses Blobs and ObjectURLs (browser environment)
- Main process uses Node Buffers (file system)
- Preload converts between them (see `dictToBufferMap()`, `bufferDictToUrlMap()`)

### Renderer Process (`vnotes/src/renderer.jsx` + React)

React app with:
- **Routing**: Hash-based in production (`HashRouter`), browser-based in dev
- **Pages**: Homepage, video list/detail, notes list/detail
- **Components**: Video player, notes editor, snapshot management
- **No direct Node.js access**: Must use `window.api.*` and `window.notes.*`

## Data Storage Architecture

All data stored as JSON files in `app.getPath("userData")/user_data/`:

```
user_data/
├── videos/{videoId}.mp4              # Original videos
├── compressed_videos/{videoId}.mp4   # 1fps, 480p for AI (cached)
├── metadata/{videoId}.json           # Video metadata (title, duration, etc.)
├── thumbnails/{videoId}.jpeg         # Video thumbnails
├── notes/{notesId}.json              # Notes metadata (title, dates, videoId)
├── notes_items/{notesId}.json        # Array of NotesItems (content + snapshots)
├── snapshots/{notesId}/{snapshotId}.jpg  # User snapshots from video
└── logs/                             # Error and message logs
```

**Electron Store** (KV cache) stores:
- `yt.{youtubeVideoId}` → `{internalVideoId}` (prevents re-downloading)
- `geminiFile.{videoId}` → `{fileName, expirationTime}` (reuses uploaded files)

## Video Processing Pipeline

### YouTube Video Flow

1. User pastes URL → Extract video ID via `getYoutubeVideoId()`
2. Check Electron Store: `store.get('yt.' + youtubeVideoId)`
3. If cached, skip download. Otherwise:
   - `Innertube.getInfo()` → metadata
   - `downloadYoutubeVideoFile()` → save MP4
   - `downloadVideoMetadata()` → save JSON
   - Store mapping in cache

### Uploaded Video Flow

1. User drops file → Renderer creates Blob URL
2. Preload converts Blob → Buffer via `convertBlobToBytes()`
3. Main process saves Buffer as MP4 file
4. Extract thumbnail using FFmpeg
5. Create metadata JSON

### AI Summarization (`summary.utils.ts`)

When user clicks "Generate AI Summary":

1. **Compress video** (if not cached):
   - FFmpeg: 1fps, 480p, optimized for Gemini ingestion
   - Saves to `compressed_videos/{videoId}.mp4`

2. **Upload to Gemini File API** (if not cached):
   - Uploads compressed video
   - Waits until `state === "ACTIVE"` (via polling)
   - Caches `{fileName, expirationTime}` in Electron Store (48hr expiry)

3. **Generate summary**:
   - Model: `gemini-2.5-flash-lite`
   - Prompt: `videoSummaryPrompt` (from `src/prompts.ts`)
   - Returns paragraphs split on blank lines

4. **Convert to NotesItems**:
   - Each paragraph becomes a NotesItem with `isSnapshot: false`
   - Timestamp defaults to -1 (no specific time)

## Project Structure

### Repository Layout

```
video-notes/
├── vnotes/                          # Production Electron app (v0.2.0)
│   ├── src/
│   │   ├── main.js                  # Main process (Node.js)
│   │   ├── preload.js               # Security bridge (contextBridge)
│   │   ├── renderer.jsx             # React app entry point
│   │   ├── Layout.tsx               # Main layout component
│   │   ├── prompts.ts               # AI prompts for Gemini
│   │   ├── classes/                 # TypeScript class definitions
│   │   │   ├── Video.tsx            # Video metadata class
│   │   │   ├── Notes.tsx            # Notes metadata class
│   │   │   └── Pdf.tsx              # PDF export class
│   │   ├── components/              # Reusable React components
│   │   │   ├── VideoPlayer.tsx      # Video playback component
│   │   │   ├── AddNewVideo.tsx      # Video upload/YouTube modal
│   │   │   ├── NotesListComponent.tsx
│   │   │   └── EmptyPlaceholder.tsx
│   │   ├── pages/                   # Route-level pages
│   │   │   ├── Homepage.tsx         # Landing page
│   │   │   ├── MainVideoPage.tsx    # Video library list
│   │   │   ├── CurrentVideoPage.tsx # Video detail view
│   │   │   ├── MainNotesPage.tsx    # Notes library list
│   │   │   └── CurrentNotesPage.tsx # Notes editor with snapshots
│   │   ├── utils/                   # Core utilities (TypeScript)
│   │   │   ├── files.utils.ts       # File system helpers
│   │   │   ├── youtubeVideo.utils.ts # YouTube download/metadata
│   │   │   ├── summary.utils.ts     # Gemini AI + FFmpeg compression
│   │   │   ├── notes.utils.ts       # Notes metadata CRUD
│   │   │   ├── notesItems.utils.ts  # Note items + snapshots sync
│   │   │   ├── thumbnails.utils.ts  # FFmpeg thumbnail extraction
│   │   │   ├── pdfExport.utils.ts   # jsPDF export
│   │   │   ├── logging.utils.ts     # Error/message logging
│   │   │   └── timestamp.utils.ts   # Video timestamp parsing
│   │   ├── types/                   # TypeScript type definitions
│   │   └── models/                  # Data models
│   ├── assets/                      # App icons (icns, ico, png)
│   ├── const.ts                     # Path constants (USER_DATA_BASE)
│   ├── forge.config.js              # Electron Forge configuration
│   ├── vite.main.config.mjs         # Vite config for main process
│   ├── vite.preload.config.mjs      # Vite config for preload
│   ├── vite.renderer.config.mjs     # Vite config for renderer (React)
│   ├── production.env               # Production API keys (gitignored)
│   ├── package.json                 # Dependencies and scripts
│   └── user_data/                   # Runtime data (created at runtime)
│       ├── videos/                  # Original MP4 files
│       ├── compressed_videos/       # 1fps 480p for AI (cached)
│       ├── metadata/                # Video metadata JSON
│       ├── thumbnails/              # Video thumbnails (JPEG)
│       ├── notes/                   # Notes metadata JSON
│       ├── notes_items/             # NotesItems arrays (JSON)
│       ├── snapshots/               # User snapshots (JPEG)
│       │   └── {notesId}/           # Organized by notes ID
│       └── logs/                    # Error and message logs
│
├── vnotes-notion/                   # Notion integration (new)
│   ├── index.js                     # Main integration logic
│   ├── package.json                 # Dependencies and scripts
│   ├── .env.example                 # Environment variable template
│   ├── .gitignore                   # Git ignore (protects API keys)
│   └── README.md                    # Setup and usage documentation
│
├── hooks/                           # Reusable hooks for claude
├── src/                             # Python CLI (experimental)
│   ├── main.py                      # Agent orchestrator
│   ├── models.py                    # Pydantic data models
│   ├── prompts.py                   # AI prompts for agents
│   ├── video_agent/                 # Video download/extraction agent
│   ├── notes_agent/                 # Summarization agent
│   └── utils/                       # Python utilities
│
└── ui/                              # Streamlit prototype (experimental)
    ├── main.py                      # Streamlit app entry
    └── components/                  # UI components
```

### Key Configuration Files

- **`forge.config.js`**: Electron packaging, code signing, notarization, publishing
- **`const.ts`**: Centralizes all file paths (resolves to `app.getPath("userData")/user_data/`)
- **`production.env`**: Gemini API key (never committed, copied to `process.resourcesPath` on build)
- **`entitlements.plist`**: macOS sandboxing entitlements for code signing

## NotesItem Structure

The core data model for note content:

```typescript
{
  id: string,              // UUID
  isSnapshot: boolean,     // true = image snapshot, false = text
  content: string,         // text content OR snapshotId reference
  timestamp: number,       // video timestamp in seconds (-1 if none)
  snapshotId?: string      // if isSnapshot=true, links to file in snapshots/
}
```

**Snapshot sync pattern** (`notesItems.utils.ts:syncSnapshots`):
- Diffs old vs new snapshot IDs
- Deletes removed snapshots from disk
- Saves new snapshots as JPEG files
- Auto-triggered on debounced save (1 second delay)

## Key Utilities (`vnotes/src/utils/`)

- **`youtubeVideo.utils.ts`**: YouTube download, metadata parsing, deletion
- **`summary.utils.ts`**: FFmpeg compression, Gemini upload/summarization, path resolution
- **`notes.utils.ts`**: Notes metadata CRUD operations
- **`notesItems.utils.ts`**: Note items + snapshots management, sync logic
- **`files.utils.ts`**: Generic file system helpers (`ensureDir`, `fileExists`, etc.)
- **`thumbnails.utils.ts`**: Thumbnail extraction via FFmpeg
- **`pdfExport.utils.ts`**: Export notes to PDF (using jsPDF)
- **`logging.utils.ts`**: Error and message logging to files

## FFmpeg Integration

FFmpeg binary (`ffmpeg-static` package) requires special handling:

1. **Unpacking** (`forge.config.js:10`):
   ```js
   unpackDir: "{assets,node_modules/ffmpeg-static}"
   ```
   Must be unpacked from asar for execution.

2. **Path resolution** (`summary.utils.ts:42-46`):
   ```js
   let p = require("ffmpeg-static");
   if (p.includes("app.asar")) {
     p = p.replace("app.asar", "app.asar.unpacked");
   }
   ```
   Handles packaged vs dev paths.

3. **Usage**: Via `spawn()` or `execFile()` from `child_process`

## Packaging & Distribution

Electron Forge configuration (`forge.config.js`):

- **Makers**: ZIP (macOS), Squirrel (Windows), DEB/RPM (Linux)
- **Code signing**: macOS via `osxSign` (requires env vars: `MAC_CODESIGN_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`)
- **Notarization**: `osxNotarize` for macOS Gatekeeper
- **Publishing**: GitHub releases via `@electron-forge/publisher-github`
- **Assets**: Icons and `production.env` copied to `extraResource`

## Auto-Updates

Uses `update-electron-app` (configured in `main.js:59-65`):
- Update source: Electron Public Update Service
- Repository: `xKarinSan/video-notes`
- Check interval: 1 hour

## Common Patterns

### Environment Loading

```js
// Development: load from project root
// Production: load from resourcesPath
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, "production.env")
  : path.join(process.cwd(), "production.env");
dotenv.config({ path: envPath });
```

### IPC Communication

**Main process** (register handler):
```js
ipcMain.handle("my-channel", async (event, arg1, arg2) => {
  // ... do work
  return result;
});
```

**Preload** (expose to renderer):
```js
contextBridge.exposeInMainWorld("api", {
  myMethod: (arg1, arg2) => ipcRenderer.invoke("my-channel", arg1, arg2)
});
```

**Renderer** (call from React):
```js
const result = await window.api.myMethod(arg1, arg2);
```

### Error Handling

Always wrap risky operations in try-catch and log:
```js
import { logErrorToFile, logMessageToFile } from "./utils/logging.utils";

try {
  // risky operation
} catch (e) {
  logErrorToFile(e, "filename.ts", "functionName");
}
```

## VNotes Notion Integration (`/vnotes-notion/`)

### Overview

The VNotes Notion integration brings VNotes features to Notion workspaces. Currently implements basic command functionality, with plans to add full AI summarization and timestamped snapshots.

**Current Implementation**: Simple CLI tool with two commands that append content to Notion pages.

**Planned Features**:
1. **AI Summarization/Overview**: Generate AI-powered summaries of video content using Gemini
2. **Timestamped Snapshots**: Capture and organize visual snapshots from videos with precise timestamps

### Development Commands

```bash
# Navigate to the integration directory
cd vnotes-notion

# Install dependencies
npm install

# Run commands
npm start /overview   # Appends "overview" to Notion page
npm start /snapshot   # Appends "snapshot" to Notion page
```

### Environment Setup

The integration requires a Notion API key and page ID:

1. Create `vnotes-notion/.env`:
   ```
   NOTION_API_KEY=your_notion_api_key_here
   NOTION_PAGE_ID=your_notion_page_id_here
   ```

2. Create a Notion integration at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Share your Notion page with the integration
4. Copy the page ID from the URL

**CRITICAL**: Never commit `.env` files. The `.gitignore` protects these credentials.

### Current Architecture

**Technology Stack**:
- `@notionhq/client` v5.6.0 - Official Notion JavaScript SDK
- `dotenv` v17.2.3 - Environment variable management
- Node.js ES modules (`"type": "module"`)

**File Structure**:
- `index.js` - Main entry point with command handlers
- `.env` - Environment variables (gitignored)
- `.env.example` - Template for environment setup

**Command Implementation** (`index.js`):
```js
async function appendTextToPage(pageId, text) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: text } }]
      }
    }]
  });
}
```

Commands are executed via CLI arguments:
- `/overview` → calls `overviewCommand()` → appends "overview"
- `/snapshot` → calls `snapshotCommand()` → appends "snapshot"

### Future Integration Architecture

When implementing full VNotes features:

- **Video compression pipeline**: Reuse FFmpeg settings (1fps, 480p) from `vnotes/src/utils/summary.utils.ts`
- **Gemini API integration**: Use `gemini-2.5-flash-lite` model with prompts from `vnotes/src/prompts.ts`
- **NotesItem data model**: Map NotesItem structure to Notion blocks (paragraphs for text, images for snapshots)
- **Caching strategy**: Cache compressed videos and uploaded Gemini files (48hr expiry)
- **Block mapping**: Convert NotesItems to Notion blocks with timestamp metadata
- **Error handling**: Add logging similar to Electron app pattern

### Design Principles

- **Security-first**: API keys in environment variables (never committed)
- **Block-based content**: Leverage Notion's block API for rich formatting
- **Efficient API usage**: Cache compressed videos and Gemini uploads to minimize costs
- **Simple CLI interface**: Command-based execution for easy scripting and automation

## Python CLI (Experimental)

Located in `/src/` and `/ui/`. Not production code.

**Architecture**: Agent-based system with handoffs:
- `main.py`: Main agent (orchestrator)
- `video_agent/`: Handles video download and extraction
- `notes_agent/`: Generates summaries and notes
- `ui/`: Streamlit prototype interface

Not actively maintained. Focus on `/vnotes/` for production work.

## Important Notes

- **API key security**: Never commit environment files or hardcode API keys
- **Legacy OpenAI code**: The app has migrated from OpenAI to Gemini. Legacy code remains that should be cleaned up:
  - `package.json` dependency: `"openai": "^6.9.1"` (should be removed)
  - `preload.js:153-158`: `getOpenAIKey()` and `setOpenAIKey()` IPC handlers (unused, should be removed)
  - The current AI implementation uses Gemini exclusively via `@google/genai` package
- **File-based storage**: No database. All data in JSON + file system. Keep this in mind for data integrity.
- **Offline-first**: App should work offline except for YouTube downloads and AI summarization
- **Context isolation**: Renderer has no Node.js access by design. All system operations must go through preload bridge.
