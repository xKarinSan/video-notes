import { NotesItem } from "../classes/Notes";
import path from "node:path";
import { NOTES_ITEM_DIR } from "../../const";
import fsp from "node:fs/promises";
import { ensureDir } from "./files.utils";

async function writeNotesItem(notesId: string, notes: NotesItem[]) {
    try {
        await ensureDir(NOTES_ITEM_DIR);
        const notesItemFilePath = path.join(NOTES_ITEM_DIR, `${notesId}.json`);
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

export { writeNotesItem, readNotesItem };
