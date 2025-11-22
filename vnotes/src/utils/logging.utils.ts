import { PATHS } from "../../const";
import fs from "fs";
import path from "path";

export function logErrorToFile(
    error: Error,
    fileName: string,
    functionName: string
) {
    const timestamp = new Date().toISOString();

    // File name is today's date
    const today = timestamp.split("T")[0]; // YYYY-MM-DD
    const logPath = path.join(PATHS.LOGS_DIR, `${today}.log`);

    // Ensure logs directory exists
    if (!fs.existsSync(PATHS.LOGS_DIR)) {
        fs.mkdirSync(PATHS.LOGS_DIR, { recursive: true });
    }

    // One-line entry format
    const entry = `[${timestamp}] | Filename:${fileName} | Function:${functionName} ERROR: ${error?.stack || error}\n`;

    try {
        fs.appendFileSync(logPath, entry, "utf8");
    } catch (e) {
        console.error("Failed to write to error log file:", e);
    }
}
