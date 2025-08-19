// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    listMetadata: async () => await ipcRenderer.invoke("get-all-metadata"),
    getVideodata: async (videoUrl) =>
        await ipcRenderer.invoke("add-current-video", videoUrl),
    getCurrentVideo: async (videoId) =>
        await ipcRenderer.invoke("get-current-video", videoId),
    deleteCurrentVideo: async (videoId) =>
        await ipcRenderer.invoke("delete-video-record", videoId),
});

contextBridge.exposeInMainWorld("notes", {
    createNewNotes: async (videoId) =>
        await ipcRenderer.invoke("create-new-notes", videoId),
    getCurrentNotes: async (notesId) =>
        await ipcRenderer.invoke("get-current-notes", notesId),
    getNotesByVideoId: async (videoId) =>
        await ipcRenderer.invoke("get-notes-by-videoid", videoId),

    getAllNotesMetadata: async () =>
        await ipcRenderer.invoke("get-all-notes-metadata"),
    deleteNotesMetadataById: async (notesId) =>
        await ipcRenderer.invoke("delete-notes-record", notesId),
});
