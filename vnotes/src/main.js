import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}

let mainWindow = null;

const createWindow = () => {
    // Create the browser window.
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

// IPC ENDPOINTS
const USER_DATA_BASE = path.resolve(process.cwd(), "user_data");

const METADATA_DIR = path.join(USER_DATA_BASE, "metadata");
const VIDEOS_DIR = path.join(USER_DATA_BASE, "videos");

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
