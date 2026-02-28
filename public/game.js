// Connect to server
const socket = io();

// Game state
let myId = null;
let myName = '';
let currentRoom = null;
let myCoins = 100;
let timerInterval = null;
let stopwatchInterval = null;
let isHost = false;
let gameSettings = {
  timeLimit: 10,
  questionsPerBatch: 1,
  focusCategory: null,
  totalQuestions: 10
};
let categories = {};
let questionStartTime = null;

// DOM Elements
const screens = {
  welcome: document.getElementById('welcome-screen'),
  lobby: document.getElementById('lobby-screen'),
  betting: document.getElementById('betting-screen'),
  game: document.getElementById('game-screen'),
  results: document.getElementById('results-screen'),
  gameover: document.getElementById('gameover-screen')
};

const elements = {
  playerName: document.getElementById('player-name'),
  roomCode: document.getElementById('room-code'),
  displayRoomCode: document.getElementById('display-room-code'),
  lobbyPlayers: document.getElementById('lobby-players'),
  waitingMessage: document.getElementById('waiting-message'),
  startGameBtn: document.getElementById('start-game-btn'),
  settingsPanel: document.getElementById('settings-panel'),
  settingsDisplay: document.getElementById('settings-display'),
  settingsSummary: document.getElementById('settings-summary'),
  categorySelect: document.getElementById('category-select'),
  customTime: document.getElementById('custom-time'),

  betQuestionNum: document.getElementById('bet-question-num'),
  betTotalQuestions: document.getElementById('bet-total-questions'),
  betScoreboard: document.getElementById('bet-scoreboard'),
  yourCoins: document.getElementById('your-coins'),
  customBet: document.getElementById('custom-bet'),
  betStatus: document.getElementById('bet-status'),
  batchInfo: document.getElementById('batch-info'),
  betBatchSize: document.getElementById('bet-batch-size'),

  gameQuestionNum: document.getElementById('game-question-num'),
  gameTotalQuestions: document.getElementById('game-total-questions'),
  timer: document.getElementById('timer'),
  stopwatch: document.getElementById('stopwatch'),
  gameScoreboard: document.getElementById('game-scoreboard'),
  mathProblem: document.getElementById('math-problem'),
  answerInput: document.getElementById('answer-input'),
  answerStatus: document.getElementById('answer-status'),
  questionCategory: document.getElementById('question-category'),
  batchProgress: document.getElementById('batch-progress'),
  batchCurrent: document.getElementById('batch-current'),
  batchTotal: document.getElementById('batch-total'),

  roundResults: document.getElementById('round-results'),
  nextRoundTimer: document.getElementById('next-round-timer'),
  nextRoundBtn: document.getElementById('next-round-btn'),
  nextRoundStatus: document.getElementById('next-round-status'),
  roundStats: document.getElementById('round-stats'),
  statsBreakdown: document.getElementById('stats-breakdown'),
  avgTimeDisplay: document.getElementById('avg-time-display'),

  winnerTitle: document.getElementById('winner-title'),
  winnerName: document.getElementById('winner-name'),
  finalScores: document.getElementById('final-scores'),
  bgTimer: document.getElementById('bg-timer')
};

