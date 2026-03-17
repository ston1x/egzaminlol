#!/usr/bin/env bash
# setup.sh — downloads and unpacks all source files for egzaminlol
# Run from the project root: bash scripts/setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/source"

echo "==> egzaminlol setup"
echo "    Project root: $ROOT"
echo ""

# ── Prerequisites check ─────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' not found. $2"
    exit 1
  fi
}

check_cmd wget   "Install with: brew install wget  / sudo apt install wget"
check_cmd unzip  "Install with: brew install unzip / sudo apt install unzip"
check_cmd node   "Install from https://nodejs.org"
check_cmd npm    "Install from https://nodejs.org"

# ── Install npm dependencies (needed for xlsx conversion) ────

echo "==> Installing npm dependencies..."
npm install --prefix "$ROOT" --silent

# ── Directory setup ─────────────────────────────────────────

mkdir -p "$SOURCE"
mkdir -p "$SOURCE/multimedia do pytań"
mkdir -p "$SOURCE/cz. 2"
mkdir -p "$SOURCE/Pytania egzaminacyjne na prawo jazdy - tłumaczenia migowe 2025"

# ── Download ─────────────────────────────────────────────────

cd "$SOURCE"

echo "==> Downloading question catalogue (xlsx)..."
wget -q --show-progress -O katalog.xlsx \
  "https://www.gov.pl/attachment/048efa83-ab53-48df-be75-45d71dc53721"

echo "==> Downloading multimedia part 1 (~8 GB)..."
wget -q --show-progress -O multimedia_do_pytan.zip \
  "https://www.gov.pl/pliki/mi/multimedia_do_pytan.zip"

echo "==> Downloading multimedia part 2..."
wget -q --show-progress -O multimedia_do_pytan_cz2.zip \
  "https://www.gov.pl/attachment/546279d3-2586-41e2-8912-3f5cab98d31d"

# Temporarily commented until figured out
# echo "==> Downloading sign language videos (~10 GB)..."
# wget -q --show-progress -O pytania_tlumaczenia_migowe.zip \
#   "https://www.gov.pl/pliki/mi/pytania_egzaminacyjne_na_prawo_jazdy_tlumaczenia_migowe_12_2025.zip"

# ── Unzip ─────────────────────────────────────────────────────

echo ""
echo "==> Unzipping multimedia part 1..."
unzip -q -o multimedia_do_pytan.zip -d "multimedia do pytań"

echo "==> Unzipping multimedia part 2..."
unzip -q -o multimedia_do_pytan_cz2.zip -d "cz. 2"

# Temporarily commented until figured out
# echo "==> Unzipping sign language videos..."
# unzip -q -o pytania_tlumaczenia_migowe.zip \
#   -d "Pytania egzaminacyjne na prawo jazdy - tłumaczenia migowe 2025"

# ── Convert xlsx → CSV ────────────────────────────────────────

echo ""
echo "==> Converting xlsx to CSV..."
node "$ROOT/scripts/xlsx-to-csv.js" "$SOURCE"

# ── Done ──────────────────────────────────────────────────────

echo ""
echo "==> Done! Source files ready."
echo "    Run 'npm start' to launch the app."
