import path from "node:path";
import https from "node:https";
import fsp from "node:fs/promises";
import fs from "node:fs";
import { promises as pfs } from "fs";
import { pipeline } from "node:stream/promises";
import { PATHS } from "../../const";
import { ensureDir, fileExists, getVideoMetadataById } from "./files.utils";

function getYoutubeVideoId(url) {
    try {
        const parsed = new URL(url);
        // Match main YouTube domains
        if (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com"
        ) {
            if (!parsed.pathname === "/watch" && parsed.searchParams.has("v")) {
                return null;
            }
            return parsed.searchParams.get("v").replace(/^\//, "");
        }

        // Match youtu.be short links
        if (parsed.hostname === "youtu.be") {
            if (parsed.pathname.length <= 1) {
                return null;
            }
            return parsed.pathname.slice(1);
        }

        return null;
    } catch (e) {
        console.log("e", e);
        return null;
    }
}

async function downloadVideoMetadata(videoMetadata, videoId) {
    try {
        let videoMetadataFilePath = path.join(
            PATHS.METADATA_DIR,
            `${videoId}.json`
        );
        let json_string = JSON.stringify(videoMetadata, null, 2);
        await fsp.writeFile(videoMetadataFilePath, json_string);
        return true;
    } catch {
        return false;
    }
}

async function downloadYoutubeVideoFile(innertube, youtubeVideoId, videoId) {
    await ensureDir(PATHS.VIDEOS_DIR);
    const videoPath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
    await fs.promises.mkdir(PATHS.VIDEOS_DIR, { recursive: true });

    try {
        // Ask youtubei for a muxed (video+audio) MP4 stream
        const stream = await innertube.download(youtubeVideoId, {
            type: "video+audio",
            quality: "best",
            format: "mp4",
            client: "ANDROID",
        });
        await pipeline(stream, fs.createWriteStream(videoPath));
        return true;
    } catch (err) {
        console.log("downloadYoutubeVideoFile | err", err);
        return false;
    }
}

async function downloadUploadedVideoFile(videoBytes, videoId) {
    try {
        /*
1. Get the bytes
2. Get the path
3. Write the bytes into the path
        */
        const videoPath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        await pfs.writeFile(videoPath, Buffer.from(videoBytes));
        return true;
    } catch (e) {
        console.log("downloadUploadedVideoFile error", e);
        return false;
    }
}

async function deleteVideoMetadata(videoId) {
    try {
        const videoMetadataFilePath = path.join(
            PATHS.METADATA_DIR,
            `${videoId}.json`
        );
        if (await fileExists(videoMetadataFilePath)) {
            await fsp.unlink(videoMetadataFilePath);
        }
        return true;
    } catch {
        return false;
    }
}

async function deleteVideoFile(videoId) {
    try {
        const videoFilePath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        if (await fileExists(videoFilePath)) {
            await fsp.unlink(videoFilePath);
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function deleteVideoRecord(videoId) {
    try {
        const videoMetadata = await getVideoMetadataById(videoId);
        if (!videoMetadata) return false;

        const [videoFileDeleted, videoMetadataDeleted] = await Promise.all([
            deleteVideoFile(videoId),
            deleteVideoMetadata(videoId),
        ]);

        if (!videoFileDeleted || !videoMetadataDeleted) return false;

        return true;
    } catch (e) {
        console.error("deleteVideoRecord error:", e);
        return false;
    }
}

export {
    getYoutubeVideoId,
    downloadVideoMetadata,
    downloadYoutubeVideoFile,
    downloadUploadedVideoFile,
    deleteVideoMetadata,
    deleteVideoFile,
    deleteVideoRecord,
};
