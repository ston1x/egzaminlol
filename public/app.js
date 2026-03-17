'use strict';

const STORAGE_KEY = 'egzamin_stats';

const ANSWER_LABELS = {
  T: 'TAK',
  N: 'NIE',
  A: 'A',
  B: 'B',
  C: 'C',
};

// ── State ───────────────────────────────────────────────────

const state = {
  current: null,
  answered: false,
  correct: 0,
  wrong: 0,
  mistakes: [],
  mistakesOpen: false,
};

// ── localStorage ────────────────────────────────────────────

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    correct: state.correct,
    wrong: state.wrong,
    mistakes: state.mistakes,
  }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.correct = saved.correct || 0;
    state.wrong = saved.wrong || 0;
    state.mistakes = Array.isArray(saved.mistakes) ? saved.mistakes : [];
  } catch (_) {
    // corrupted storage — start fresh
  }
}

// ── DOM helpers ─────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function show(id) { el(id).removeAttribute('hidden'); }
function hide(id) { el(id).setAttribute('hidden', ''); }

// ── Stats rendering ─────────────────────────────────────────

function renderStats() {
  el('stat-correct').textContent = state.correct;
  el('stat-wrong').textContent = state.wrong;
  el('stat-total').textContent = state.correct + state.wrong;

  const badge = el('mistakes-count');
  badge.textContent = state.mistakes.length;
  badge.className = 'mistakes-badge' + (state.mistakes.length === 0 ? ' zero' : '');
}

// ── Media rendering ─────────────────────────────────────────

function renderMedia(q) {
  const container = el('media-container');
  const img = el('media-img');
  const video = el('video-placeholder');

  if (!q.media) {
    container.setAttribute('hidden', '');
    return;
  }

  container.removeAttribute('hidden');

  if (q.mediaType === 'image') {
    img.src = `/media/${encodeURIComponent(q.media)}`;
    img.removeAttribute('hidden');
    video.setAttribute('hidden', '');
  } else if (q.mediaType === 'video') {
    img.setAttribute('hidden', '');
    video.removeAttribute('hidden');
  } else {
    container.setAttribute('hidden', '');
  }
}

// ── Answer buttons rendering ─────────────────────────────────

function renderAnswerButtons(q) {
  const container = el('answer-buttons');
  container.innerHTML = '';
  container.className = q.type === 'TN' ? 'btn-group-tn' : 'btn-group-abc';

  const buttons = q.type === 'TN'
    ? [{ value: 'T', label: 'TAK' }, { value: 'N', label: 'NIE' }]
    : ['A', 'B', 'C'].map(letter => ({ value: letter, label: q.answers[letter] }));

  for (const { value, label } of buttons) {
    const btn = document.createElement('button');
    btn.className = 'answer-btn' + (q.type === 'TN' ? ' btn-tn' : ' btn-abc');
    btn.dataset.answer = value;

    if (q.type === 'TN') {
      btn.textContent = label;
    } else {
      btn.innerHTML = `<span class="answer-letter">${value}</span> — ${label}`;
    }

    btn.addEventListener('click', () => handleAnswer(value));
    container.appendChild(btn);
  }
}

// ── Question rendering ───────────────────────────────────────

function renderQuestion(q) {
  state.current = q;
  state.answered = false;

  const scopeLabel = q.scope === 'PODSTAWOWY' ? 'Podstawowy' : 'Specjalistyczny';
  el('question-meta').textContent = `Pytanie ${q.number} · ${scopeLabel} · ${q.points} pkt`;
  el('question-text').textContent = q.question;

  renderMedia(q);
  renderAnswerButtons(q);

  hide('feedback');
  hide('next-btn');

  el('answer-buttons').classList.remove('answers-locked');
  el('question-card').classList.remove('loading');
}

// ── Answer handling ─────────────────────────────────────────

function highlightButtons(userAnswer, correctAnswer) {
  const buttons = el('answer-buttons').querySelectorAll('.answer-btn');
  for (const btn of buttons) {
    const val = btn.dataset.answer;
    if (val === correctAnswer) {
      btn.classList.add('state-correct');
    } else if (val === userAnswer && userAnswer !== correctAnswer) {
      btn.classList.add('state-wrong');
    }
  }
  el('answer-buttons').classList.add('answers-locked');
}

function handleAnswer(userAnswer) {
  if (state.answered) return;
  state.answered = true;

  const { correctAnswer, number, question } = state.current;
  const isCorrect = userAnswer === correctAnswer;

  if (isCorrect) {
    state.correct++;
  } else {
    state.wrong++;
    state.mistakes.push({
      number,
      question,
      userAnswer,
      correctAnswer,
    });
  }

  highlightButtons(userAnswer, correctAnswer);

  if (!isCorrect) {
    const feedback = el('feedback');
    feedback.textContent = `✗ Poprawna odpowiedź: ${ANSWER_LABELS[correctAnswer]}`;
    show('feedback');
  }

  show('next-btn');
  renderStats();
  renderMistakes();
  saveState();
}

// ── Mistakes panel ───────────────────────────────────────────

function renderMistakes() {
  const list = el('mistakes-list');
  if (!state.mistakesOpen) return;

  list.innerHTML = '';

  if (state.mistakes.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Brak błędów — tak trzymać!';
    li.style.color = '#4ade80';
    list.appendChild(li);
    return;
  }

  // Show most recent mistakes first
  const recent = [...state.mistakes].reverse().slice(0, 50);

  for (const m of recent) {
    const li = document.createElement('li');
    const truncated = m.question.length > 90
      ? m.question.slice(0, 87) + '…'
      : m.question;

    li.innerHTML = `
      <div class="mistake-meta">Pytanie ${m.number}</div>
      <div>${truncated}</div>
      <div class="mistake-given">Twoja odpowiedź: ${ANSWER_LABELS[m.userAnswer]}</div>
      <div class="mistake-correct">✓ Poprawna: ${ANSWER_LABELS[m.correctAnswer]}</div>
    `;
    list.appendChild(li);
  }
}

function toggleMistakes() {
  state.mistakesOpen = !state.mistakesOpen;
  const list = el('mistakes-list');
  const chevron = el('mistakes-chevron');
  const header = el('mistakes-header');

  if (state.mistakesOpen) {
    list.removeAttribute('hidden');
    chevron.classList.add('open');
    header.setAttribute('aria-expanded', 'true');
    renderMistakes();
  } else {
    list.setAttribute('hidden', '');
    chevron.classList.remove('open');
    header.setAttribute('aria-expanded', 'false');
  }
}

// ── Fetch & load question ───────────────────────────────────

async function fetchQuestion() {
  el('question-card').classList.add('loading');
  try {
    const res = await fetch('/api/question/random');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const q = await res.json();
    renderQuestion(q);
  } catch (err) {
    el('question-text').textContent = 'Błąd ładowania pytania. Sprawdź czy serwer działa.';
    el('question-card').classList.remove('loading');
    console.error('Failed to fetch question:', err);
  }
}

// ── Init ─────────────────────────────────────────────────────

function init() {
  loadState();
  renderStats();

  el('next-btn').addEventListener('click', fetchQuestion);
  el('mistakes-header').addEventListener('click', toggleMistakes);

  fetchQuestion();
}

document.addEventListener('DOMContentLoaded', init);
