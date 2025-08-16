// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    listMetadata: async () => await ipcRenderer.invoke("get-all-metadata"),
    getVideodata: async (video_url) =>
        await ipcRenderer.invoke("add-current-video", video_url),
    getCurrentVideo: async (video_id) =>
        await ipcRenderer.invoke("get-current-video", video_id),
});
