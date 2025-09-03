import path from "node:path";
import https from "node:https";
import fsp from "node:fs/promises";
import fs from "node:fs";

import { PATHS } from "../../const";
import { fileExists, getVideoMetadataById } from "./files.utils";

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
        let videoMetadataFilePath = path.join(PATHS.METADATA_DIR, `${videoId}.json`);
        let json_string = JSON.stringify(videoMetadata, null, 2);
        await fsp.writeFile(videoMetadataFilePath, json_string);
        return true;
    } catch {
        return false;
    }
}

async function downloadVideoFile(streamingUrl, videoId) {
    return new Promise((resolve) => {
        const videoPath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);
        const fileStream = fs.createWriteStream(videoPath);

        const req = https.get(
            streamingUrl,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                },
            },
            (res) => {
                console.log("downloadVideoFile | res", res);
                if (res.statusCode !== 200) {
                    res.resume();
                    fs.unlink(videoPath, () => resolve(false));
                    return;
                }

                res.pipe(fileStream);

                fileStream.on("finish", () => {
                    fileStream.close(() => resolve(true));
                });
            }
        );

        req.on("error", (e) => {
            console.log("e", e);
            fs.unlink(videoPath, () => resolve(false));
        });
    });
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
    downloadVideoFile,
    deleteVideoMetadata,
    deleteVideoFile,
    deleteVideoRecord,
};
