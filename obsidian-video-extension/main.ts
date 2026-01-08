import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface VideoNotesSettings {
	apiKey: string;
	apiEndpoint: string;
}

const DEFAULT_SETTINGS: VideoNotesSettings = {
	apiKey: '',
	apiEndpoint: 'https://api.openai.com/v1/chat/completions'
}

export default class VideoNotesPlugin extends Plugin {
	settings: VideoNotesSettings;

	async onload() {
		await this.loadSettings();

		// Add command for video summarization
		this.addCommand({
			id: 'summarize-video',
			name: 'Summarize video',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new VideoSelectorModal(this.app, editor, view, 'summarize', this).open();
			}
		});

		// Add command for video snapshot
		this.addCommand({
			id: 'capture-video-snapshot',
			name: 'Capture video snapshot',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new VideoSelectorModal(this.app, editor, view, 'snapshot', this).open();
			}
		});

		// Add settings tab
		this.addSettingTab(new VideoNotesSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class VideoSelectorModal extends Modal {
	editor: Editor;
	view: MarkdownView;
	mode: 'summarize' | 'snapshot';
	plugin: VideoNotesPlugin;
	videos: HTMLVideoElement[];

	constructor(app: App, editor: Editor, view: MarkdownView, mode: 'summarize' | 'snapshot', plugin: VideoNotesPlugin) {
		super(app);
		this.editor = editor;
		this.view = view;
		this.mode = mode;
		this.plugin = plugin;
		this.videos = [];
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.mode === 'summarize' ? 'Select a video to summarize' : 'Select a video for snapshot' });

		// Find all videos in the current view
		this.videos = this.findVideosInView();

		if (this.videos.length === 0) {
			contentEl.createEl('p', { text: 'No videos found in the current note.' });
			return;
		}

		// Create a list of videos
		const videoList = contentEl.createEl('div', { cls: 'video-list' });

		this.videos.forEach((video, index) => {
			const videoItem = videoList.createEl('div', { cls: 'video-item' });

			// Video preview
			const videoPreview = videoItem.createEl('div', { cls: 'video-preview' });
			const thumbnail = videoPreview.createEl('img', { cls: 'video-thumbnail' });

			// Try to get a thumbnail
			this.captureVideoFrame(video, 0).then(dataUrl => {
				thumbnail.src = dataUrl;
			});

			// Video info
			const videoInfo = videoItem.createEl('div', { cls: 'video-info' });
			videoInfo.createEl('strong', { text: `Video ${index + 1}` });
			videoInfo.createEl('br');

			const src = video.src || video.currentSrc;
			if (src) {
				videoInfo.createEl('span', { text: `Source: ${this.truncateUrl(src)}`, cls: 'video-url' });
			}

			// Select button
			const selectBtn = videoItem.createEl('button', { text: 'Select', cls: 'mod-cta' });
			selectBtn.onclick = () => {
				this.close();
				if (this.mode === 'summarize') {
					this.summarizeVideo(video);
				} else {
					new TimestampSelectorModal(this.app, this.editor, video, this.plugin).open();
				}
			};

			videoItem.appendChild(videoPreview);
			videoItem.appendChild(videoInfo);
			videoItem.appendChild(selectBtn);
		});
	}

	findVideosInView(): HTMLVideoElement[] {
		const viewContent = this.view.containerEl;
		const videos = viewContent.querySelectorAll('video');
		return Array.from(videos);
	}

	truncateUrl(url: string): string {
		if (url.length > 50) {
			return url.substring(0, 47) + '...';
		}
		return url;
	}

	async captureVideoFrame(video: HTMLVideoElement, time: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const tempVideo = video.cloneNode(true) as HTMLVideoElement;
			tempVideo.currentTime = time;

			tempVideo.addEventListener('seeked', () => {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth || 320;
				canvas.height = video.videoHeight || 240;
				const ctx = canvas.getContext('2d');

				if (ctx) {
					ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL('image/png'));
				} else {
					reject(new Error('Could not get canvas context'));
				}
			});

			tempVideo.addEventListener('error', () => {
				reject(new Error('Could not load video'));
			});
		});
	}

	async summarizeVideo(video: HTMLVideoElement) {
		new Notice('Generating video summary...');

		try {
			// Get video metadata
			const duration = video.duration;
			const src = video.src || video.currentSrc;

			// Generate summary (placeholder - integrate with AI service)
			const summary = await this.generateSummary(video, src, duration);

			// Insert summary into the note
			const cursor = this.editor.getCursor();
			const summaryText = `\n## Video Summary\n\n${summary}\n\n`;
			this.editor.replaceRange(summaryText, cursor);

			new Notice('Video summary added to note!');
		} catch (error) {
			new Notice(`Error generating summary: ${error.message}`);
			console.error(error);
		}
	}

	async generateSummary(video: HTMLVideoElement, src: string, duration: number): Promise<string> {
		// This is a placeholder implementation
		// In a real implementation, you would:
		// 1. Extract video transcript/captions if available
		// 2. Send to an AI service (OpenAI, etc.) for summarization
		// 3. Return the generated summary

		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);

		// Check if API key is configured
		if (!this.plugin.settings.apiKey) {
			return `**Video Information:**
- Source: ${src}
- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}

*Note: To enable AI-powered summarization, please configure your API key in the plugin settings.*

**Manual Summary:**
(Add your summary here)`;
		}

		// If API key is configured, attempt to call the API
		try {
			const response = await this.callAIService(src, duration);
			return response;
		} catch (error) {
			return `**Video Information:**
- Source: ${src}
- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}

*Error generating AI summary: ${error.message}*

**Manual Summary:**
(Add your summary here)`;
		}
	}

	async callAIService(src: string, duration: number): Promise<string> {
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);

		const prompt = `Please provide a summary template for a video with the following details:
- Source: ${src}
- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}

Generate a structured summary template.`;

		const response = await fetch(this.plugin.settings.apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.plugin.settings.apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant that creates video summary templates.' },
					{ role: 'user', content: prompt }
				],
				max_tokens: 500
			})
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		const data = await response.json();
		return data.choices[0].message.content;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TimestampSelectorModal extends Modal {
	editor: Editor;
	video: HTMLVideoElement;
	plugin: VideoNotesPlugin;

	constructor(app: App, editor: Editor, video: HTMLVideoElement, plugin: VideoNotesPlugin) {
		super(app);
		this.editor = editor;
		this.video = video;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select timestamp for snapshot' });

		// Video preview
		const previewContainer = contentEl.createEl('div', { cls: 'timestamp-preview' });
		const preview = previewContainer.createEl('img', { cls: 'timestamp-preview-image' });

		// Timestamp input
		const inputContainer = contentEl.createEl('div', { cls: 'timestamp-input-container' });

		const duration = this.video.duration;
		const minutes = Math.floor(duration / 60);
		const seconds = Math.floor(duration % 60);

		inputContainer.createEl('p', { text: `Video duration: ${minutes}:${seconds.toString().padStart(2, '0')}` });

		const timestampInput = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'MM:SS or seconds',
			cls: 'timestamp-input'
		});

		// Current time button
		const currentTimeBtn = inputContainer.createEl('button', { text: 'Use current time', cls: 'mod-cta' });
		currentTimeBtn.style.marginLeft = '10px';
		currentTimeBtn.onclick = () => {
			const currentTime = this.video.currentTime;
			const mins = Math.floor(currentTime / 60);
			const secs = Math.floor(currentTime % 60);
			timestampInput.value = `${mins}:${secs.toString().padStart(2, '0')}`;
			this.updatePreview(preview, currentTime);
		};

		// Preview update on input
		timestampInput.addEventListener('input', () => {
			const time = this.parseTimestamp(timestampInput.value);
			if (time !== null && time >= 0 && time <= duration) {
				this.updatePreview(preview, time);
			}
		});

		// Capture button
		const captureBtn = contentEl.createEl('button', { text: 'Capture snapshot', cls: 'mod-cta' });
		captureBtn.style.marginTop = '20px';
		captureBtn.onclick = async () => {
			const time = this.parseTimestamp(timestampInput.value);
			if (time === null || time < 0 || time > duration) {
				new Notice('Invalid timestamp');
				return;
			}

			this.close();
			await this.captureSnapshot(time);
		};

		contentEl.appendChild(previewContainer);
		contentEl.appendChild(inputContainer);
		contentEl.appendChild(captureBtn);
	}

	parseTimestamp(input: string): number | null {
		// Try to parse MM:SS format
		if (input.includes(':')) {
			const parts = input.split(':');
			if (parts.length === 2) {
				const minutes = parseInt(parts[0]);
				const seconds = parseInt(parts[1]);
				if (!isNaN(minutes) && !isNaN(seconds)) {
					return minutes * 60 + seconds;
				}
			}
		}

		// Try to parse as seconds
		const seconds = parseFloat(input);
		if (!isNaN(seconds)) {
			return seconds;
		}

		return null;
	}

	async updatePreview(previewImg: HTMLImageElement, time: number) {
		try {
			const dataUrl = await this.captureVideoFrame(this.video, time);
			previewImg.src = dataUrl;
		} catch (error) {
			console.error('Error updating preview:', error);
		}
	}

	async captureVideoFrame(video: HTMLVideoElement, time: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const tempVideo = video.cloneNode(true) as HTMLVideoElement;
			tempVideo.currentTime = time;

			tempVideo.addEventListener('seeked', () => {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth || 640;
				canvas.height = video.videoHeight || 480;
				const ctx = canvas.getContext('2d');

				if (ctx) {
					ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL('image/png'));
				} else {
					reject(new Error('Could not get canvas context'));
				}
			});

			tempVideo.addEventListener('error', () => {
				reject(new Error('Could not load video'));
			});
		});
	}

	async captureSnapshot(time: number) {
		new Notice('Capturing snapshot...');

		try {
			const dataUrl = await this.captureVideoFrame(this.video, time);

			// Save image to vault
			const fileName = `video-snapshot-${Date.now()}.png`;
			const imageData = dataUrl.split(',')[1];
			const buffer = Buffer.from(imageData, 'base64');

			// Create attachments folder if it doesn't exist
			const attachmentsFolder = 'attachments';
			const folder = this.app.vault.getAbstractFileByPath(attachmentsFolder);
			if (!folder) {
				await this.app.vault.createFolder(attachmentsFolder);
			}

			// Save the image
			const filePath = `${attachmentsFolder}/${fileName}`;
			await this.app.vault.createBinary(filePath, buffer);

			// Insert image reference into the note
			const minutes = Math.floor(time / 60);
			const seconds = Math.floor(time % 60);
			const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

			const cursor = this.editor.getCursor();
			const imageMarkdown = `\n![Video snapshot at ${timestamp}](${filePath})\n*Snapshot captured at ${timestamp}*\n\n`;
			this.editor.replaceRange(imageMarkdown, cursor);

			new Notice('Snapshot added to note!');
		} catch (error) {
			new Notice(`Error capturing snapshot: ${error.message}`);
			console.error(error);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class VideoNotesSettingTab extends PluginSettingTab {
	plugin: VideoNotesPlugin;

	constructor(app: App, plugin: VideoNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Video Notes Extension Settings' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Enter your OpenAI API key for AI-powered video summarization (optional)')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Endpoint')
			.setDesc('API endpoint for summarization (default: OpenAI)')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1/chat/completions')
				.setValue(this.plugin.settings.apiEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.apiEndpoint = value;
					await this.plugin.saveSettings();
				}));
	}
}
