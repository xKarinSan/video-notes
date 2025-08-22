import { NotesItem } from "../classes/Notes";
import path from "node:path";
import { NOTES_ITEM_DIR, SNAPSHOTS_DIR } from "../../const";
import fsp from "node:fs/promises";
import { ensureDir, fileExists } from "./files.utils";

async function writeNotesItem(notesId: string, notes: NotesItem[]) {
    try {
        await ensureDir(NOTES_ITEM_DIR);
        const notesItemFilePath = path.join(NOTES_ITEM_DIR, `${notesId}.json`);
        console.log("notesItemFilePath", notesItemFilePath);
        notes.map((note: NotesItem) => {
            note.content = note.snapshotId ?? note.content;
        });

        const notesItemString = JSON.stringify(notes, null, 2);
        await fsp.writeFile(notesItemFilePath, notesItemString);
        return true;
    } catch (e) {
        console.error("writeNotesItem | e", e);
        return false;
    }
}

async function readNotesItem(notesId) {
    try {
        const notesItemFilePath = path.join(NOTES_ITEM_DIR, `${notesId}.json`);
        const notesItemExists = await fsp
            .access(notesItemFilePath)
            .then(() => true)
            .catch(() => false);
        if (!notesItemExists) {
            return null;
        }

        const notesItemContent = await fsp.readFile(notesItemFilePath, "utf-8");
        return JSON.parse(notesItemContent);
    } catch (e) {
        console.error("readNotesItem | e", e);
        return null;
    }
}

async function deleteNotesFromList(notesIdList) {
    try {
        await ensureDir(NOTES_ITEM_DIR);
        for (const notesId of notesIdList) {
            const notesItemsFilePath = path.join(
                NOTES_ITEM_DIR,
                `${notesId}.json`
            );
            const notesItemsExists = await fsp
                .access(notesItemsFilePath)
                .then(() => true)
                .catch(() => false);

            if (notesItemsExists) {
                await fsp.unlink(notesItemsFilePath);
            }
        }
        return true;
    } catch (e) {
        console.log("deleteNotesMetadata | e", e);
        return false;
    }
}

async function deleteNotesItemById(notesId) {
    try {
        const notesItemFilePath = path.join(NOTES_ITEM_DIR, `${notesId}.json`);
        await fsp.unlink(notesItemFilePath);
        return true;
    } catch (e) {
        console.error("deleteNotesItem | e", e);
        return false;
    }
}

async function syncSnapshots(notesId, notesDetails, bufferDict) {
    try {
        const currSnapshotsPath = path.join(SNAPSHOTS_DIR, notesId);
        ensureDir(currSnapshotsPath);
        // find all that is matching (union)
        // find the ones that are missing in note
        let oldSnapshotIds = new Set();
        notesDetails.map(async (note: NotesItem) => {
            if (note.snapshotId) {
                const { snapshotId } = note;
                // if old not inside dict, throw it away
                if (!(snapshotId in bufferDict)) {
                    // delete
                    const snapshotPath = path.join(
                        currSnapshotsPath,
                        `${snapshotId}.jpg`
                    );
                    const snapshotExists = await fileExists(snapshotPath);
                    if (snapshotExists) {
                        await fsp.unlink(snapshotPath);
                    }
                } else {
                    oldSnapshotIds.add(snapshotId);
                }
            }
        });

        // save the new ones
        const saves = [];
        for (const [id, buffer] of Object.entries(bufferDict)) {
            if (oldSnapshotIds.has(id)) continue;

            const snapshotPath = path.join(currSnapshotsPath, `${id}.jpg`);
            saves.push(fsp.writeFile(snapshotPath, buffer));
        }

        await Promise.all(saves);
        return true;
    } catch (e) {
        console.error("syncSnapshots | e", e);
        return false;
    }
}

async function dictToBase64Map(dict) {
    const entries = await Promise.all(
        Object.entries(dict).map(async ([id, url]) => {
            const res = await fetch(url);
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            return [id, { base64, mime: blob.type }];
        })
    );
    return Object.fromEntries(entries);
}

async function getSnapshotBufferMap(notesId) {
    try {
        const dir = path.join(SNAPSHOTS_DIR, notesId);
        const files = await fsp.readdir(dir);
        const entries = await Promise.all(
            files
                .filter((f) => f.endsWith(".jpg"))
                .map(async (name) => {
                    const id = path.basename(name, ".jpg");
                    const buf = await fsp.readFile(path.join(dir, name));
                    return [id, buf];
                })
        );
        console.log("getSnapshotBufferMap | entries", entries);
        return Object.fromEntries(entries); // { [snapshotId]: Buffer }
    } catch (e) {
        console.error("getSnapshotBufferMap | e", e);
        return null;
    }
}

async function deleteSnapshotsByNotesId(notesId) {
    try {
        const snapshotsFilePath = path.join(SNAPSHOTS_DIR, notesId);
        console.log("snapshotsFilePath", snapshotsFilePath);
        const snapshotsExist = await fileExists(snapshotsFilePath);

        if (snapshotsExist) {
            // await fsp.unlink(snapshotsFilePath);
            await fsp.rm(snapshotsFilePath, { recursive: true, force: true });
            return true;
        }
        return true;
    } catch (e) {
        console.log("e", e);
        return false;
    }
}

async function deleteSnapshotFromNote(notesIdList) {
    try {
        await ensureDir(SNAPSHOTS_DIR);
        for (const notesId of notesIdList) {
            console.log("deleteSnapshotFromNote | notesId: ",notesId)
            const snapshotsFilePath = path.join(SNAPSHOTS_DIR, notesId);
            const snapshotsExist = await fileExists(snapshotsFilePath);

            if (snapshotsExist) {
                await fsp.rm(snapshotsFilePath, {
                    recursive: true,
                    force: true,
                });
            }
        }
        return true;
    } catch (e) {
        console.log("deleteSnapshotFromNote | e", e);
        return false;
    }
}

export {
    writeNotesItem,
    readNotesItem,
    deleteNotesItemById,
    deleteNotesFromList,
    syncSnapshots,
    getSnapshotBufferMap,
    dictToBase64Map,
    deleteSnapshotsByNotesId,
    deleteSnapshotFromNote,
};
