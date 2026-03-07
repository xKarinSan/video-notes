import path from "node:path";
import fsp from "node:fs/promises";
import { promises as pfs } from "fs";
import { PATHS } from "../../const";
import { ensureDir, fileExists, getVideoMetadataById } from "./files.utils";
import { createRequire } from "node:module";

const requireRuntime = createRequire(import.meta.url);

function resolveYtDlpPath(): string {
    const constants = requireRuntime("youtube-dl-exec/src/constants");
    let p: string = constants.YOUTUBE_DL_PATH;
    if (p.includes("app.asar"))
        p = p.replace("app.asar", "app.asar.unpacked");
    return p;
}

function resolveFfmpegPath(): string {
    let p = requireRuntime("ffmpeg-static") as string;
    if (p.includes("app.asar"))
        p = p.replace("app.asar", "app.asar.unpacked");
    return p;
}

function createYtDlp() {
    const { create } = requireRuntime("youtube-dl-exec");
    return create(resolveYtDlpPath());
}

function getYoutubeVideoId(url) {
    try {
        const parsed = new URL(url);
        if (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com"
        ) {
            if (parsed.pathname !== "/watch" || !parsed.searchParams.has("v")) {
                return null;
            }
            return parsed.searchParams.get("v").replace(/^\//, "");
        }

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

async function getYoutubeVideoMetadata(videoUrl: string) {
    const ytdlp = createYtDlp();
    const info = await ytdlp(videoUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
    });
    return info;
}

async function downloadYoutubeVideoFile(videoUrl: string, videoId: string) {
    await ensureDir(PATHS.VIDEOS_DIR);
    const videoPath = path.join(PATHS.VIDEOS_DIR, `${videoId}.mp4`);

    try {
        const ytdlp = createYtDlp();
        await ytdlp(videoUrl, {
            format: "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best",
            output: videoPath,
            mergeOutputFormat: "mp4",
            ffmpegLocation: resolveFfmpegPath(),
            noCheckCertificates: true,
            concurrentFragments: 4,
        });
        return true;
    } catch (err) {
        console.log("downloadYoutubeVideoFile | err", err);
        return false;
    }
}

async function downloadUploadedVideoFile(videoBytes, videoId) {
    try {
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
    getYoutubeVideoMetadata,
    downloadYoutubeVideoFile,
    downloadUploadedVideoFile,
    deleteVideoMetadata,
    deleteVideoFile,
    deleteVideoRecord,
};
