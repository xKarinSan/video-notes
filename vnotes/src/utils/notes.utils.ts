import path from "node:path";
import fsp from "node:fs/promises";
import { NotesMetadata } from "../classes/Notes";
import { NOTES_DIR } from "../../const";
import { randomUUID } from "node:crypto";
import {
    ensureDir,
    getNotesMetadataById,
    getVideoMetadataById,
} from "./files.utils";
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

async function saveNotesMetadata(notesId, notesMetadata) {
    try {
        await ensureDir(notesId);
        notesMetadata.lastEdited = Date.now();
        let notesMetadataFilePath = path.join(NOTES_DIR, `${notesId}.json`);
        let notesMetadataString = JSON.stringify(notesMetadata, null, 2);
        await fsp.writeFile(notesMetadataFilePath, notesMetadataString);
        return true;
    } catch (e) {
        return false;
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

async function deleteNotesMetadataById(noteId) {
    try {
        const notesMetadataFilePath = path.join(NOTES_DIR, `${noteId}.json`);
        const notesMetadata: NotesMetadata = await getNotesMetadataById(noteId);
        if (!notesMetadata) {
            return false;
        }

        // get the video id the notes belong to
        const { videoId } = notesMetadata;
        const videoMetadata: Video = await getVideoMetadataById(videoId);
        if (!videoMetadata) {
            return false;
        }

        // remove the noteId from the list
        videoMetadata.notesIdList = videoMetadata.notesIdList.filter(
            (id) => id !== noteId
        );

        await downloadVideoMetadata(videoMetadata, videoId);

        // remove the file
        const notesMetadataExists = await fsp
            .access(notesMetadataFilePath)
            .then(() => true)
            .catch(() => false);

        if (notesMetadataExists) {
            await fsp.unlink(notesMetadataFilePath);
            return true;
        }
        return false;
    } catch (e) {
        console.log("deleteNotesMetadataById | e", e);
        return false;
    }
}

export {
    createNotesMetadata,
    deleteNotesMetadata,
    deleteNotesMetadataById,
    saveNotesMetadata,
};
