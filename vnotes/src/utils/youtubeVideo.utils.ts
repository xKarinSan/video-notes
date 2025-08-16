import path from "node:path";
import https from "node:https";
import fsp from "node:fs/promises";
import fs from "node:fs";

import { METADATA_DIR, VIDEOS_DIR } from "../../const";

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

async function downloadVideoMetadata(videoMetadata, video_id) {
    try {
        let videoMetadataFilePath = path.join(METADATA_DIR, `${video_id}.json`);
        let json_string = JSON.stringify(videoMetadata, null, 2);
        await fsp.writeFile(videoMetadataFilePath, json_string);
        return true;
    } catch {
        return false;
    }
}

async function downloadVideoFile(streamingUrl, videoId) {
    return new Promise((resolve) => {
        const videoPath = path.join(VIDEOS_DIR, `${videoId}.mp4`);
        const fileStream = fs.createWriteStream(videoPath);

        const req = https.get(
            streamingUrl,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                },
            },
            (res) => {
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

        req.on("error", () => {
            fs.unlink(videoPath, () => resolve(false));
        });

        fileStream.on("error", () => {
            fs.unlink(videoPath, () => resolve(false));
        });
    });
}

export { getYoutubeVideoId, downloadVideoMetadata, downloadVideoFile };
