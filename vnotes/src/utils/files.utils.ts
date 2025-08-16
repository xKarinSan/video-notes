import fsp from "node:fs/promises";

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

export { ensureDir, fileExists };