// Utility functions
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateScoreboard(element, players) {
  element.innerHTML = players.map(p => `
    <div class="score-row ${p.id === myId ? 'you' : ''}">
      <div class="score-info">
        <span class="score-name">${p.name}${p.id === myId ? ' (You)' : ''}</span>
      </div>
      <div class="score-values">
        <span class="score-points"><span class="material-icons">star</span> ${p.score || 0}</span>
        <span class="score-coins"><span class="material-icons">monetization_on</span> ${p.coins}</span>
      </div>
    </div>
  `).join('');
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  elements.timer.classList.remove('urgent');

  if (seconds === 0) {
    // No time limit - show stopwatch counting UP
    elements.timer.classList.add('no-limit');
    let elapsed = 0;
    elements.timer.textContent = '0:00';

    timerInterval = setInterval(() => {
      elapsed++;
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      elements.timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
    return;
  }

  elements.timer.classList.remove('no-limit');
  let remaining = seconds;
  elements.timer.textContent = remaining;

  timerInterval = setInterval(() => {
    remaining--;
    elements.timer.textContent = remaining;

    if (remaining <= 3) {
      elements.timer.classList.add('urgent');
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

function startStopwatch() {
  stopStopwatch();
  questionStartTime = Date.now();

  const updateDisplay = () => {
    const elapsed = (Date.now() - questionStartTime) / 1000;
    if (elements.stopwatchDisplay) {
      elements.stopwatchDisplay.textContent = elapsed.toFixed(1) + 's';
    }
  };

  updateDisplay();
  stopwatchInterval = setInterval(updateDisplay, 100);
}

function stopStopwatch() {
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
}

// Background timer functions
let bgTimerDuration = 0;

function startBgTimer(seconds) {
  if (!elements.bgTimer) return;

  // Reset the timer
  elements.bgTimer.classList.remove('active');
  elements.bgTimer.style.width = '0%';

  if (seconds === 0) {
    // No time limit - use a long duration (5 minutes)
    bgTimerDuration = 300;
  } else {
    bgTimerDuration = seconds;
  }

  // Force reflow to reset the animation
  void elements.bgTimer.offsetWidth;

  // Start the animation
  elements.bgTimer.classList.add('active');
  elements.bgTimer.style.transitionDuration = bgTimerDuration + 's';
  elements.bgTimer.style.width = '100%';
}

function stopBgTimer() {
  if (!elements.bgTimer) return;
  elements.bgTimer.classList.remove('active');
  elements.bgTimer.style.width = '0%';
}

function updateSettingsSummary() {
  if (!elements.settingsSummary) return;

  const timeText = gameSettings.timeLimit === 0 ? 'No time limit' : `${gameSettings.timeLimit}s per question`;
  const categoryText = gameSettings.focusCategory ? categories[gameSettings.focusCategory] : 'All categories';
  const batchText = gameSettings.questionsPerBatch === 1 ? '1 question' : `${gameSettings.questionsPerBatch} questions`;

  elements.settingsSummary.innerHTML = `
    <div><span class="material-icons">timer</span> ${timeText}</div>
    <div><span class="material-icons">category</span> ${categoryText}</div>
    <div><span class="material-icons">list_alt</span> ${batchText} per round</div>
    <div><span class="material-icons">track_changes</span> ${gameSettings.totalQuestions} total questions</div>
  `;
}

function populateCategories() {
  const select = elements.categorySelect;
  if (!select) return;

  select.innerHTML = '<option value="">All Categories (Random)</option>';
  Object.entries(categories).forEach(([key, name]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = name;
    select.appendChild(option);
  });
}

function updateBatchProgress(current, total) {
  if (!elements.batchProgress) return;

  if (total > 1) {
    elements.batchProgress.style.display = 'block';
    elements.batchProgress.innerHTML = `
      <div class="batch-info">Question ${current} of ${total} in this round</div>
      <div class="batch-dots">
        ${Array.from({ length: total }, (_, i) =>
      `<span class="batch-dot ${i < current ? 'completed' : i === current - 1 ? 'current' : ''}"></span>`
    ).join('')}
      </div>
    `;
  } else {
    elements.batchProgress.style.display = 'none';
  }
}

// Welcome screen handlers
document.getElementById('create-room-btn').addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  if (!name) {
    showToast('Please enter your name', true);
    return;
  }
  myName = name;
  socket.emit('create-room', name);
});

document.getElementById('play-cpu-btn').addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  if (!name) {
    showToast('Please enter your name', true);
    return;
  }
  myName = name;
  socket.emit('play-vs-cpu', name);
});

document.getElementById('add-cpu-btn').addEventListener('click', () => {
  socket.emit('add-cpu');
});

document.getElementById('show-join-btn').addEventListener('click', () => {
  document.getElementById('join-section').classList.toggle('hidden');
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  const code = elements.roomCode.value.trim().toUpperCase();
  if (!name) {
    showToast('Please enter your name', true);
    return;
  }
  if (!code || code.length !== 6) {
    showToast('Please enter a valid 6-letter room code', true);
    return;
  }
  myName = name;
  socket.emit('join-room', { roomCode: code, playerName: name });
});

// Handle Enter key
elements.playerName.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('create-room-btn').click();
});

elements.roomCode.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('join-room-btn').click();
});

// Start game button
elements.startGameBtn.addEventListener('click', () => {
  socket.emit('start-game');
});

// Settings handlers
document.querySelectorAll('.setting-btn[data-setting="timeLimit"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.setting-btn[data-setting="timeLimit"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const time = parseInt(btn.dataset.value);
    gameSettings.timeLimit = time;
    socket.emit('update-settings', gameSettings);
  });
});

