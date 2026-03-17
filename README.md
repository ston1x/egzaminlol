# egzaminlol

Free, self-hosted Polish driving theory exam practice app (Category B).

## Prerequisites

- **Node.js** v18+
- **ffmpeg** — required for WMV video playback (`brew install ffmpeg` on macOS)
- The official source files from [gov.pl](https://www.gov.pl/web/infrastruktura/prawo-jazdy) placed in `source/`

## Source files setup

The `source/` directory is not included in this repo (files are large and have licensing constraints). Download them from the official government page and arrange like this:

```
source/
├── katalog-Table 1.csv               # converted from the .xlsx question catalogue, Use ";" as separator
├── multimedia do pytań/              # unzipped multimedia_do_pytan.zip (~8 GB)
│   ├── *.jpg
│   └── *.wmv
└── Pytania egzaminacyjne na prawo jazdy - tłumaczenia migowe 2025/
    └── *.wmv                         # sign language videos (not used yet)
```

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

Videos are transcoded from WMV to MP4 on first access (may take a few seconds) and cached in `cache/`. Subsequent plays are instant.

## Notes

- Stats (correct answers, mistakes, timestamps) are saved in `localStorage` — they persist across page reloads in the same browser.
- Use the **Resetuj** button in the header to clear all stats.
- Only Category B questions are shown. Other categories and exam-simulation mode are planned for later.
