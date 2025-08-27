import { app, BrowserWindow, ipcMain } from "electron";
import { fetchTranscript } from "youtube-transcript-plus";

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
    deleteVideoMetadata,
    deleteVideoFile,
    deleteVideoRecord,
} from "./utils/youtubeVideo.utils";
import { METADATA_DIR, SNAPSHOTS_DIR, VIDEOS_DIR } from "../const";
import {
    ensureDir,
    fileExists,
    getAllNotesMetadata,
    getNotesMetadataById,
    getVideoMetadataById,
    getVideoPathById,
} from "./utils/files.utils";
import {
    createNotesMetadata,
    deleteNotesMetadata,
    deleteNotesMetadataById,
    saveNotesMetadata,
} from "./utils/notes.utils";
import {
    deleteNotesFromList,
    deleteNotesItemById,
    deleteSnapshotFromNote,
    deleteSnapshotsByNotesId,
    getSnapshotBufferMap,
    readNotesItem,
    syncSnapshots,
    writeNotesItem,
} from "./utils/notesItems.utils";
import { deleteTranscript, writeTranscript } from "./utils/transcripts.utils";

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

        let videoId = store.get("yt." + youtubeVideoId);
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

        // download the video itself
        const streamingUrl = format.url;
        const isVideoDownloaded = await downloadVideoFile(
            streamingUrl,
            videoId
        );
        console.log("isVideoDownloaded? ", isVideoDownloaded);
        let transcript = [];

        await fetchTranscript(youtubeVideoId).then((res) => {
            transcript = res;
        });
        const savedTranscript = await writeTranscript(videoId, transcript);
        console.log("savedTranscript? ", savedTranscript);

        // download the metadata
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
            notesIdList: [],
        };

        const isMetadataDownloaded = await downloadVideoMetadata(
            videoMetadata,
            videoId
        );
        console.log("isMetadataDownloaded? ", isMetadataDownloaded);

        if (
            !(
                isVideoDownloaded &&
                isMetadataDownloaded &&
                transcript &&
                savedTranscript
            )
        ) {
            // implement rollback
            if (!isVideoDownloaded) {
                // rollback metadata
                await deleteVideoMetadata(videoId);
            }
            if (!isMetadataDownloaded) {
                // rollback video download
                await deleteVideoFile(videoId);
            }
            return null;
        }
        store.set("yt." + youtubeVideoId, videoId);
        store.set("vd." + videoId, youtubeVideoId);
        return videoMetadata;
    } catch (e) {
        console.log("add-current-video :", e);
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
    return {
        metadata: videoMetadata,
        buffer: buffer,
    };
});

ipcMain.handle("create-new-notes", async (_, videoId) => {
    try {
        const newNotes = await createNotesMetadata(videoId);
        if (!newNotes) {
            return null;
        }
        const { id } = newNotes;
        const snapshotPath = path.join(SNAPSHOTS_DIR, id);
        await ensureDir(snapshotPath);
        const newNotesContents = await writeNotesItem(id, []);
        if (!newNotesContents) {
            return null;
        }
        return newNotes;
    } catch {
        return null;
    }
});

ipcMain.handle("get-current-notes", async (_, notesId) => {
    try {
        const currentNotesMetadata = await getNotesMetadataById(notesId);
        console.log("currentNotesMetadata", currentNotesMetadata);
        if (!currentNotesMetadata) {
            return null;
        }
        const currentNotes = await readNotesItem(notesId);
        console.log("currentNotes", currentNotes);

        if (!currentNotes) {
            return null;
        }

        // get all snapshots contents and convert to buffer
        // snapshot path: notes_snapshot
        const snapshotBuffer = await getSnapshotBufferMap(notesId);
        console.log("snapshots");
        if (!snapshotBuffer) {
            return null;
        }

        const { videoId } = currentNotesMetadata;
        const videoMetadata = await getVideoMetadataById(videoId);
        console.log("videoMetadata", videoMetadata);

        if (!videoMetadata) {
            return null;
        }

        const videoFilePath = await getVideoPathById(videoId);
        console.log("videoFilePath", videoFilePath);

        if (
            !(
                videoMetadata &&
                videoFilePath &&
                currentNotes &&
                currentNotesMetadata &&
                snapshotBuffer
            )
        ) {
            return null;
        }

        const buffer = fs.readFileSync(videoFilePath);
        console.log();
        return {
            videoMetadata: videoMetadata,
            notesMetadata: currentNotesMetadata,
            currentNotesData: currentNotes,
            snapshotBuffer: snapshotBuffer,
            buffer: buffer,
        };
    } catch (e) {
        console.log("get-current-notes | e ", e);
        return null;
    }
});

