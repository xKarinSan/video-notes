// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
    listMetadata: () => ipcRenderer.invoke("get-all-metadata"),
    getVideodata: (video_url) =>
        ipcRenderer.invoke("get-current-video", video_url),
});
