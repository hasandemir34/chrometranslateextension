<<<<<<< HEAD
# Select & Translate

A Chrome extension that shows an instant translation in a small popup next to your text selection on any website.

The source language is detected automatically; you choose the target language.

---

## Features

- Works on all websites
- Instant translation popup when you select text
- Automatic source language detection
- 28+ target languages
- Change language from the translation popup or the extension icon
- Selected language syncs to your Chrome account (`chrome.storage.sync`)
- 5-minute cache for the same text and language
- Google Translate as primary, MyMemory as fallback translation service
- Supports text selections up to 500 characters

---

## Installation

1. Go to `chrome://extensions` in Chrome.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this project folder.

After installing, you may need to refresh open tabs (F5).

---

## Usage

### Translating text

1. Select text on any website with your mouse (left click + drag).
2. A translation popup appears near your selection.
3. The translation shows within a few seconds.

Keyboard selection (Shift + arrow keys) is also supported.

### Changing the language

**From the translation popup:**
- Choose the target language from the dropdown in the popup header.
- Your choice is saved automatically and the current text is re-translated.

**From the extension icon:**
- Click the extension icon in the toolbar.
- Set your default target language in the popup window.

### Closing the popup

- Click the **×** button, or
- Click elsewhere on the page, or
- Scroll the page

---

## Supported languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| tr | Turkish | en | English |
| de | German | fr | French |
| es | Spanish | it | Italian |
| pt | Portuguese | ru | Russian |
| ar | Arabic | zh | Chinese |
| ja | Japanese | ko | Korean |
| nl | Dutch | pl | Polish |
| sv | Swedish | uk | Ukrainian |
| hi | Hindi | id | Indonesian |
| vi | Vietnamese | el | Greek |
| ro | Romanian | cs | Czech |
| da | Danish | fi | Finnish |
| hu | Hungarian | no | Norwegian |
| he | Hebrew | th | Thai |

Default target language: **Turkish**

---

## Project structure

```
translate/
├── manifest.json       # Extension definition (Manifest V3)
├── background.js       # Translation API requests and cache
├── content.js          # Text selection detection and translation popup
├── languages.js        # Supported languages list
├── popup.html          # Extension icon settings popup
├── popup.js            # Language preference save logic
├── popup.css           # Settings popup styles
├── create-icons.ps1    # Icon generation script (developer)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How it works

```
User selects text
        ↓
content.js detects the selection
        ↓
background.js sends a request to the translation API
        ↓
Result is shown in the popup
```

1. **content.js** — Listens for text selection on the page and creates a popup isolated from site CSS via Shadow DOM.
2. **background.js** — Sends requests to Google Translate or MyMemory API and caches the result.
3. **languages.js** — Centrally defines the language list and labels.
4. **popup.html/js** — Manages the user's default target language preference.

---

## Development

### Reloading the extension

After code changes:

1. Go to `chrome://extensions` → click **Reload** (↻)
2. Refresh the tab you're testing with **F5**

### Regenerating icons

```powershell
powershell -ExecutionPolicy Bypass -File create-icons.ps1
```

---

## Limitations

- Requires an **internet connection**.
- Does not work on `chrome://` pages or the Chrome Web Store.
- Translation quality depends on the service used; this is not an official translation tool.
- PDF viewers and some custom iframes may block text selection.
- Maximum of **500 characters** per translation.

---

## Version

**v1.1.0** — Multi-target language support, language settings popup, instant language switching in the translation popup.

---

## License

This project was built for personal use.
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 97accdc (İlk commit: Chrome Translate Extension)
