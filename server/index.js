'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { getQuestions, getRandomQuestion, getQuestionByNumber } = require('./questions');

const MEDIA_DIRS = [
  path.join(__dirname, '..', 'source', 'multimedia do pytań'),
  path.join(__dirname, '..', 'source', 'cz. 2'),
];
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

// Returns the full path to a media file, searching all media directories in order
function findMediaFile(filename) {
  for (const dir of MEDIA_DIRS) {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Tracks in-progress transcodes: filename -> Promise
const transcoding = new Map();

const app = express();

// Serve frontend
app.use(express.static(PUBLIC_DIR));

// Serve videos — transcodes WMV to MP4 via ffmpeg on first request, caches result
app.get('/media/video/:filename', async (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const srcPath = findMediaFile(filename);
  if (!srcPath) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  const baseName = path.basename(filename, path.extname(filename));
  const cachedPath = path.join(CACHE_DIR, `${baseName}.mp4`);

  if (fs.existsSync(cachedPath)) {
    return res.sendFile(cachedPath);
  }

  // If already transcoding, wait for it to finish
  if (transcoding.has(filename)) {
    try {
      await transcoding.get(filename);
      return res.sendFile(cachedPath);
    } catch {
      return res.status(500).json({ error: 'Video transcoding failed' });
    }
  }

  // Start transcoding
  console.log(`Transcoding: ${filename}`);
  const promise = new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', srcPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      '-y',
      cachedPath,
    ]);

    ff.on('close', (code) => {
      transcoding.delete(filename);
      if (code === 0) {
        console.log(`Transcoded: ${filename}`);
        resolve();
      } else {
        fs.rmSync(cachedPath, { force: true }); // remove partial file
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ff.on('error', (err) => {
      transcoding.delete(filename);
      reject(err);
    });
  });

  transcoding.set(filename, promise);

  try {
    await promise;
    res.sendFile(cachedPath);
  } catch (err) {
    console.error(`Transcoding failed for ${filename}:`, err.message);
    res.status(500).json({ error: 'Video transcoding failed' });
  }
});

// Serve images directly
app.get('/media/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic path traversal guard
  if (filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = findMediaFile(filename);
  if (!filepath) {
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
