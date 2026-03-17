#!/usr/bin/env node
// Converts katalog.xlsx (sheet "katalog") → katalog-Table 1.csv with ";" delimiter
// Usage: node scripts/xlsx-to-csv.js [path/to/source]

'use strict';

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const sourceDir = process.argv[2] || path.join(__dirname, '..', 'source');
const xlsxPath = path.join(sourceDir, 'katalog.xlsx');
const csvPath = path.join(sourceDir, 'katalog-Table 1.csv');

if (!fs.existsSync(xlsxPath)) {
  console.error(`ERROR: File not found: ${xlsxPath}`);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets['katalog'];

if (!ws) {
  console.error(`ERROR: Sheet "katalog" not found in ${xlsxPath}`);
  console.error(`Available sheets: ${wb.SheetNames.join(', ')}`);
  process.exit(1);
}

const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
fs.writeFileSync(csvPath, csv, 'utf8');
console.log(`Written: ${csvPath}`);