const customTimeInput = document.getElementById('custom-time');
if (customTimeInput) {
  customTimeInput.addEventListener('change', () => {
    document.querySelectorAll('.setting-btn[data-setting="timeLimit"]').forEach(b => b.classList.remove('active'));
    const value = Math.max(0, Math.min(300, parseInt(customTimeInput.value) || 0));
    customTimeInput.value = value;
    gameSettings.timeLimit = value;
    socket.emit('update-settings', gameSettings);
  });
}

document.querySelectorAll('.setting-btn[data-setting="questionsPerBatch"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.setting-btn[data-setting="questionsPerBatch"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.questionsPerBatch = parseInt(btn.dataset.value);
    socket.emit('update-settings', gameSettings);
  });
});

document.querySelectorAll('.setting-btn[data-setting="totalQuestions"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.setting-btn[data-setting="totalQuestions"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.totalQuestions = parseInt(btn.dataset.value);
    socket.emit('update-settings', gameSettings);
  });
});

if (elements.categorySelect) {
  elements.categorySelect.addEventListener('change', () => {
    gameSettings.focusCategory = elements.categorySelect.value || null;
    socket.emit('update-settings', gameSettings);
  });
}

// Betting handlers
document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    let amount = btn.dataset.amount;
    if (amount === 'all') {
      amount = myCoins;
    } else {
      amount = parseInt(amount);
    }
    if (amount > myCoins) {
      showToast('Not enough coins!', true);
      return;
    }
    socket.emit('place-bet', amount);
    elements.betStatus.textContent = `Bet placed: ${amount} coins`;
    elements.betStatus.className = 'status-message waiting';
  });
});

document.getElementById('place-custom-bet').addEventListener('click', () => {
  const amount = parseInt(elements.customBet.value) || 0;
  if (amount < 0 || amount > myCoins) {
    showToast('Invalid bet amount', true);
    return;
  }
  socket.emit('place-bet', amount);
  elements.betStatus.textContent = `Bet placed: ${amount} coins`;
  elements.betStatus.className = 'status-message waiting';
});

// Answer submission
elements.answerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitAnswer();
  }
});

document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);

function submitAnswer() {
  const answer = elements.answerInput.value.trim();
  if (answer === '') {
    showToast('Please enter an answer', true);
    return;
  }
  socket.emit('submit-answer', answer);
  elements.answerInput.disabled = true;
  document.getElementById('submit-answer-btn').disabled = true;
  elements.answerStatus.textContent = 'Answer submitted! Waiting for opponent...';
  elements.answerStatus.className = 'status-message waiting';
}

// Play again
document.getElementById('play-again-btn').addEventListener('click', () => {
  socket.emit('play-again');
});

// Next round button
elements.nextRoundBtn.addEventListener('click', () => {
  elements.nextRoundBtn.disabled = true;
  elements.nextRoundStatus.textContent = 'Ready! Waiting for opponent...';
  socket.emit('ready-next-round');
});

// Socket event handlers
socket.on('connect', () => {
  myId = socket.id;
});

socket.on('room-created', ({ roomCode, player, settings, categories: serverCategories }) => {
  currentRoom = roomCode;
  myId = player.id;
  isHost = true;
  gameSettings = settings || gameSettings;
  categories = serverCategories || {};
  elements.displayRoomCode.textContent = roomCode;
  updateLobbyPlayers([player]);

  // Show settings panel for host
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.remove('hidden');
  }
  if (elements.settingsDisplay) {
    elements.settingsDisplay.classList.add('hidden');
  }

  populateCategories();
  showScreen('lobby');
});

socket.on('room-joined', ({ roomCode, player, settings, categories: serverCategories }) => {
  currentRoom = roomCode;
  myId = player.id;
  isHost = false;
  gameSettings = settings || gameSettings;
  categories = serverCategories || {};
  elements.displayRoomCode.textContent = roomCode;

  // Hide settings panel for non-host, show summary
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.add('hidden');
  }
  if (elements.settingsDisplay) {
    elements.settingsDisplay.classList.remove('hidden');
    updateSettingsSummary();
  }

  showScreen('lobby');
});

socket.on('player-joined', ({ players, settings }) => {
  updateLobbyPlayers(players);
  if (settings) {
    gameSettings = settings;
    updateSettingsSummary();
  }
});

