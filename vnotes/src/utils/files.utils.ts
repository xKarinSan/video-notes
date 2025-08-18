import fsp from "node:fs/promises";
import { METADATA_DIR, NOTES_DIR, VIDEOS_DIR } from "../../const";
import path from "node:path";
import { NotesMetadata } from "../classes/Notes";

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

async function getVideoMetadataById(videoId) {
    try {
        const videoMetadataDirectory = path.join(
            METADATA_DIR,
            `${videoId}.json`
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

async function getVideoPathById(videoId) {
    try {
        const videoFileDirectory = path.join(VIDEOS_DIR, `${videoId}.mp4`);
        const videoFileExists = await fileExists(videoFileDirectory);
        if (!videoFileExists) {
            return null;
        }
        return videoFileDirectory;
    } catch {
        return null;
    }
}

async function getNotesMetadataById(notesId) {
    try {
        const notesMetadataDirectory = path.join(NOTES_DIR, `${notesId}.json`);
        const notesMetadataExists = await fileExists(notesMetadataDirectory);

        if (!notesMetadataExists) {
            return null;
        }
        const notesMetadataContent = await fsp.readFile(
            notesMetadataDirectory,
            "utf-8"
        );
        const parsedMetadata = JSON.parse(notesMetadataContent);
        return parsedMetadata;
    } catch (e) {
        return null;
    }
}

async function getAllNotesMetadata() {
    try {
        const files = await fsp.readdir(NOTES_DIR);
        const notesMetadataList: NotesMetadata[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const notesId = file.replace(".json", "");
                const metadata: NotesMetadata =
                    await getNotesMetadataById(notesId);
                if (metadata) {
                    notesMetadataList.push(metadata);
                }
            }
        }

        return notesMetadataList;
    } catch (e) {
        return null;
    }
}

export {
    ensureDir,
    fileExists,
    getVideoMetadataById,
    getVideoPathById,
    getNotesMetadataById,
    getAllNotesMetadata,
};
