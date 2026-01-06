#!/usr/bin/env node

/**
 * Pre-commit hook to check and update CLAUDE.md
 *
 * This script:
 * 1. Checks if CLAUDE.md exists
 * 2. If not, generates a new one using Claude API
 * 3. If yes, analyzes staged changes and checks for inconsistencies
 * 4. Updates CLAUDE.md if needed
 *
 * Exit codes:
 * 0 - Success, no changes needed or CLAUDE.md was generated
 * 1 - Error occurred
 * 2 - CLAUDE.md was updated, commit should be amended
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Load .env file if it exists
function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'hooks', '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
          // Skip empty lines and comments
          if (!line || line.trim().startsWith('#')) return;

          // Parse KEY=VALUE format
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';

            // Remove quotes if present
            value = value.replace(/^["']|["']$/g, '');

            // Only set if not already in environment
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
      } catch (error) {
        // Silently ignore errors reading .env files
      }
    }
  }
}

// Load environment variables from .env file
loadEnvFile();

// Configuration
const CLAUDE_MD_PATH = path.join(process.cwd(), 'CLAUDE.md');
const LOG_DIR = path.join(process.cwd(), 'hooks', 'log');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-5-20250929';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Save API interaction log
 */
function saveLogFile(logData) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const logFileName = `${timestamp}.json`;
  const logFilePath = path.join(LOG_DIR, logFileName);

  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf-8');
    log(`📊 Saved log to: hooks/log/${logFileName}`, 'cyan');
  } catch (error) {
    log(`⚠️  Failed to save log: ${error.message}`, 'yellow');
  }
}

/**
 * Check if API key is available
 */
function checkApiKey() {
  if (!API_KEY) {
    log('❌ ANTHROPIC_API_KEY environment variable not set', 'red');
    log('Please set it in your environment:', 'yellow');
    log('  export ANTHROPIC_API_KEY=your_api_key_here', 'cyan');
    log('Or create a .env file in the project root', 'cyan');
    return false;
  }
  return true;
}

/**
 * Get staged files for commit
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(f => f);
  } catch (error) {
    log('❌ Error getting staged files', 'red');
    return [];
  }
}

/**
 * Get staged diff
 */
function getStagedDiff() {
  try {
    const output = execSync('git diff --cached', { encoding: 'utf-8' });
    return output;
  } catch (error) {
    log('❌ Error getting staged diff', 'red');
    return '';
  }
}

/**
 * Read directory structure (excluding node_modules, .git, etc.)
 */
function getDirectoryStructure(dir = process.cwd(), prefix = '', maxDepth = 4, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '';

  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.vscode', '.idea', 'user_data'];
  const excludeFiles = ['.DS_Store', '.env', 'package-lock.json', 'yarn.lock'];

  let structure = '';

  try {
    const items = fs.readdirSync(dir);

    items.forEach((item, index) => {
      if (excludeDirs.includes(item) || excludeFiles.includes(item)) return;

      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';

      structure += `${prefix}${connector}${item}\n`;

      if (stats.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        structure += getDirectoryStructure(fullPath, newPrefix, maxDepth, currentDepth + 1);
      }
    });
  } catch (error) {
    // Ignore errors for inaccessible directories
  }

  return structure;
}

/**
 * Read key files to understand codebase
 */
function getKeyFiles() {
  const keyFiles = [
    'package.json',
    'vnotes/package.json',
    'vnotes-notion/package.json',
    'readme.md',
    'requirements.txt',
  ];

  const contents = {};

  keyFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        contents[file] = fs.readFileSync(fullPath, 'utf-8');
      } catch (error) {
        // Ignore errors
      }
    }
  });

  return contents;
}

/**
 * Call Claude API
 */
