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
  earnedPoints: 0,
  totalPoints: 0,
  mistakes: [],
  mistakesOpen: false,
};

// ── localStorage ────────────────────────────────────────────

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    correct: state.correct,
    wrong: state.wrong,
    earnedPoints: state.earnedPoints,
    totalPoints: state.totalPoints,
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
    state.earnedPoints = saved.earnedPoints || 0;
    state.totalPoints = saved.totalPoints || 0;
    state.mistakes = Array.isArray(saved.mistakes) ? saved.mistakes : [];
  } catch (_) {
    // corrupted storage — start fresh
  }
}

// ── Relative time ───────────────────────────────────────────

function formatRelativeTime(timestamp) {
  const secs = Math.floor((Date.now() - timestamp) / 1000);
  if (secs < 60) return 'przed chwilą';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}m temu` : `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days}d temu`;
}

// ── DOM helpers ─────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function show(id) { el(id).removeAttribute('hidden'); }
function hide(id) { el(id).setAttribute('hidden', ''); }

// ── Stats rendering ─────────────────────────────────────────

function renderStats() {
  const total = state.correct + state.wrong;
  el('stat-correct').textContent = state.correct;
  el('stat-wrong').textContent = state.wrong;
  el('stat-total').textContent = total;

  const ratioEl = el('stat-ratio');
  if (total === 0) {
    ratioEl.textContent = '—';
    ratioEl.className = 'stat-value ratio';
  } else {
    const pct = Math.round((state.correct / total) * 100);
    ratioEl.textContent = `${pct}%`;
    ratioEl.className = 'stat-value ratio ' + (pct >= 80 ? 'ratio-good' : pct >= 60 ? 'ratio-ok' : 'ratio-bad');
  }

  const ptRatioEl = el('stat-points-ratio');
  if (state.totalPoints === 0) {
    el('stat-points-earned').textContent = '—';
    el('stat-points-total').textContent = '—';
    ptRatioEl.textContent = '—';
    ptRatioEl.className = 'stat-value ratio';
  } else {
    const ptPct = Math.round((state.earnedPoints / state.totalPoints) * 100);
    el('stat-points-earned').textContent = state.earnedPoints;
    el('stat-points-total').textContent = state.totalPoints;
    ptRatioEl.textContent = `${ptPct}%`;
    ptRatioEl.className = 'stat-value ratio ' + (ptPct >= 80 ? 'ratio-good' : ptPct >= 60 ? 'ratio-ok' : 'ratio-bad');
  }

  const badge = el('mistakes-count');
  badge.textContent = state.mistakes.length;
  badge.className = 'mistakes-badge' + (state.mistakes.length === 0 ? ' zero' : '');
}

// ── Media rendering ─────────────────────────────────────────

function renderMedia(q) {
  const container = el('media-container');
  const img = el('media-img');
  const videoWrapper = el('video-wrapper');
  const video = el('media-video');
  const hint = el('video-hint');

  if (!q.media) {
    container.setAttribute('hidden', '');
    return;
  }

  container.removeAttribute('hidden');

  if (q.mediaType === 'image') {
    img.src = `/media/${encodeURIComponent(q.media)}`;
    img.removeAttribute('hidden');
    videoWrapper.setAttribute('hidden', '');
  } else if (q.mediaType === 'video') {
    img.setAttribute('hidden', '');
    videoWrapper.removeAttribute('hidden');

    // Reset and load new source
    video.pause();
    video.removeAttribute('src');
    video.load();

    hint.removeAttribute('hidden');
    video.src = `/media/video/${encodeURIComponent(q.media)}`;

    // Hide hint once video is ready to play
    video.addEventListener('canplay', () => hint.setAttribute('hidden', ''), { once: true });
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

  const { correctAnswer, number, question, points } = state.current;
  const isCorrect = userAnswer === correctAnswer;

  state.totalPoints += points;
  if (isCorrect) {
    state.correct++;
    state.earnedPoints += points;
  } else {
    state.wrong++;
    state.mistakes.push({
      number,
      question,
      userAnswer,
      correctAnswer,
      timestamp: Date.now(),
      media: state.current.media,
      mediaType: state.current.mediaType,
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

function toggleMistakeMedia(btn) {
  const wrap = btn.closest('li').querySelector('.mistake-media-wrap');
  const isOpen = !wrap.hasAttribute('hidden');

  if (isOpen) {
    wrap.setAttribute('hidden', '');
    // Pause video if present to stop buffering
    const video = wrap.querySelector('video');
    if (video) video.pause();
    btn.classList.remove('expanded');
    return;
  }

  // Lazily populate media on first open
  if (!wrap.dataset.loaded) {
    const { media, mediaType } = btn.dataset;
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = `/media/${encodeURIComponent(media)}`;
      img.className = 'mistake-media-img';
      img.alt = 'Ilustracja do pytania';
      wrap.appendChild(img);
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = `/media/video/${encodeURIComponent(media)}`;
      video.className = 'mistake-media-video';
      video.controls = true;
      video.preload = 'auto';
      const hint = document.createElement('p');
      hint.className = 'mistake-video-hint';
      hint.textContent = 'Pierwsze uruchomienie może chwilę potrwać…';
      video.addEventListener('canplay', () => hint.setAttribute('hidden', ''), { once: true });
      wrap.appendChild(video);
      wrap.appendChild(hint);
    }
    wrap.dataset.loaded = '1';
  }

  wrap.removeAttribute('hidden');
  btn.classList.add('expanded');
}

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

    const timeStr = m.timestamp ? formatRelativeTime(m.timestamp) : '';
    const mediaEmoji = m.media ? (m.mediaType === 'video' ? '📹' : '🖼️') : '';
    const mediaBtn = m.media
      ? `<button class="mistake-media-btn" data-media="${m.media}" data-media-type="${m.mediaType}" title="Pokaż media">${mediaEmoji}</button>`
      : '';

    li.innerHTML = `
      <div class="mistake-meta">Pytanie ${m.number}${timeStr ? ` · <span class="mistake-time">${timeStr}</span>` : ''}${mediaBtn}</div>
      <div>${truncated}</div>
      <div class="mistake-given">Twoja odpowiedź: ${ANSWER_LABELS[m.userAnswer]}</div>
      <div class="mistake-correct">✓ Poprawna: ${ANSWER_LABELS[m.correctAnswer]}</div>
      <div class="mistake-media-wrap" hidden></div>
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

// ── Reset stats ─────────────────────────────────────────────

function resetStats() {
  state.correct = 0;
  state.wrong = 0;
  state.earnedPoints = 0;
  state.totalPoints = 0;
  state.mistakes = [];
  localStorage.removeItem(STORAGE_KEY);
  renderStats();
  if (state.mistakesOpen) renderMistakes();
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
  el('reset-btn').addEventListener('click', resetStats);

  // Event delegation for media spoiler buttons inside the mistakes list
  el('mistakes-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.mistake-media-btn');
    if (btn) toggleMistakeMedia(btn);
  });

  fetchQuestion();
}

document.addEventListener('DOMContentLoaded', init);
