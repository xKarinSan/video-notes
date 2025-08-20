// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");

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

        const { videoMetadata, notesMetadata, buffer } = result;

        // Read file as buffer
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: "video/mp4" });
        const blobUrl = URL.createObjectURL(blob);
        return {
            videoMetadata,
            notesMetadata,
            videoPath: blobUrl,
        };
    },
    saveCurrentNotes: async (notesId, notesMetadata) =>
        await ipcRenderer.invoke("save-current-notes", notesId, notesMetadata),
    getNotesByVideoId: async (videoId) =>
        await ipcRenderer.invoke("get-notes-by-videoid", videoId),

    getAllNotesMetadata: async () =>
        await ipcRenderer.invoke("get-all-notes-metadata"),
    deleteNotesMetadataById: async (notesId) =>
        await ipcRenderer.invoke("delete-notes-record", notesId),
});
