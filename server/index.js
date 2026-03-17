'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { getQuestions, getRandomQuestion, getQuestionByNumber } = require('./questions');

const MEDIA_DIR = path.join(__dirname, '..', 'source', 'multimedia do pytań');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const app = express();

// Serve frontend
app.use(express.static(PUBLIC_DIR));

// Serve images directly
app.get('/media/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic path traversal guard
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(MEDIA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Media file not found' });
  }
  res.sendFile(filepath);
});

// --- API ---

app.get('/api/questions', (req, res) => {
  res.json(getQuestions());
});

app.get('/api/question/random', (req, res) => {
  res.json(getRandomQuestion());
});

app.get('/api/question/:number', (req, res) => {
  const number = parseInt(req.params.number, 10);
  if (isNaN(number)) return res.status(400).json({ error: 'Invalid question number' });
  const q = getQuestionByNumber(number);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json(q);
});

// Startup
app.listen(PORT, () => {
  const questions = getQuestions();
  console.log(`Loaded ${questions.length} Category B questions`);
  console.log(`Server running at http://localhost:${PORT}`);
});
