#!/usr/bin/env node
// Converts katalog.xlsx (sheet "katalog") → katalog-Table 1.csv with ";" delimiter
// Usage: node scripts/xlsx-to-csv.js [path/to/source]

'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const sourceDir = process.argv[2] || path.join(__dirname, '..', 'source');
const xlsxPath = path.join(sourceDir, 'katalog.xlsx');
const csvPath = path.join(sourceDir, 'katalog.csv');

if (!fs.existsSync(xlsxPath)) {
  console.error(`ERROR: File not found: ${xlsxPath}`);
  process.exit(1);
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  const ws = workbook.getWorksheet('katalog');
  if (!ws) {
    const names = workbook.worksheets.map(s => s.name).join(', ');
    console.error(`ERROR: Sheet "katalog" not found. Available sheets: ${names}`);
    process.exit(1);
  }

  const colCount = ws.columnCount;
  const lines = [];

  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells = [];
    for (let i = 1; i <= colCount; i++) {
      const val = String(row.getCell(i).text ?? '').replace(/[\n\r]/g, ' ');
      cells.push(val);
    }
    lines.push(cells.join(';'));
  });

  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
  console.log(`Written: ${csvPath}`);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
