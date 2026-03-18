# egzaminlol

Free, self-hosted Polish driving theory exam practice app (Category B).

## Prerequisites

- **Node.js** v18+
- **ffmpeg** — required for WMV video playback (`brew install ffmpeg` on macOS)
- The official source files from [gov.pl](https://www.gov.pl/web/infrastruktura/prawo-jazdy) placed in `source/`:

```
wget https://www.gov.pl/attachment/048efa83-ab53-48df-be75-45d71dc53721; wget https://www.gov.pl/pliki/mi/multimedia_do_pytan.zip; wget https://www.gov.pl/attachment/546279d3-2586-41e2-8912-3f5cab98d31d; wget https://www.gov.pl/pliki/mi/pytania_egzaminacyjne_na_prawo_jazdy_tlumaczenia_migowe_12_2025.zip
```

## Source files setup

The `source/` directory is not included in this repo (files are large and have licensing constraints).

**Automatic setup (recommended):**

```bash
bash scripts/setup.sh
```

The script downloads all files from [gov.pl](https://www.gov.pl/web/infrastruktura/prawo-jazdy), unzips them, and converts the xlsx catalogue to CSV. Requires `wget`, `unzip`, and `node` (already needed to run the app).

**Manual setup** — download and arrange like this:

```
source/
├── katalog.csv          # converted from xlsx (sheet "katalog", ";" separator)
├── multimedia/          # unzipped multimedia_do_pytan.zip (~8 GB)
│   ├── *.jpg
│   └── *.wmv
├── multimedia_cz2/      # unzipped part 2 attachment
│   ├── *.jpg
│   └── *.wmv
└── pjm/                 # sign language videos (not used yet)
    └── *.wmv
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
