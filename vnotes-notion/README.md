# VNotes Notion Integration

This integration brings VNotes features to Notion, enabling video-based learning workflows directly in your Notion workspace.

## Overview

VNotes Notion allows you to leverage the core capabilities of VNotes within Notion:

- **AI Summarization/Overview**: Automatically generate comprehensive summaries of video content using AI, breaking down key points into digestible paragraphs
- **Timestamped Snapshots**: Capture and organize visual snapshots from videos with precise timestamps, linking visual references directly to specific moments in your learning materials

## Features

### Summarization/Overview

Transform video content into structured text summaries. The AI analyzes the entire video and generates:
- Paragraph-based breakdowns of key concepts
- Organized notes that capture the main ideas
- Content that can be easily integrated into your Notion pages

### Timestamped Snapshots

Capture important visual moments from videos:
- Take snapshots at specific timestamps
- Automatically link images to exact video positions
- Organize visual references alongside your notes
- Create a visual timeline of key moments in your learning materials

## Use Cases

- **Course Notes**: Summarize lecture videos and capture important diagrams or slides
- **Research**: Extract key insights from research presentations or talks
- **Documentation**: Create visual guides with timestamped references
- **Learning**: Build comprehensive study materials from video resources

## Setup

### Prerequisites

- Node.js (v14 or higher)
- A Notion account
- A Notion integration with API access

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Notion integration:
   - Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Give it a name (e.g., "VNotes Integration")
   - Select the workspace where you want to use it
   - Copy the "Internal Integration Token"

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your credentials:
   ```
   NOTION_API_KEY=your_notion_api_key_here
   NOTION_PAGE_ID=your_notion_page_id_here
   ```

5. Share your Notion page with the integration:
   - Open the Notion page where you want to add content
   - Click "Share" in the top right
   - Invite your integration by name
   - Copy the page ID from the URL (the part after the page name and before the `?`)
     - Example: `https://notion.so/My-Page-abc123def456` → page ID is `abc123def456`

## Usage

### Available Commands

Run commands using:
```bash
npm start <command>
```

#### `/overview`
Writes "overview" as a new paragraph on your Notion page.

```bash
npm start /overview
```

#### `/snapshot`
Writes "snapshot" as a new paragraph on your Notion page.

```bash
npm start /snapshot
```

### Example

```bash
# Add "overview" to your page
npm start /overview
# Output: ✓ Added "overview" to page abc123def456

# Add "snapshot" to your page
npm start /snapshot
# Output: ✓ Added "snapshot" to page abc123def456
```

## Development

The integration is built with:
- `@notionhq/client` - Official Notion JavaScript SDK
- `dotenv` - Environment variable management

Key files:
- [index.js](index.js) - Main integration logic
- [.env.example](.env.example) - Environment variable template
- [package.json](package.json) - Project dependencies and scripts