function callClaudeAPI(prompt, context = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const requestBody = {
      model: MODEL,
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };
    const postData = JSON.stringify(requestBody);

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Initialize log data
    const logData = {
      timestamp: new Date().toISOString(),
      context: context,
      request: {
        model: MODEL,
        max_tokens: 8000,
        prompt_length: prompt.length,
        prompt_preview: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
        full_prompt: prompt
      },
      response: null,
      token_usage: null,
      duration_ms: null,
      error: null
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        logData.duration_ms = endTime - startTime;

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);

            // Log full response
            logData.response = {
              status_code: res.statusCode,
              full_response: response,
              content_preview: response.content && response.content[0] && response.content[0].text
                ? response.content[0].text.substring(0, 500) + (response.content[0].text.length > 500 ? '...' : '')
                : null
            };

            // Extract token usage
            if (response.usage) {
              logData.token_usage = {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
                total_tokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
              };

              log(`📊 Token usage: ${logData.token_usage.input_tokens} in / ${logData.token_usage.output_tokens} out / ${logData.token_usage.total_tokens} total`, 'cyan');
            }

            // Save log
            saveLogFile(logData);

            if (response.content && response.content[0] && response.content[0].text) {
              resolve(response.content[0].text);
            } else {
              logData.error = 'Unexpected API response structure';
              saveLogFile(logData);
              reject(new Error('Unexpected API response structure'));
            }
          } catch (error) {
            logData.error = `Failed to parse API response: ${error.message}`;
            logData.response = { status_code: res.statusCode, raw_data: data };
            saveLogFile(logData);
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        } else {
          logData.error = `API request failed with status ${res.statusCode}`;
          logData.response = { status_code: res.statusCode, raw_data: data };
          saveLogFile(logData);
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      logData.error = error.message;
      logData.duration_ms = Date.now() - startTime;
      saveLogFile(logData);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Generate new CLAUDE.md from scratch
 */
async function generateNewClaudeMd() {
  log('📝 Generating new CLAUDE.md...', 'blue');

  const structure = getDirectoryStructure();
  const keyFiles = getKeyFiles();

  const prompt = `You are analyzing a codebase to create a comprehensive CLAUDE.md file.

CLAUDE.md is a special file that provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It should include:

1. Repository Overview - Brief description of what this project does
2. Architecture - Key architectural decisions and patterns
3. Project Structure - Directory layout and file organization
4. Development Commands - How to build, run, test
5. Key Components - Important files and their purposes
6. Common Patterns - Code patterns developers should follow
7. Important Notes - Critical things to know when working with this code

Here's the current directory structure:
${structure}

Here are the contents of key files:
${Object.entries(keyFiles).map(([file, content]) => `
=== ${file} ===
${content}
`).join('\n')}

Please generate a comprehensive CLAUDE.md file that will help AI assistants understand and work with this codebase effectively. Format it in clean Markdown with clear sections and headers.`;

  try {
    const claudeMd = await callClaudeAPI(prompt, {
      action: 'generate_new_claude_md',
      files_analyzed: Object.keys(keyFiles).length
    });
    fs.writeFileSync(CLAUDE_MD_PATH, claudeMd, 'utf-8');
    log('✅ Successfully generated CLAUDE.md', 'green');

    // Stage the new file
    execSync('git add CLAUDE.md');
    log('📝 Staged CLAUDE.md for commit', 'cyan');

    return 0; // Success
  } catch (error) {
    log(`❌ Error generating CLAUDE.md: ${error.message}`, 'red');
    return 1;
  }
}

/**
 * Check if CLAUDE.md needs updating based on staged changes
 */
async function checkClaudeMdConsistency() {
  log('🔍 Checking CLAUDE.md for consistency with changes...', 'blue');

  const stagedFiles = getStagedFiles();
  const stagedDiff = getStagedDiff();
  const currentClaudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

  // Skip check if only CLAUDE.md is being changed
  if (stagedFiles.length === 1 && stagedFiles[0] === 'CLAUDE.md') {
    log('ℹ️  Only CLAUDE.md is being committed, skipping consistency check', 'cyan');
    return 0;
  }

  // Skip check if no significant files changed
  const significantExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.yml', '.yaml'];
  const hasSignificantChanges = stagedFiles.some(file =>
    significantExtensions.some(ext => file.endsWith(ext))
  );

  if (!hasSignificantChanges) {
    log('ℹ️  No significant code changes detected, skipping check', 'cyan');
    return 0;
  }

  const prompt = `You are reviewing changes to a codebase and checking if the CLAUDE.md documentation needs to be updated.

CLAUDE.md is a guide for AI assistants working with this codebase. It should be kept up-to-date with significant changes.

Here are the files being changed:
${stagedFiles.join('\n')}

Here is the diff of the changes:
${stagedDiff.substring(0, 10000)} ${stagedDiff.length > 10000 ? '\n... (truncated)' : ''}

Here is the current CLAUDE.md content:
${currentClaudeMd}

Your task:
1. Analyze if the staged changes introduce any inconsistencies with CLAUDE.md
2. Check if new features, architecture changes, or important patterns are added that should be documented
3. Determine if CLAUDE.md needs updating

Respond in the following JSON format:
{
  "needs_update": true/false,
  "reason": "Brief explanation of why update is needed (or 'No updates needed')",
  "updated_content": "Full updated CLAUDE.md content (only if needs_update is true, otherwise null)"
}

Important:
- Only set needs_update to true if there are SIGNIFICANT changes that affect how developers work with the code
- Minor changes like bug fixes or small refactors usually don't need documentation updates
- If needs_update is true, provide the COMPLETE updated CLAUDE.md content, not just the changes
- Preserve the existing structure and format of CLAUDE.md`;

  try {
    const response = await callClaudeAPI(prompt, {
      action: 'check_claude_md_consistency',
      staged_files_count: stagedFiles.length,
      staged_files: stagedFiles,
      has_significant_changes: hasSignificantChanges
    });

    // Try to extract JSON from the response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('⚠️  Could not parse Claude response, assuming no update needed', 'yellow');
      return 0;
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.needs_update) {
      log('✅ CLAUDE.md is up-to-date', 'green');
      log(`   ${result.reason}`, 'cyan');
      return 0;
    }

    log('📝 CLAUDE.md needs updating:', 'yellow');
    log(`   ${result.reason}`, 'cyan');

    if (result.updated_content) {
      fs.writeFileSync(CLAUDE_MD_PATH, result.updated_content, 'utf-8');
      log('✅ Updated CLAUDE.md', 'green');

      // Stage the updated file
      execSync('git add CLAUDE.md');
      log('📝 Staged updated CLAUDE.md', 'cyan');

      return 2; // Updated - commit should be amended
    }

    return 0;
  } catch (error) {
    log(`❌ Error checking CLAUDE.md: ${error.message}`, 'red');
    log('⚠️  Allowing commit to proceed', 'yellow');
    return 0; // Don't block commit on errors
  }
}

/**
 * Main execution
 */
async function main() {
  log('🤖 CLAUDE.md Pre-commit Hook', 'magenta');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'magenta');

  // Check API key
  if (!checkApiKey()) {
    log('⚠️  Skipping CLAUDE.md check (no API key)', 'yellow');
    return 0; // Don't block commit if API key is missing
  }

  // Check if CLAUDE.md exists
  const claudeMdExists = fs.existsSync(CLAUDE_MD_PATH);

  if (!claudeMdExists) {
    log('ℹ️  CLAUDE.md does not exist', 'cyan');
    return await generateNewClaudeMd();
  } else {
    return await checkClaudeMdConsistency();
  }
}

// Run main function
main()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