socket.on('settings-updated', (settings) => {
  gameSettings = settings;
  updateSettingsSummary();
});

function updateLobbyPlayers(players) {
  elements.lobbyPlayers.innerHTML = players.map(p => `
        <div class="player-item ${p.id === myId ? 'you' : ''}">
            <span class="player-name">
                ${p.name}
                ${p.id === myId ? '<span class="player-badge">You</span>' : ''}
            </span>
            <span class="player-status">Ready</span>
        </div>
    `).join('');

  const addCpuBtn = document.getElementById('add-cpu-btn');
  if (players.length < 2) {
    elements.waitingMessage.classList.remove('hidden');
    elements.startGameBtn.classList.add('hidden');
    if (addCpuBtn && isHost) addCpuBtn.classList.remove('hidden');
  } else {
    elements.waitingMessage.classList.add('hidden');
    elements.startGameBtn.classList.remove('hidden');
    if (addCpuBtn) addCpuBtn.classList.add('hidden');
  }
}

socket.on('betting-phase', ({ players, questionNumber, totalQuestions }) => {
  elements.betQuestionNum.textContent = questionNumber;
  elements.betTotalQuestions.textContent = totalQuestions;
  elements.gameTotalQuestions.textContent = totalQuestions;

  const me = players.find(p => p.id === myId);
  if (me) {
    myCoins = me.coins;
    elements.yourCoins.textContent = myCoins;
  }

  updateScoreboard(elements.betScoreboard, players);
  elements.betStatus.textContent = '';
  elements.customBet.value = '';
  elements.customBet.max = myCoins;

  showScreen('betting');
});

socket.on('bet-placed', ({ playerId, players }) => {
  const player = players.find(p => p.id === playerId);
  if (player && playerId !== myId) {
    showToast(`${player.name} placed their bet!`);
  }
});

socket.on('question-start', ({ question, questionNumber, totalQuestions, timeLimit, batchIndex, batchTotal, category }) => {
  elements.gameQuestionNum.textContent = questionNumber;
  elements.gameTotalQuestions.textContent = totalQuestions;
  elements.mathProblem.textContent = question + ' = ?';
  elements.answerInput.value = '';
  elements.answerInput.disabled = false;
  document.getElementById('submit-answer-btn').disabled = false;
  elements.answerStatus.textContent = '';
  elements.answerInput.focus();

  // Update batch progress if applicable
  if (batchTotal && batchTotal > 1) {
    updateBatchProgress(batchIndex, batchTotal);
  } else {
    if (elements.batchProgress) {
      elements.batchProgress.style.display = 'none';
    }
  }

  // Show category if available
  if (category && categories[category]) {
    const categoryLabel = document.getElementById('current-category');
    if (categoryLabel) {
      categoryLabel.textContent = categories[category];
      categoryLabel.style.display = 'block';
    }
  }

  startTimer(timeLimit || 10);
  startStopwatch();
  startBgTimer(timeLimit || 10);
  showScreen('game');
});

socket.on('answer-submitted', ({ playerId }) => {
  if (playerId !== myId) {
    showToast('Opponent submitted their answer!');
  }
});

