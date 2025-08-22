// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

async function dictToBufferMap(dict) {
    const entries = await Promise.all(
        Object.entries(dict).map(async ([id, url]) => {
            const res = await fetch(url);
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer); // This is your binary data
            return [id, buffer];
        })
    );
    const res = Object.fromEntries(entries);
    console.log("dictToBufferMap | entries ", res);
    return res;
}

contextBridge.exposeInMainWorld("api", {
    listMetadata: async () => await ipcRenderer.invoke("get-all-metadata"),
    getVideodata: async (videoUrl) =>
        await ipcRenderer.invoke("add-current-video", videoUrl),
    getCurrentVideo: async (videoId) => {
        const result = await ipcRenderer.invoke("get-current-video", videoId);
        if (!result) return null;

        const { metadata, buffer } = result;

        // Read file as buffer
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: "video/mp4" });
        const blobUrl = URL.createObjectURL(blob);
        return {
            metadata,
            video_url: blobUrl,
        };
    },
    deleteCurrentVideo: async (videoId) =>
        await ipcRenderer.invoke("delete-video-record", videoId),
});

contextBridge.exposeInMainWorld("notes", {
    createNewNotes: async (videoId) =>
        await ipcRenderer.invoke("create-new-notes", videoId),
    getCurrentNotes: async (notesId) => {
        const result = await ipcRenderer.invoke("get-current-notes", notesId);
        if (!result) return null;

        const { videoMetadata, notesMetadata, currentNotesData, buffer } =
            result;

        // Read file as buffer
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: "video/mp4" });
        const blobUrl = URL.createObjectURL(blob);
        return {
            videoMetadata,
            notesMetadata,
            currentNotesData,
            videoPath: blobUrl,
        };
    },
    saveCurrentNotes: async (
        notesId,
        notesMetadata,
        notesDetails,
        snapshotIdDict
    ) => {
        console.log("snapshotIdDict", snapshotIdDict);
        const bufferDict = await dictToBufferMap(snapshotIdDict);
        return await ipcRenderer.invoke(
            "save-current-notes",
            notesId,
            notesMetadata,
            notesDetails,
            bufferDict
        );
    },

    getNotesByVideoId: async (videoId) =>
        await ipcRenderer.invoke("get-notes-by-videoid", videoId),

    getAllNotesMetadata: async () =>
        await ipcRenderer.invoke("get-all-notes-metadata"),
    deleteNotesMetadataById: async (notesId) =>
        await ipcRenderer.invoke("delete-notes-record", notesId),

    // writeNotes: async (notes, noteId) =>
    //     await ipcRenderer.invoke("write-current-notes", notes, noteId),
});
