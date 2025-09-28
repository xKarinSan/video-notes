import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import { fetchTranscript } from "youtube-transcript-plus";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";

import path from "node:path";
import fsp from "node:fs/promises";
import started from "electron-squirrel-startup";
import Store from "electron-store";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Innertube } from "youtubei.js";

import {
    getYoutubeVideoId,
    downloadVideoMetadata,
    downloadYoutubeVideoFile,
    downloadUploadedVideoFile,
    deleteVideoMetadata,
    deleteVideoFile,
    deleteVideoRecord,
} from "./utils/youtubeVideo.utils";

import { PATHS } from "../const";

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
import {
    deleteTranscript,
    getTextTranscript,
    writeYoutubeTranscript,
    writeTranscriptFallback,
    writeFallbackTranscript,
} from "./utils/transcripts.utils";
import {
    splitToChunks,
    summariseCombinedSummaries,
} from "./utils/summary.utils";
import {
    deleteVideoThumbnail,
    setVideoThumbnail,
} from "./utils/thumbnails.utils";

updateElectronApp({
    updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: "xKarinSan/video-notes",
    },
    updateInterval: "1 hour",
});
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}
let store = null;
let mainWindow = null;
let innertube = null;

const createWindow = async () => {
    const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, "assets", "icon.png")
        : path.join(".", "assets", "icon.png");

    // Create the browser window.
    store = new Store();
    innertube = await Innertube.create({
        retrieve_player: true,
        player_id: "0004de42",
    });
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    const lastPath = store.get("lastPath", "/");
    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + lastPath);
    } else {
        const indexPath = path.join(
            __dirname,
            `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
        );
        const hash = lastPath.startsWith("/") ? lastPath.slice(1) : lastPath;
        mainWindow.loadFile(indexPath, { hash });
    }
    mainWindow.webContents.openDevTools();
};
// HELPERS

// IPC ENDPOINTS
ipcMain.handle("get-all-metadata", async () => {
    await Promise.all([
        ensureDir(PATHS.METADATA_DIR),
        ensureDir(PATHS.VIDEOS_DIR),
    ]);
    const entries = await fsp.readdir(PATHS.METADATA_DIR, {
        withFileTypes: true,
    });
    const jsonFiles = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
        .map((e) => e.name);

    const items = await Promise.all(
        jsonFiles.map(async (filename) => {
            const jsonPath = path.join(PATHS.METADATA_DIR, filename);
            const baseId = filename.replace(/\.json$/i, "");
            const videoPath = path.join(PATHS.VIDEOS_DIR, `${baseId}.mp4`);
            const [raw, hasVideo] = await Promise.all([
                fsp.readFile(jsonPath, "utf8"),
                fileExists(videoPath),
            ]);

            let data = {};
            try {
                data = JSON.parse(raw);
                if (data.opName == "User") {
                    // change the thumbnail into a temporary URL for rendering process?
                    const dir = path.join(PATHS.THUMBNAILS_DIR, `${baseId}.jpeg`);
                    const buf = await fsp.readFile(dir);
                    data.thumbnail = buf;
                }
                data.id = baseId;
            } catch (e) {
                console.log("e",e);
                data = {};
            }
            console.log("get-all-metadata | data", data);
            return data;
        })
    );

    return items;
});

ipcMain.handle(
    "add-video-file",
    async (_, videoBytes, videoFileName, videoFileDuration) => {
        try {
            console.log("add-video-file");
            let res = {};

            await ensureDir(PATHS.METADATA_DIR);
            await ensureDir(PATHS.VIDEOS_DIR);
            await ensureDir(PATHS.THUMBNAILS_DIR);

            const videoId = randomUUID();

            // download the video itself
            const isVideoDownloaded = await downloadUploadedVideoFile(
                videoBytes,
                videoId
            );
            if (!isVideoDownloaded) {
                throw Error("Video download failed!");
            }

            // get thumbnails
            const videoThumbnail = await setVideoThumbnail(videoId);
            const openAIKey = await store.get("settings.open_ai_key");
            const transcriptText = await writeTranscriptFallback(
                videoId,
                openAIKey
            );
            const savedTranscript = await writeFallbackTranscript(
                videoId,
                transcriptText
            );
            if (!transcriptText || !savedTranscript) {
                throw Error("Transcript generation failed!");
            }

            const uploadDateInMs = new Date().getTime();
            const videoMetadata = {
                id: videoId,
                videoUrl: "",
                name: videoFileName,
                description: "User uploaded",
                dateExtracted: Date.now(),
                thumbnail: videoThumbnail,
                dateUploaded: uploadDateInMs,
                opName: "User",
                duration: videoFileDuration,
                notesIdList: [],
            };

            const isMetadataDownloaded = await downloadVideoMetadata(
                videoMetadata,
                videoId
            );

            if (
                !(
                    isVideoDownloaded &&
                    isMetadataDownloaded &&
                    savedTranscript &&
                    videoThumbnail != null
                )
            ) {
                await deleteVideoMetadata(videoId);
                await deleteVideoFile(videoId);
                await deleteTranscript(videoId);
                await deleteVideoThumbnail(videoId);
                throw Error("Video download failed!");
            }
            res.videoMetadata = videoMetadata;
            res.existingVideo = false;
            console.log("add-video-file  | res", res);
            return res;
        } catch (e) {
            console.log("add-video-file :", e);

            return null;
        }
    }
);

ipcMain.handle("add-youtube-video", async (_, videoUrl) => {
    try {
        const youtubeVideoId = getYoutubeVideoId(videoUrl);
        if (!youtubeVideoId) {
            return null;
        }
        await ensureDir(PATHS.METADATA_DIR);
        await ensureDir(PATHS.VIDEOS_DIR);

        let videoId = store.get("yt." + youtubeVideoId);
        let videoMetadata = {};
        let res = {};
        res.existingVideo = false;
        let videoMetadataFilePath = "";

        if (videoId) {
            videoMetadataFilePath = path.join(
                PATHS.METADATA_DIR,
                `${videoId}.json`
            );
            const raw = await fsp.readFile(videoMetadataFilePath, "utf8");
            try {
                videoMetadata = JSON.parse(raw);
                videoMetadata.id = videoId;
                res.existingVideo = true;
            } catch {
                videoMetadata = null;
            }
            res.videoMetadata = videoMetadata;
            return res;
        }

        videoId = randomUUID();
        const info = await innertube.getInfo(youtubeVideoId);
        const { basic_info, primary_info } = info;
        const {
            id: originalVideoId,
            title,
            short_description: description,
            duration,
            // video_url,
            author: opName,
            thumbnail,
        } = basic_info;

        // get the upload date
        const { published } = primary_info;
        const { text: uploadDateString } = published;
        let dateUploaded = new Date(uploadDateString).getTime();

        console.log("BEFORE download call");
        const isVideoDownloaded = await downloadYoutubeVideoFile(
            innertube,
            originalVideoId,
            videoId
        );

        console.log("AFTER download call");
        let savedTranscript = false;
        try {
            console.log("add-youtube-video | try");
            let transcript = [];

            await fetchTranscript(youtubeVideoId).then((res) => {
                transcript = res;
            });
            savedTranscript = await writeYoutubeTranscript(videoId, transcript);
        } catch (e) {
            console.log("add-youtube-video | e | before fallback", e);
            const openAIKey = await store.get("settings.open_ai_key");
            const transcriptText = await writeTranscriptFallback(
                videoId,
                openAIKey
            );
            savedTranscript = await writeFallbackTranscript(
                videoId,
                transcriptText
            );
        }
        console.log("add-youtube-video | savedTranscript");
        console.log("add-youtube-video-success");

        // download the metadata
        const largestThumbnail = thumbnail[0];
        videoMetadata = {
            id: videoId,
            videoUrl: `https://www.youtube.com/watch?v=${originalVideoId}`,
            name: title,
            description: description,
            dateExtracted: Date.now(),
            thumbnail: largestThumbnail.url,
            dateUploaded,
            opName: opName,
            duration,
            notesIdList: [],
        };

        const isMetadataDownloaded = await downloadVideoMetadata(
            videoMetadata,
            videoId
        );

        console.log("add-youtube-video | isVideoDownloaded", isVideoDownloaded);
        console.log(
            "add-youtube-video | isMetadataDownloaded",
            isMetadataDownloaded
        );

        if (!(isVideoDownloaded && isMetadataDownloaded && savedTranscript)) {
            await deleteVideoMetadata(videoId);
            await deleteVideoFile(videoId);
            await deleteTranscript(videoId);
            return null;
        }
        store.set("yt." + youtubeVideoId, videoId);
        store.set("vd." + videoId, youtubeVideoId);
        res.videoMetadata = videoMetadata;
        console.log("add-youtube-video  | res", res);
        return res;
    } catch (e) {
        console.log("add-youtube-video :", e);
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
        const snapshotPath = path.join(PATHS.SNAPSHOTS_DIR, id);
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
        if (!currentNotesMetadata) {
            return null;
        }
        const currentNotes = await readNotesItem(notesId);
        if (!currentNotes) {
            return null;
        }

        // get all snapshots contents and convert to buffer
        // snapshot path: notes_snapshot
        const snapshotBuffer = await getSnapshotBufferMap(notesId);
        if (!snapshotBuffer) {
            return null;
        }

        const { videoId } = currentNotesMetadata;
        const videoMetadata = await getVideoMetadataById(videoId);
        if (!videoMetadata) {
            return null;
        }

        const videoFilePath = await getVideoPathById(videoId);
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
            thumbnailDeleted,
        ] = await Promise.all([
            deleteNotesFromList(notesIdList),
            deleteNotesMetadata(notesIdList),
            deleteVideoRecord(videoId),
            deleteSnapshotFromNote(notesIdList),
            deleteTranscript(videoId),
            deleteVideoThumbnail(videoId),
        ]);
        if (
            !notesDeleted ||
            !recordDeleted ||
            !notesContentsDeleted ||
            !snapshotsDeleted ||
            !transcriptsDeleted ||
            !thumbnailDeleted
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
        await store.set("settings.open_ai_key", openAiKey);
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle("generate-ai-summary", async (_, videoId) => {
    try {
        let res = [];
        let videoTranscript = await getTextTranscript(videoId);
        if (!videoTranscript) {
            return null;
        }
        let openAIKey = await store.get("settings.open_ai_key");
        if (!openAIKey) {
            return null;
        }
        let chunks = await splitToChunks(videoTranscript);
        if (!chunks) {
            return null;
        }
        let summary = await summariseCombinedSummaries(chunks, openAIKey);
        if (!summary) {
            return null;
        }
        summary.forEach((paragraph) => {
            res = [
                ...res,
                {
                    id: randomUUID(),
                    isSnapshot: false,
                    content: paragraph,
                    timestamp: -1,
                },
            ];
        });
        return res;
    } catch (e) {
        console.log("generate-ai-summary | e", e);
        return null;
    }
});
+ipcMain.on("save-path", (_evt, p) => {
    try {
        const val = typeof p === "string" && p.length ? p : "/";
        store?.set("lastPath", val);
    } catch {}
});

// APP LIFECYCLE
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    if (process.platform === "darwin") {
        const iconPath = app.isPackaged
            ? path.join(process.resourcesPath, "assets", "icon.png")
            : path.join(".", "assets", "icon.png");
        app.dock.setIcon(iconPath);
    }
    createWindow();
    const rootDataPath = app.getPath("userData");

    // Check if the folder exists
    if (!fs.existsSync(rootDataPath)) {
        fs.mkdirSync(rootDataPath, { recursive: true });
    }
    PATHS.USER_DATA_BASE = path.join(rootDataPath, "user_data");
    PATHS.METADATA_DIR = path.join(PATHS.USER_DATA_BASE, "metadata");

    PATHS.VIDEOS_DIR = path.join(PATHS.USER_DATA_BASE, "videos");
    PATHS.NOTES_DIR = path.join(PATHS.USER_DATA_BASE, "notes");
    PATHS.NOTES_ITEM_DIR = path.join(PATHS.USER_DATA_BASE, "notes_items");
    PATHS.SNAPSHOTS_DIR = path.join(PATHS.USER_DATA_BASE, "snapshots");
    PATHS.TRANSCRIPTS_DIR = path.join(PATHS.USER_DATA_BASE, "transcripts");
    PATHS.TIMESTAMPED_TRANSCRIPTS_DIR = path.join(
        PATHS.USER_DATA_BASE,
        "timestamped_transcripts"
    );

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
