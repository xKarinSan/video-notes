import { Whisper } from "smart-whisper";
import path from "path";
import { app } from "electron";

process.env.GGML_VERBOSE = "1";
process.env.GGML_METAL_DEVICE = "0";
console.log("__dirname", __dirname);
const modelBase = app.isPackaged
    ? path.join(process.resourcesPath, "whisper-models")
    : path.resolve(app.getAppPath(), "src/whisper.cpp/models");

const modelPath = path.join(modelBase, "ggml-tiny.en.bin");
const whisper = new Whisper(modelPath, { gpu: true });

export default whisper;
