import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import started from "electron-squirrel-startup";
import Store from "electron-store";
import InnerTube from "youtubei.js";
import { randomUUID } from "node:crypto";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}
let store = null;
let mainWindow = null;
let ytClient = null;

const createWindow = async () => {
    // Create the browser window.
    store = new Store();
    ytClient = await InnerTube.create();
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            )
        );
    }

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
};
// HELPERS

async function ensureDir(directory) {
    await fs.mkdir(directory, { recursive: true });
}

async function fileExists(directory) {
    try {
        await fs.access(directory);
        return true;
    } catch {
        return false;
    }
}

function getYoutubeVideoId(url) {
    try {
        const parsed = new URL(url);
        // Match main YouTube domains
        if (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com"
        ) {
            if (!parsed.pathname === "/watch" && parsed.searchParams.has("v")) {
                return null;
            }
            return parsed.searchParams.get("v").replace(/^\//, "");
        }

        // Match youtu.be short links
        if (parsed.hostname === "youtu.be") {
            if (parsed.pathname.length <= 1) {
                return null;
            }
            return parsed.pathname.slice(1);
        }

        return null;
    } catch (e) {
        console.log("e", e);
        return null;
    }
}

// IPC ENDPOINTS
const USER_DATA_BASE = path.resolve(process.cwd(), "user_data");
const METADATA_DIR = path.join(USER_DATA_BASE, "metadata");
const VIDEOS_DIR = path.join(USER_DATA_BASE, "videos");
// const CACHE_DIR = path.join(USER_DATA_BASE,"cache.db")

ipcMain.handle("get-all-metadata", async () => {
    await Promise.all([ensureDir(METADATA_DIR), ensureDir(VIDEOS_DIR)]);
    const entries = await fs.readdir(METADATA_DIR, { withFileTypes: true });
    const jsonFiles = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
        .map((e) => e.name);

    const items = await Promise.all(
        jsonFiles.map(async (filename) => {
            const jsonPath = path.join(METADATA_DIR, filename);
            const baseId = filename.replace(/\.json$/i, "");
            const videoPath = path.join(VIDEOS_DIR, `${baseId}.mp4`);

            const [raw, hasVideo] = await Promise.all([
                fs.readFile(jsonPath, "utf8"),
                fileExists(videoPath),
            ]);

            let data = {};
            try {
                data = JSON.parse(raw);
                data.id = baseId;
            } catch {
                data = {};
            }
            return data;
        })
    );

    return items;
});

ipcMain.handle("get-current-video", async (_, video_url) => {
    /* 
  1) get the video url and extract it
  2) check if video_id exists in the map. if yes, return the contents
  3) if not, triggeer the following:
  - Save transcript
  - Save video metadata and itself
  4) if yes, return the contents
  */

    const youtube_video_id = getYoutubeVideoId(video_url);
    console.log(youtube_video_id);
    if (!youtube_video_id) {
        console.log("Invalid YouTube URL:", video_url);
        return {};
    }

    await ensureDir(METADATA_DIR);

    let video_id = store.get(youtube_video_id);
    let video_metadata = {};
    let videoMetadataFilePath = "";

    if (video_id) {
        console.log("video exists!");
        videoMetadataFilePath = path.join(METADATA_DIR, `${video_id}.json`);
        const raw = await fs.readFile(videoMetadataFilePath, "utf8");
        try {
            video_metadata = JSON.parse(raw);
            video_metadata.id = video_id;
        } catch {
            video_metadata = {};
        }
        return video_metadata;
    }
    video_id = randomUUID();

    await ytClient.getBasicInfo(youtube_video_id).then(async (res) => {
        const { basic_info } = res;
        const {
            title,
            duration,
            short_description: description,
            thumbnail: thumbnails,
            channel,
        } = basic_info;
        const { name: op_name } = channel;

        video_metadata = {
            id: video_id,
            url: video_url,
            name: title,
            description: description,
            date_extracted: Date.now(),
            thumbnail: thumbnails[0].url ?? "",
            date_uploaded: 0,
            op_name: op_name,
            duration: duration,
        };
        videoMetadataFilePath = path.join(METADATA_DIR, `${video_id}.json`);
        let json_string = JSON.stringify(video_metadata, null, 2);
        await fs.writeFile(videoMetadataFilePath, json_string);
        store.set(youtube_video_id, video_id);
    });

    return video_metadata;
});

// APP LIFECYCLE
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