ipcMain.handle(
    "save-current-notes",
    async (_, notesId, notesMetadata, notesDetails, bufferDict) => {
        try {
            const previousNotes = await readNotesItem(notesId);
            if (!previousNotes) {
                return false;
            }
            const syncedSnapshots = await syncSnapshots(
                notesId,
                previousNotes,
                bufferDict
            );
            if (!syncedSnapshots) {
                return false;
            }
            const [savedNotes, savedNotesDetails] = await Promise.all([
                saveNotesMetadata(notesId, notesMetadata),
                writeNotesItem(notesId, notesDetails),
            ]);

            if (!(savedNotes && savedNotesDetails)) {
                return false;
            }
            return true;
        } catch (e) {
            console.log("save-current-notes | e", e);
            return null;
        }
    }
);

ipcMain.handle("get-notes-by-videoid", async (_, videoId) => {
    try {
        const currentVideo = await getVideoMetadataById(videoId);
        if (!currentVideo) {
            return null;
        }
        const { notesIdList } = currentVideo;
        let res = [];
        for (let i = 0; i < notesIdList.length; i++) {
            let notesMetadata = await getNotesMetadataById(notesIdList[i]);
            if (!notesMetadata) {
                continue;
            }
            res = [...res, notesMetadata];
        }
        return res.filter((note) => note !== null);
    } catch (e) {
        console.log("get-notes-by-videoid | e ", e);
        return null;
    }
});

ipcMain.handle("get-all-notes-metadata", async () => {
    try {
        return getAllNotesMetadata();
    } catch (e) {
        console.log("get-all-notes-metadata | e ", e);
        return null;
    }
});

ipcMain.handle("delete-video-record", async (_, videoId) => {
    try {
        if (!videoId) {
            return false;
        }
        // get the metadata and associated video ids
        const videoMetadata = await getVideoMetadataById(videoId);
        if (!videoMetadata) {
            return false;
        }
        const { notesIdList } = videoMetadata;
        const [
            notesContentsDeleted,
            notesDeleted,
            recordDeleted,
            snapshotsDeleted,
            transcriptsDeleted,
        ] = await Promise.all([
            deleteNotesFromList(notesIdList),
            deleteNotesMetadata(notesIdList),
            deleteVideoRecord(videoId),
            deleteSnapshotFromNote(notesIdList),
            deleteTranscript(videoId),
        ]);
        console.log("notesContentsDeleted", notesContentsDeleted);
        console.log("notesDeleted", notesDeleted);
        console.log("recordDeleted", recordDeleted);
        console.log("snapshotsDeleted", snapshotsDeleted);
        console.log("transcriptsDeleted", transcriptsDeleted);
        if (
            !notesDeleted ||
            !recordDeleted ||
            !notesContentsDeleted ||
            !snapshotsDeleted ||
            !transcriptsDeleted
        )
            return false;

        const ytId = store.get("vd." + videoId);
        store.delete("yt." + ytId);
        store.delete("vd." + videoId);

        return true;
    } catch (e) {
        console.log("delete-video-record | e", e);
        false;
    }
});

ipcMain.handle("delete-notes-record", async (_, noteId) => {
    try {
        if (!noteId) {
            return false;
        }
        const [deletedNotesMetadata, deletedNotesItems, deleteNotesSnapshots] =
            await Promise.all([
                deleteNotesMetadataById(noteId),
                deleteNotesItemById(noteId),
                deleteSnapshotsByNotesId(noteId),
            ]);
        if (
            !(deletedNotesMetadata && deletedNotesItems && deleteNotesSnapshots)
        ) {
            return false;
        }
        return true;
    } catch (e) {
        console.log("delete-video-record | e", e);
        return false;
    }
});

ipcMain.handle("get-openai-key", async () => {
    try {
        return await store.get("settings.open_ai_key");
    } catch (e) {
        return null;
    }
});
ipcMain.handle("set-openai-key", async (_, openAiKey) => {
    try {
        console.log("set-openai-key | openAiKey", openAiKey);
        await store.set("settings.open_ai_key", openAiKey);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("generate-ai-summary", async (_, notesId,videoId) => {
    try {
        /*
        1) retrieve the transcript first using videoId
        2) retrieve the OpenAI API key -> if theres no key, return null
        3) call summariseIndividualChunk to split the chunks
        4) call summariseCombinedSummaries to get the ultimate summary (to be JSON)
        5) call the notes contents which is at notesId
        6) loop the results from step 4 and create a NotesItem instance such that:
        - id: generate a new UUID
        - isSnapshot: false 
        - content: each item from step 4
        - timestamp: -1 (no timestamp)
        - snapshotId: null (do NOT fill this up)
        7) call writeNotesItem to overwrite the contents

        */
        let res= []

        return res
    } catch (e) {
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
