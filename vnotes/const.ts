import path from "node:path";

const USER_DATA_BASE = path.resolve(process.cwd(), "user_data");
const METADATA_DIR = path.join(USER_DATA_BASE, "metadata");
const VIDEOS_DIR = path.join(USER_DATA_BASE, "videos");

export { USER_DATA_BASE, METADATA_DIR, VIDEOS_DIR };
