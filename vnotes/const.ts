import path from "node:path";
import { app } from "electron";

export const PATHS = {
    USER_DATA_BASE: path.resolve(app.getPath("userData"), "user_data"),
    METADATA_DIR: "",
    VIDEOS_DIR: "",
    THUMBNAILS_DIR: "",
    NOTES_DIR: "",
    NOTES_ITEM_DIR: "",
    SNAPSHOTS_DIR: "",
    TRANSCRIPTS_DIR: "",
    TIMESTAMPED_TRANSCRIPTS_DIR: "",
};

PATHS.METADATA_DIR = path.join(PATHS.USER_DATA_BASE, "metadata");
PATHS.VIDEOS_DIR = path.join(PATHS.USER_DATA_BASE, "videos");
PATHS.THUMBNAILS_DIR = path.join(PATHS.USER_DATA_BASE, "thumbnails");
PATHS.NOTES_DIR = path.join(PATHS.USER_DATA_BASE, "notes");
PATHS.NOTES_ITEM_DIR = path.join(PATHS.USER_DATA_BASE, "notes_items");
PATHS.SNAPSHOTS_DIR = path.join(PATHS.USER_DATA_BASE, "snapshots");
PATHS.TRANSCRIPTS_DIR = path.join(PATHS.USER_DATA_BASE, "transcripts");
PATHS.TIMESTAMPED_TRANSCRIPTS_DIR = path.join(
    PATHS.USER_DATA_BASE,
    "timestamped_transcripts"
);

console.log("VIDEOS_DIR:", PATHS.VIDEOS_DIR);
console.log("THUMBNAILS_DIR:", PATHS.THUMBNAILS_DIR);
