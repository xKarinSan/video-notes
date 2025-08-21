import path from "node:path";

const USER_DATA_BASE = path.resolve(process.cwd(), "user_data");
const METADATA_DIR = path.join(USER_DATA_BASE, "metadata");
const VIDEOS_DIR = path.join(USER_DATA_BASE, "videos");
const VIDEOS_NOTES_MAP_DIR = path.join(USER_DATA_BASE, "video_notes_map");
const NOTES_DIR = path.join(USER_DATA_BASE, "notes");
const NOTES_ITEM_DIR = path.join(USER_DATA_BASE, "notes_items");

export {
    USER_DATA_BASE,
    METADATA_DIR,
    VIDEOS_DIR,
    NOTES_DIR,
    VIDEOS_NOTES_MAP_DIR,
    NOTES_ITEM_DIR,
};
