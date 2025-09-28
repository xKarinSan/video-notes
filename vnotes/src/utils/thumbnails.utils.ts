import { nativeImage } from "electron";
import path from "node:path";
import fsp from "node:fs/promises";
import { PATHS } from "../../const";
import { ensureDir, fileExists } from "./files.utils";

async function setVideoThumbnail(videoId: string) {
    try {
        console.log("getSystemThumbnail | starting");
        await ensureDir(PATHS.VIDEOS_DIR);
        await ensureDir(PATHS.THUMBNAILS_DIR);

        const videoPath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        const outPath = path.join(PATHS.THUMBNAILS_DIR, `${videoId}.jpeg`);
        console.log("getSystemThumbnail | videoPath", videoPath);
        console.log("getSystemThumbnail | outPath", outPath);

        const image = await nativeImage.createThumbnailFromPath(videoPath, {
            width: 1920,
            height: 1080,
        });
        console.log("getSystemThumbnail | image", image);

        if (!image.isEmpty()) {
            await fsp.writeFile(outPath, image.toJPEG(85));
            console.log("getSystemThumbnail | done");
            return outPath;
        }

        return null;
    } catch (e) {
        console.log("getSystemThumbnail | e", e);
        return null;
    }
}

async function deleteVideoThumbnail(videoId: string) {
    try {
        await ensureDir(PATHS.THUMBNAILS_DIR);
        const thumbnailPath = path.join(
            PATHS.THUMBNAILS_DIR,
            `${videoId}.jpeg`
        );
        const thumbnailExists = await fileExists(thumbnailPath);
        if (thumbnailExists) {
            await fsp.unlink(thumbnailPath);
        }
        return true;
    } catch (e) {
        return;
    }
}

export { setVideoThumbnail, deleteVideoThumbnail };
