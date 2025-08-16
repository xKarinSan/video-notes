import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fsp from "node:fs/promises";

import started from "electron-squirrel-startup";
import Store from "electron-store";
import { randomUUID } from "node:crypto";
import ytdl from "ytdl-core";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

import {
    getYoutubeVideoId,
    downloadVideoMetadata,
    downloadVideoFile,
} from "./utils/youtubeVideo.utils";
import { METADATA_DIR, VIDEOS_DIR } from "../const";
import {
    ensureDir,
    fileExists,
    getVideoMetadataById,
    getVideoPathById,
} from "./utils/files.utils";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}
let store = null;
let mainWindow = null;

const createWindow = async () => {
    // Create the browser window.
    store = new Store();
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

// IPC ENDPOINTS
ipcMain.handle("get-all-metadata", async () => {
    await Promise.all([ensureDir(METADATA_DIR), ensureDir(VIDEOS_DIR)]);
    const entries = await fsp.readdir(METADATA_DIR, { withFileTypes: true });
    const jsonFiles = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
        .map((e) => e.name);

    const items = await Promise.all(
        jsonFiles.map(async (filename) => {
            const jsonPath = path.join(METADATA_DIR, filename);
            const baseId = filename.replace(/\.json$/i, "");
            const videoPath = path.join(VIDEOS_DIR, `${baseId}.mp4`);

            const [raw, hasVideo] = await Promise.all([
                fsp.readFile(jsonPath, "utf8"),
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

ipcMain.handle("add-current-video", async (_, video_url) => {
    try {
        const youtube_video_id = getYoutubeVideoId(video_url);
        console.log(youtube_video_id);
        if (!youtube_video_id) {
            console.log("Invalid YouTube URL:", video_url);
            return null;
        }
        await ensureDir(METADATA_DIR);
        await ensureDir(VIDEOS_DIR);

        let video_id = store.get(youtube_video_id);
        let video_metadata = {};
        let videoMetadataFilePath = "";

        if (video_id) {
            console.log("video exists!");
            videoMetadataFilePath = path.join(METADATA_DIR, `${video_id}.json`);
            const raw = await fsp.readFile(videoMetadataFilePath, "utf8");
            try {
                video_metadata = JSON.parse(raw);
                video_metadata.id = video_id;
            } catch {
                video_metadata = null;
            }
            return video_metadata;
        }
        video_id = randomUUID();
        const basicInfo = await ytdl.getInfo(video_url);
        const { videoDetails, formats } = basicInfo;
        const {
            title,
            description,
            lengthSeconds: timestamp,
            video_url: retrieved_url,
            uploadDate,
            author,
            thumbnails,
        } = videoDetails;

        const format = ytdl.chooseFormat(formats, { quality: "18" });

        const streamingUrl = format.url;
        const isVideoDownloaded = await downloadVideoFile(
            streamingUrl,
            video_id
        );

        const largestThumbnail = thumbnails[thumbnails.length - 1];
        const uploadDateInMs = new Date(uploadDate).getTime();
        const opName = author.name;
        video_metadata = {
            id: video_id,
            video_url: retrieved_url,
            name: title,
            description: description,
            date_extracted: Date.now(),
            thumbnail: largestThumbnail.url,
            date_uploaded: uploadDateInMs,
            op_name: opName,
            duration: parseInt(timestamp),
        };

        const isMetadataDownloaded = await downloadVideoMetadata(
            video_metadata,
            video_id
        );

        if (isVideoDownloaded && isMetadataDownloaded) {
            store.set(youtube_video_id, video_id);
            return video_metadata;
        }
        return null;
    } catch {
        return null;
    }
});

ipcMain.handle("get-current-video", async (_, video_id) => {
    // check if metadata exists
    const videoMetadata = await getVideoMetadataById(video_id);
    console.log("videoMetadata", videoMetadata);
    // check if path exists
    const videoFilePath = await getVideoPathById(video_id);
    console.log("videoFilePath", videoFilePath);
    if (!(videoMetadata && videoFilePath)) {
        return null;
    }

    const buffer = fs.readFileSync(videoFilePath);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:video/mp4;base64,${base64}`;
    return {
        metadata: videoMetadata,
        video_path: dataUrl,
    };
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
