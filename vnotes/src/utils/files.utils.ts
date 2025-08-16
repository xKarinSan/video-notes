import fsp from "node:fs/promises";
import { METADATA_DIR, VIDEOS_DIR } from "../../const";
import path from "node:path";

async function ensureDir(directory) {
    await fsp.mkdir(directory, { recursive: true });
}

async function fileExists(directory) {
    try {
        await fsp.access(directory);
        return true;
    } catch {
        return false;
    }
}

async function getVideoMetadataById(video_id) {
    try {
        const videoMetadataDirectory = path.join(
            METADATA_DIR,
            `${video_id}.json`
        );
        const metadataExists = await fileExists(videoMetadataDirectory);
        if (!metadataExists) {
            return null;
        }
        const metadataContent = await fsp.readFile(
            videoMetadataDirectory,
            "utf-8"
        );
        const parsedMetadata = JSON.parse(metadataContent);
        return parsedMetadata;
    } catch {
        return null;
    }
}

async function getVideoPathById(video_id) {
    try {
        const videoFileDirectory = path.join(VIDEOS_DIR, `${video_id}.mp4`);
        const videoFileExists = await fileExists(videoFileDirectory);
        if (!videoFileExists) {
            return null;
        }
        return videoFileDirectory;
    } catch {
        return null;
    }
}

export { ensureDir, fileExists, getVideoMetadataById, getVideoPathById };
