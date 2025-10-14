import { Whisper } from "smart-whisper";
import fs from "fs";
import path from "path";
import { app } from "electron";

process.env.GGML_VERBOSE = "1";
process.env.GGML_METAL_DEVICE = "0";
console.log("__dirname", __dirname);
console.log("process.resourcesPath", process.resourcesPath);
const modelBase = app.isPackaged
    ? path.join(process.resourcesPath, "whisper-models")
    : path.resolve(app.getAppPath(), "src/whisper-models");

const modelPath = path.join(modelBase, "ggml-tiny.en.bin");
if (!fs.existsSync(modelPath)) {
    throw new Error(`Model not found: ${modelPath}`);
}

const whisper = new Whisper(modelPath, { gpu: true });

export default whisper;
