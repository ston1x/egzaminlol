'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '..', 'source', 'katalog.csv');

function loadQuestions() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');

  const records = parse(raw, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const questions = [];

  for (const row of records) {
    const categories = (row['Kategorie'] || '').split(',').map(c => c.trim());
    if (!categories.includes('B')) continue;

    const ansA = (row['Odpowiedź A'] || '').trim();
    const ansB = (row['Odpowiedź B'] || '').trim();
    const ansC = (row['Odpowiedź C'] || '').trim();
    const correct = (row['Poprawna odp'] || '').trim();
    const media = (row['Media'] || '').trim();
    const ext = media ? path.extname(media).toLowerCase() : '';

    const isABC = ansA !== '' || ansB !== '' || ansC !== '';

    questions.push({
      id: parseInt(row['Lp'], 10),
      number: parseInt(row['Numer pytania'], 10),
      question: (row['Pytanie'] || '').trim(),
      type: isABC ? 'ABC' : 'TN',
      answers: isABC ? { A: ansA, B: ansB, C: ansC } : null,
      correctAnswer: correct,
      media: media || null,
      mediaType: ext === '.wmv' ? 'video' : ext === '.jpg' ? 'image' : null,
      scope: (row['Zakres struktury'] || '').trim(),
      points: parseInt(row['Liczba punktów'], 10) || 0,
      categories,
    });
  }

  return questions;
}

let _questions = null;

function getQuestions() {
  if (!_questions) _questions = loadQuestions();
  return _questions;
}

function getRandomQuestion() {
  const qs = getQuestions();
  return qs[Math.floor(Math.random() * qs.length)];
}

function getQuestionByNumber(number) {
  return getQuestions().find(q => q.number === number) || null;
}

module.exports = { getQuestions, getRandomQuestion, getQuestionByNumber };
