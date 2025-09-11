require("dotenv").config();
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");

module.exports = {
    packagerConfig: {
        asar: {
            unpack: "**/*.node", // native modules should not be inside asar
            unpackDir: "assets", // ship assets as loose files (fast to pack & load)
        },
        ignore: [
            /^\/\.git($|\/)/,
            /^\/\.github($|\/)/,
            /^\/\.idea($|\/)/,
            /^\/\.vscode($|\/)/,
            /^\/coverage($|\/)/,
            /^\/test(s)?($|\/)/,
            /^\/__tests__($|\/)/,
            /^\/docs?($|\/)/,
            /^\/demo($|\/)/,
            /^\/examples?($|\/)/,
            /(^|\/)\.env(\..*)?$/,
            /^\/README.*$/i,
            /^\/CHANGELOG.*$/i,
            /\.map$/,
            /(^|\/)vite\..*\.mjs$/,
            /(^|\/)tsconfig.*\.json$/,
            // trim junk inside node_modules
            /(^|\/)node_modules\/[^/]+\/(test|tests|__tests__|docs?|example(s)?|demo|benchmark(s)?)($|\/)/i,
            /(^|\/)node_modules\/[^/]+\/(fixtures|samples)($|\/)/i,
            /(^|\/)node_modules\/[^/]+\/.*\.(md|markdown|map|ts|tsx)$/i,
        ],
        prune: true,
        icon: path.resolve(__dirname, "assets/icon"),
        extraResource: [path.resolve(__dirname, "assets")],
        executableName: "vnotes",
        osxSign: {
            identity: process.env.MAC_CODESIGN_IDENTITY,
            "hardened-runtime": true,
            entitlements: path.resolve(__dirname, "entitlements.plist"),
            "entitlements-inherit": path.resolve(
                __dirname,
                "entitlements.plist"
            ),
            "signature-flags": "library",
        },

        osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        },
    },
    rebuildConfig: {},
    publishers: [
        {
            name: "@electron-forge/publisher-github",
            config: {
                repository: {
                    owner: "xKarinSan",
                    name: "video-notes",
                },
                draft: true,
                prerelease: false,
            },
        },
    ],
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {},
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin"],
            config: { icon: path.resolve(__dirname, "assets/icon.icns") },
        },
        {
            name: "@electron-forge/maker-deb",
            config: { icon: path.resolve(__dirname, "assets/icon.png") },
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-vite",
            config: {
                // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
                // If you are familiar with Vite configuration, it will look really familiar.
                build: [
                    {
                        // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                        entry: "src/main.js",
                        config: "vite.main.config.mjs",
                        target: "main",
                    },
                    {
                        entry: "src/preload.js",
                        config: "vite.preload.config.mjs",
                        target: "preload",
                    },
                ],
                renderer: [
                    {
                        name: "main_window",
                        config: "vite.renderer.config.mjs",
                    },
                ],
            },
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: false,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
