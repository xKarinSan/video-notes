import path from "node:path";
import https from "node:https";
import fsp from "node:fs/promises";
import fs, { lstat } from "node:fs";
import { NotesItem, NotesMetadata } from "../classes/Notes";
import { NOTES_DIR, VIDEOS_NOTES_MAP_DIR } from "../../const";
import { randomUUID } from "node:crypto";
import { ensureDir, getVideoMetadataById } from "./files.utils";
import { Video } from "../classes/Video";
import { downloadVideoMetadata } from "./youtubeVideo.utils";

async function createNotesMetadata(videoId) {
    try {
        const notesId = randomUUID();

        const notesMetadata: NotesMetadata = {
            id: notesId,
            videoId: videoId,
            title: "New Notes",
            createdDate: Date.now(),
            lastEdited: -1,
        };
        await ensureDir(NOTES_DIR);

        let notesMetadataFilePath = path.join(NOTES_DIR, `${notesId}.json`);
        let notesMetadataString = JSON.stringify(notesMetadata, null, 2);

        await fsp.writeFile(notesMetadataFilePath, notesMetadataString);

        // update
        const videoMetadata: Video = await getVideoMetadataById(videoId);
        videoMetadata.notesIdList = [...videoMetadata.notesIdList, notesId];
        await downloadVideoMetadata(videoMetadata, videoId);

        return notesMetadata;
    } catch (e) {
        console.log("createNotesMetadata | e", e);
        return null;
    }
}

async function deleteNotesMetadata(notesIdList) {
    try {
        await ensureDir(NOTES_DIR);
        for (const notesId of notesIdList) {
            const notesMetadataFilePath = path.join(
                NOTES_DIR,
                `${notesId}.json`
            );
            const notesMetadataExists = await fsp
                .access(notesMetadataFilePath)
                .then(() => true)
                .catch(() => false);

            if (notesMetadataExists) {
                await fsp.unlink(notesMetadataFilePath);
            }
        }
    } catch (e) {
        console.log("deleteNotesMetadata | e", e);
        return false;
    }
    return true;
}

export { createNotesMetadata, deleteNotesMetadata };
