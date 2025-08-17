import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fsp from "node:fs/promises";

import started from "electron-squirrel-startup";
import Store from "electron-store";
import { randomUUID } from "node:crypto";
import ytdl from "ytdl-core";
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
    getNotesMetadataById,
    getVideoMetadataById,
    getVideoPathById,
} from "./utils/files.utils";
import { createNotesMetadata } from "./utils/notes.utils";

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

ipcMain.handle("add-current-video", async (_, videoUrl) => {
    try {
        const youtubeVideoId = getYoutubeVideoId(videoUrl);
        console.log(youtubeVideoId);
        if (!youtubeVideoId) {
            console.log("Invalid YouTube URL:", videoUrl);
            return null;
        }
        await ensureDir(METADATA_DIR);
        await ensureDir(VIDEOS_DIR);

        let videoId = store.get(youtubeVideoId);
        let videoMetadata = {};
        let videoMetadataFilePath = "";

        if (videoId) {
            console.log("video exists!");
            videoMetadataFilePath = path.join(METADATA_DIR, `${videoId}.json`);
            const raw = await fsp.readFile(videoMetadataFilePath, "utf8");
            try {
                videoMetadata = JSON.parse(raw);
                videoMetadata.id = videoId;
            } catch {
                videoMetadata = null;
            }
            return videoMetadata;
        }
        videoId = randomUUID();
        const basicInfo = await ytdl.getInfo(videoUrl);
        const { videoDetails, formats } = basicInfo;
        const {
            title,
            description,
            lengthSeconds: timestamp,
            videoUrl: retrieved_url,
            uploadDate,
            author,
            thumbnails,
        } = videoDetails;

        const format = ytdl.chooseFormat(formats, { quality: "18" });

        const streamingUrl = format.url;
        const isVideoDownloaded = await downloadVideoFile(
            streamingUrl,
            videoId
        );

        const largestThumbnail = thumbnails[thumbnails.length - 1];
        const uploadDateInMs = new Date(uploadDate).getTime();
        const opName = author.name;
        videoMetadata = {
            id: videoId,
            videoUrl: retrieved_url,
            name: title,
            description: description,
            dateExtracted: Date.now(),
            thumbnail: largestThumbnail.url,
            dateUploaded: uploadDateInMs,
            opName: opName,
            duration: parseInt(timestamp),
        };

        const isMetadataDownloaded = await downloadVideoMetadata(
            videoMetadata,
            videoId
        );

        if (isVideoDownloaded && isMetadataDownloaded) {
            store.set(youtubeVideoId, videoId);
            return videoMetadata;
        }
        return null;
    } catch {
        return null;
    }
});

ipcMain.handle("get-current-video", async (_, videoId) => {
    const videoMetadata = await getVideoMetadataById(videoId);
    const videoFilePath = await getVideoPathById(videoId);
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

ipcMain.handle("create-new-notes", async (_, videoId) => {
    try {
        const newNotes = await createNotesMetadata(videoId);
        return newNotes;
    } catch {
        return null;
    }
});

ipcMain.handle("get-current-notes", async (_, notesId) => {
    try {
        const currentNotesMetadata = await getNotesMetadataById(notesId);
        if (!currentNotesMetadata) {
            return null;
        }
        const { videoId } = currentNotesMetadata;
        const videoMetadata = await getVideoMetadataById(videoId);
        if (!videoMetadata) {
            return null;
        }

        const videoFilePath = await getVideoPathById(videoId);
        if (!(videoMetadata && videoFilePath)) {
            return null;
        }

        const buffer = fs.readFileSync(videoFilePath);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:video/mp4;base64,${base64}`;
        return {
            videoMetadata: videoMetadata,
            notesMetadata: currentNotesMetadata,
            videoPath: dataUrl,
        };
    } catch (e){
        console.log("get-current-notes | e ",e)
        return null;
    }
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
