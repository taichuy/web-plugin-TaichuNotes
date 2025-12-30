# Taichu Notes (Taichuy Web Clipper)

[中文](./README_CN.md) | **English**

A powerful browser extension for clipping web content to your backend.

## Our Story

Taichu Notes was my first startup project. Unsurprisingly, it failed. I integrated some of its original features into TaichuY. I thought Taichu Notes would remain a memory forever, but when deciding on a name for this plugin, I retrieved it from the depths of my drawer.

Now, please let me introduce Taichu Notes to you again.

Taichu Notes is a browser plugin that supports quick clipping and extracting of web content, editing, and end-to-end transmission to your configured push services—even directly to locally deployed ones.

I hope this plugin helps you capture those fleeting moments of inspiration.

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

## Development Commands

### Install Dependencies
```bash
yarn install
```

### Run Development Environment
```bash
yarn dev
```
This will start the Plasmo development server and watch for file changes.
Load the `build/chrome-mv3-dev` directory in `chrome://extensions`.

### Build for Production

#### Chrome / Edge / Chromium Browsers
```bash
yarn build
```
This generates the optimized production build in `build/chrome-mv3-prod`.

#### Firefox
```bash
yarn build:firefox
```
This generates the build for Firefox in `build/firefox-mv2-prod`.

#### Package Extension (Generate .zip)
```bash
yarn package          # Chrome/Edge/General
yarn package:firefox  # Firefox
yarn package:edge     # Edge specific
```
The generated `.zip` files will be in the `build` directory, ready for store submission.

## Browser Compatibility

This extension is built with Plasmo and supports major browsers:

| Browser | Engine | Compatibility | Note |
| :--- | :--- | :--- | :--- |
| **Google Chrome** | Chromium | ✅ Supported | Use `yarn build` |
| **Microsoft Edge** | Chromium | ✅ Supported | Use `yarn build` or `yarn build:edge` |
| **Firefox** | Gecko | ✅ Supported | Use `yarn build:firefox` (Manifest V2) |
| **Brave / Vivaldi** | Chromium | ✅ Supported | Use `yarn build` |
| **Other Chromium** | Chromium | ✅ Supported | Use `yarn build` |

## Support Us

This project is open-source and free. Core features will always be free.
If you find it helpful, please consider a small donation to support maintenance.

### PayPal

[Scan QR Code or Click to Donate]

<img src="assets/author/Supporting the-qrcode.png" alt="PayPal QR Code" width="200" />

[**Donate with PayPal**](https://www.paypal.com/ncp/payment/54J8F52JA4ZXC)
