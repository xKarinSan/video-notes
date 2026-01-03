import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * Appends a new paragraph block to a Notion page
 * @param {string} pageId - The ID of the Notion page
 * @param {string} text - The text to append
 */
async function appendTextToPage(pageId, text) {
  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: text,
                },
              },
            ],
          },
        },
      ],
    });
    console.log(`✓ Added "${text}" to page ${pageId}`);
  } catch (error) {
    console.error('Error appending text to page:', error.message);
    throw error;
  }
}

/**
 * Command: /overview
 * Writes "overview" to the current page
 * @param {string} pageId - The ID of the Notion page
 */
async function overviewCommand(pageId) {
  console.log('Executing /overview command...');
  await appendTextToPage(pageId, 'overview');
}

/**
 * Command: /snapshot
 * Writes "snapshot" to the current page
 * @param {string} pageId - The ID of the Notion page
 */
async function snapshotCommand(pageId) {
  console.log('Executing /snapshot command...');
  await appendTextToPage(pageId, 'snapshot');
}

/**
 * Main function to execute commands
 */
async function main() {
  // Check if API key is set
  if (!process.env.NOTION_API_KEY) {
    console.error('Error: NOTION_API_KEY not found in environment variables');
    console.error('Please create a .env file with your Notion API key');
    process.exit(1);
  }

  // Check if page ID is provided
  if (!process.env.NOTION_PAGE_ID) {
    console.error('Error: NOTION_PAGE_ID not found in environment variables');
    console.error('Please add your Notion page ID to the .env file');
    process.exit(1);
  }

  const pageId = process.env.NOTION_PAGE_ID;
  const command = process.argv[2];

  if (!command) {
    console.log('Usage: npm start <command>');
    console.log('Available commands:');
    console.log('  /overview  - Writes "overview" to the page');
    console.log('  /snapshot  - Writes "snapshot" to the page');
    process.exit(1);
  }

  try {
    switch (command) {
      case '/overview':
        await overviewCommand(pageId);
        break;
      case '/snapshot':
        await snapshotCommand(pageId);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: /overview, /snapshot');
        process.exit(1);
    }
  } catch (error) {
    console.error('Failed to execute command:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