socket.on('round-results', (results) => {
  clearInterval(timerInterval);
  stopStopwatch();
  stopBgTimer();

  // Build results HTML
  let resultsHtml = '';

  // For batch mode, show each question's result
  if (results.batchResults && results.batchResults.length > 0) {
    resultsHtml += '<div class="batch-results">';
    results.batchResults.forEach((q, idx) => {
      resultsHtml += `
        <div class="batch-question-result">
          <div class="batch-question-header">
            <span class="question-text">${q.question} = ${q.correctAnswer}</span>
            <span class="question-category">${categories[q.category] || q.category}</span>
          </div>
          <div class="batch-answers">
            ${q.answers.map(a => `
              <span class="batch-answer ${a.correct ? 'correct' : 'wrong'}">
                ${a.name}: ${a.answer !== null ? a.answer : 'No answer'}
                <span class="material-icons ${a.correct ? 'correct' : 'wrong'}">${a.correct ? 'check' : 'close'}</span>
                ${a.time ? ` (${(a.time / 1000).toFixed(2)}s)` : ''}
              </span>
            `).join('')}
          </div>
        </div>
      `;
    });
    resultsHtml += '</div>';

    // Show summary stats
    resultsHtml += `
      <div class="round-summary">
        <h4>Round Summary</h4>
        ${results.results.map(r => `
          <div class="result-item ${r.correct && results.winner && r.id === results.winner.id ? 'winner' : ''} ${!r.correct ? 'wrong' : ''}">
            <div class="result-details">
              <div class="result-name">${r.name}${r.id === myId ? ' (You)' : ''}</div>
              <div class="result-stats">
                ${r.questionsCorrect || 0}/${results.batchResults.length} correct
                ${r.averageTime ? ` • Avg: ${(r.averageTime / 1000).toFixed(2)}s` : ''}
              </div>
            </div>
            <div class="result-change">
              <div class="points-change ${r.pointsEarned > 0 ? 'positive' : ''}">${r.pointsEarned > 0 ? '+' : ''}${r.pointsEarned} pts</div>
              <div class="coins-change">${r.coinsChange >= 0 ? '+' : ''}${r.coinsChange} <span class="material-icons">monetization_on</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    // Single question mode
    resultsHtml = `
      <div class="correct-answer-display">
        <div class="label">Correct Answer</div>
        <div class="answer">${results.correctAnswer}</div>
      </div>
      ${results.results.map(r => `
        <div class="result-item ${r.correct && results.winner && r.id === results.winner.id ? 'winner' : ''} ${!r.correct ? 'wrong' : ''}">
          <div class="result-details">
            <div class="result-name">${r.name}${r.id === myId ? ' (You)' : ''}</div>
            <div class="result-stats">
              Answer: ${r.answer !== null ? r.answer : 'No answer'}
              <span class="material-icons ${r.correct ? 'correct' : 'wrong'}">${r.correct ? 'check' : 'close'}</span>
              ${r.time ? ` • ${(r.time / 1000).toFixed(2)}s` : ''}
            </div>
          </div>
          <div class="result-change">
            <div class="points-change ${r.pointsEarned > 0 ? 'positive' : ''}">${r.pointsEarned > 0 ? '+' : ''}${r.pointsEarned} pts</div>
            <div class="coins-change">${r.coinsChange >= 0 ? '+' : ''}${r.coinsChange} <span class="material-icons">monetization_on</span></div>
          </div>
        </div>
      `).join('')}
    `;
  }

  elements.roundResults.innerHTML = resultsHtml;

  // Build detailed stats breakdown for the player
  if (elements.statsBreakdown && elements.roundStats) {
    const myResult = results.results.find(r => r.id === myId);

    if (myResult && myResult.batchAnswers && myResult.batchAnswers.length > 0) {
      // Show stats for all answers in this round
      let statsHtml = '<div class="stats-questions">';

      myResult.batchAnswers.forEach((ans, idx) => {
        statsHtml += `
          <div class="stat-question ${ans.correct ? 'correct' : 'wrong'}">
            <div class="stat-q-header">
              <span class="stat-q-num">Q${idx + 1}</span>
              <span class="stat-q-category">${ans.categoryName || categories[ans.category] || ans.category}</span>
              <span class="material-icons ${ans.correct ? 'correct' : 'wrong'}">${ans.correct ? 'check' : 'close'}</span>
            </div>
            <div class="stat-q-details">
              <div class="stat-q-problem">${ans.question} = ${ans.correctAnswer}</div>
              <div class="stat-q-answer">Your answer: <strong>${ans.answer !== null ? ans.answer : 'No answer'}</strong></div>
              <div class="stat-q-time"><span class="material-icons">timer</span> ${ans.time ? (ans.time / 1000).toFixed(2) + 's' : 'N/A'}</div>
            </div>
          </div>
        `;
      });

      statsHtml += '</div>';
      elements.statsBreakdown.innerHTML = statsHtml;

      // Calculate and show average time
      const answeredQuestions = myResult.batchAnswers.filter(a => a.time);
      const avgTime = answeredQuestions.length > 0
        ? answeredQuestions.reduce((sum, a) => sum + a.time, 0) / answeredQuestions.length
        : 0;
      const correctCount = myResult.batchAnswers.filter(a => a.correct).length;

      if (elements.avgTimeDisplay) {
        elements.avgTimeDisplay.innerHTML = `
          <div class="stats-summary-row">
            <span><span class="material-icons">speed</span> Avg Time:</span>
            <strong>${avgTime > 0 ? (avgTime / 1000).toFixed(2) + 's' : 'N/A'}</strong>
          </div>
          <div class="stats-summary-row">
            <span><span class="material-icons">check_circle</span> Accuracy:</span>
            <strong>${correctCount}/${myResult.batchAnswers.length} (${Math.round(correctCount / myResult.batchAnswers.length * 100)}%)</strong>
          </div>
        `;
      }

      elements.roundStats.classList.remove('hidden');
    } else {
      // Single question - show simple stats
      if (myResult) {
        elements.statsBreakdown.innerHTML = `
          <div class="stat-question ${myResult.correct ? 'correct' : 'wrong'}">
            <div class="stat-q-header">
              <span class="stat-q-category">${results.categoryName || categories[results.category] || results.category}</span>
              <span class="material-icons ${myResult.correct ? 'correct' : 'wrong'}">${myResult.correct ? 'check' : 'close'}</span>
            </div>
            <div class="stat-q-details">
              <div class="stat-q-problem">${results.question} = ${results.correctAnswer}</div>
              <div class="stat-q-answer">Your answer: <strong>${myResult.answer !== null ? myResult.answer : 'No answer'}</strong></div>
              <div class="stat-q-time"><span class="material-icons">timer</span> ${myResult.time ? (myResult.time / 1000).toFixed(2) + 's' : 'N/A'}</div>
            </div>
          </div>
        `;

        if (elements.avgTimeDisplay) {
          elements.avgTimeDisplay.innerHTML = `
            <div class="stats-summary-row">
              <span><span class="material-icons">speed</span> Response Time:</span>
              <strong>${myResult.time ? (myResult.time / 1000).toFixed(2) + 's' : 'N/A'}</strong>
            </div>
          `;
        }

        elements.roundStats.classList.remove('hidden');
      } else {
        elements.roundStats.classList.add('hidden');
      }
    }
  }

  if (results.winner) {
    const winnerResult = results.results.find(r => r.id === results.winner.id);
    if (winnerResult) {
      const winnerText = winnerResult.id === myId ? 'You won this round!' : `${winnerResult.name} won this round!`;
      showToast(winnerText);
    }
  }

  showScreen('results');

  // Show Next Round button
  if (results.gameOver) {
    elements.nextRoundBtn.classList.add('hidden');
    elements.nextRoundStatus.textContent = 'Game Over! Final results coming...';
  } else {
    elements.nextRoundBtn.classList.remove('hidden');
    elements.nextRoundBtn.disabled = false;
    elements.nextRoundStatus.textContent = '';
  }
});

