# Video Notes Extension for Obsidian

An Obsidian plugin that helps you take better video notes by providing video summarization and snapshot capabilities.

## Features

### 1. Video Summarization
- Select any video embedded in your note
- Generate an AI-powered summary (with API key) or create a structured template
- Summary is automatically inserted into your note

### 2. Video Snapshots
- Capture a frame from any video at a specific timestamp
- Preview the snapshot before capturing
- Image is automatically saved to your vault and embedded in the note
- Includes timestamp information with the snapshot

## Installation

### From Release (Recommended)

1. Download the latest release from the [Releases page](https://github.com/xKarinSan/video-notes/releases)
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/video-notes-extension/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Manual Installation

1. Clone this repository or download the source code
2. Navigate to the plugin directory:
   ```bash
   cd obsidian-video-extension
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the plugin:
   ```bash
   npm run build
   ```

5. Copy the following files to your vault's plugin folder `<vault>/.obsidian/plugins/video-notes-extension/`:
   - `main.js`
   - `manifest.json`
   - `styles.css`

6. Reload Obsidian and enable the plugin in Settings → Community Plugins

## Usage

### Summarizing a Video

1. Open a note that contains an embedded video
2. Open the command palette (Ctrl/Cmd + P)
3. Search for "Summarize video"
4. Select the video you want to summarize from the list
5. The summary will be inserted at your cursor position

**Note:** For AI-powered summaries, configure your OpenAI API key in the plugin settings.

### Capturing a Video Snapshot

1. Open a note that contains an embedded video
2. Open the command palette (Ctrl/Cmd + P)
3. Search for "Capture video snapshot"
4. Select the video from the list
5. Enter a timestamp (format: MM:SS or seconds)
   - You can also click "Use current time" if the video is playing
6. Preview the frame and click "Capture snapshot"
7. The snapshot will be saved to the `attachments` folder and embedded in your note

## Configuration

Access plugin settings through Settings → Community Plugins → Video Notes Extension

### Available Settings

- **API Key**: Your OpenAI API key for AI-powered video summarization (optional)
- **API Endpoint**: The API endpoint to use for summarization (default: OpenAI)

## Supported Video Formats

The plugin works with any video format supported by your browser and embedded in your Obsidian notes:

- Embedded videos using `<video>` tags
- Videos from external sources (YouTube requires iframe, which may have limitations)
- Local video files

Example markdown for local videos:
```html
<video controls>
  <source src="path/to/your/video.mp4" type="video/mp4">
</video>
```

## Keyboard Shortcuts

You can assign custom keyboard shortcuts to the commands:

1. Go to Settings → Hotkeys
2. Search for "Video Notes"
3. Assign shortcuts to:
   - "Summarize video"
   - "Capture video snapshot"

## Troubleshooting

### No videos found

- Make sure your video is properly embedded in the note
- The video must be visible in the note's preview mode
- Try refreshing the note or reopening it

### Snapshot capture fails

- Ensure the video has loaded completely
- Some external videos may have CORS restrictions that prevent snapshot capture
- Try using local video files instead

### AI summarization not working

- Check that your API key is correctly configured in settings
- Verify that your API key has sufficient credits
- Check the developer console for error messages

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Production build
npm run build
```

### Project Structure

```
obsidian-video-extension/
├── main.ts              # Main plugin code
├── manifest.json        # Plugin manifest
├── styles.css           # Plugin styles
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── esbuild.config.mjs   # Build configuration
└── README.md            # Documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Credits

Developed by the Video Notes Team

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/xKarinSan/video-notes/issues) on GitHub.
