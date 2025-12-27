# Taichuy Web Clipper

A powerful browser extension for clipping web content to your backend.

## Features

- **Content Extraction**:
  - **Smart**: Automatically detects and extracts the main article content (using Readability).
  - **Full**: Extracts the full page HTML (cleaned).
  - **Selected**: Extracts the currently highlighted text.
  - **Select Element**: Allows you to click on any element in the page to extract it.
- **Markdown Editor**: Preview and edit the extracted content using Vditor.
- **Backend Workflow**: Configure a custom JSON workflow to send data to your API.
  - Supports variable substitution: `$main_text`, `$source_url`, `$web_title`, `$author`.
  - Sequential request execution.
- **Theme**: Dark/Light mode support.

## Development & Debugging

**Do not use the `prod` build for development.** It is optimized for release and does not support hot reloading.

### 1. Start the Development Server

Open your terminal and run:

```bash
yarn dev
```

This will start the Plasmo development server and watch for file changes.
It will generate a development build in: `build/chrome-mv3-dev`

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the **`build/chrome-mv3-dev`** folder (NOT `prod`).

Now, whenever you make changes to the code, the extension will automatically reload (for most changes).

### 3. Build for Production

When you are ready to release:

```bash
yarn build
```

This generates the optimized production build in: `build/chrome-mv3-prod`
You can zip this folder to publish to the Chrome Web Store.

## Configuration

In the extension side panel, click the **Settings** (gear icon) to configure your backend workflow.

Example Workflow:
```json
[
  {
    "url": "https://your-api.com/save",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_TOKEN"
    },
    "body": {
      "title": "$web_title",
      "content": "$main_text",
      "url": "$source_url",
      "author": "$author"
    }
  }
]
```

## Tech Stack

- **Framework**: Plasmo
- **UI**: React, Ant Design
- **Editor**: Vditor
- **Extraction**: @mozilla/readability, Turndown
- **HTTP**: Axios