socket.on('player-ready-next', ({ playerId, readyPlayers }) => {
  if (playerId !== myId && readyPlayers.length === 1) {
    elements.nextRoundStatus.textContent = `${readyPlayers[0]} is ready`;
  }
});

socket.on('game-over', (results) => {
  const winner = results.winner;
  const isWinner = winner.id === myId;

  elements.winnerTitle.innerHTML = isWinner
    ? '<span class="material-icons trophy-icon">emoji_events</span> You Won! <span class="material-icons trophy-icon">emoji_events</span>'
    : '<span class="material-icons trophy-icon">emoji_events</span> Winner! <span class="material-icons trophy-icon">emoji_events</span>';
  elements.winnerName.textContent = winner.name;

  elements.finalScores.innerHTML = results.players.map((p, i) => `
        <div class="final-score-item">
            <div class="final-player-info">
                <span class="final-rank"><span class="material-icons ${i === 0 ? 'gold' : 'silver'}">emoji_events</span></span>
                <span class="final-player-name">${p.name}${p.id === myId ? ' (You)' : ''}</span>
            </div>
            <div class="final-score">${p.score} pts</div>
        </div>
    `).join('');

  showScreen('gameover');
});

socket.on('game-reset', ({ players }) => {
  updateLobbyPlayers(players);
  showScreen('lobby');
  showToast('Game reset! Ready for a new match.');
});

socket.on('player-left', ({ playerId }) => {
  showToast('Opponent left the game', true);
  showScreen('lobby');
  elements.waitingMessage.classList.remove('hidden');
  elements.startGameBtn.classList.add('hidden');
});

socket.on('error', (message) => {
  showToast(message, true);
});

// Update my coins when received from somewhere
socket.on('update-coins', (coins) => {
  myCoins = coins;
  elements.yourCoins.textContent = myCoins;
});
