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
  roundStats: document.getElementById('round-stats'),
  statsBreakdown: document.getElementById('stats-breakdown'),
  avgTimeDisplay: document.getElementById('avg-time-display'),

  winnerTitle: document.getElementById('winner-title'),
  winnerName: document.getElementById('winner-name'),
  finalScores: document.getElementById('final-scores')
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
        <span class="score-points">⭐ ${p.score || 0}</span>
        <span class="score-coins">🪙 ${p.coins}</span>
      </div>
    </div>
  `).join('');
}

function startTimer(seconds) {
  clearInterval(timerInterval);

  if (seconds === 0) {
    elements.timer.textContent = '∞';
    elements.timer.classList.add('no-limit');
    return;
  }

  elements.timer.classList.remove('no-limit');
  let remaining = seconds;
  elements.timer.textContent = remaining;
  elements.timer.classList.remove('urgent');

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

function updateSettingsSummary() {
  if (!elements.settingsSummary) return;

  const timeText = gameSettings.timeLimit === 0 ? 'No time limit' : `${gameSettings.timeLimit}s per question`;
  const categoryText = gameSettings.focusCategory ? categories[gameSettings.focusCategory] : 'All categories';
  const batchText = gameSettings.questionsPerBatch === 1 ? '1 question' : `${gameSettings.questionsPerBatch} questions`;

  elements.settingsSummary.innerHTML = `
    <div>⏱️ ${timeText}</div>
    <div>📚 ${categoryText}</div>
    <div>📋 ${batchText} per round</div>
    <div>🎯 ${gameSettings.totalQuestions} total questions</div>
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
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const time = btn.dataset.time;
    if (time === 'custom') {
      elements.customTimeInput.style.display = 'block';
      gameSettings.timeLimit = parseInt(elements.customTimeInput.querySelector('input').value) || 30;
    } else {
      elements.customTimeInput.style.display = 'none';
      gameSettings.timeLimit = parseInt(time);
    }

    socket.emit('update-settings', gameSettings);
  });
});

if (elements.customTimeInput) {
  const input = elements.customTimeInput.querySelector('input');
  if (input) {
    input.addEventListener('change', () => {
      gameSettings.timeLimit = Math.max(5, Math.min(300, parseInt(input.value) || 30));
      input.value = gameSettings.timeLimit;
      socket.emit('update-settings', gameSettings);
    });
  }
}

document.querySelectorAll('.batch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.batch-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.questionsPerBatch = parseInt(btn.dataset.batch);
    socket.emit('update-settings', gameSettings);
  });
});

if (elements.categorySelect) {
  elements.categorySelect.addEventListener('change', () => {
    gameSettings.focusCategory = elements.categorySelect.value || null;
    socket.emit('update-settings', gameSettings);
  });
}

if (elements.totalQuestionsInput) {
  elements.totalQuestionsInput.addEventListener('change', () => {
    gameSettings.totalQuestions = Math.max(5, Math.min(50, parseInt(elements.totalQuestionsInput.value) || 20));
    elements.totalQuestionsInput.value = gameSettings.totalQuestions;
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

// Socket event handlers
socket.on('connect', () => {
  myId = socket.id;
});

socket.on('room-created', ({ roomCode, player, settings }) => {
  currentRoom = roomCode;
  myId = player.id;
  isHost = true;
  gameSettings = settings || gameSettings;
  elements.displayRoomCode.textContent = roomCode;
  updateLobbyPlayers([player]);

  // Show settings panel for host
  if (elements.settingsPanel) {
    elements.settingsPanel.style.display = 'block';
  }
  if (elements.settingsDisplay) {
    elements.settingsDisplay.style.display = 'none';
  }

  populateCategories();
  showScreen('lobby');
});

socket.on('room-joined', ({ roomCode, player, settings }) => {
  currentRoom = roomCode;
  myId = player.id;
  isHost = false;
  gameSettings = settings || gameSettings;
  elements.displayRoomCode.textContent = roomCode;

  // Hide settings panel for non-host, show summary
  if (elements.settingsPanel) {
    elements.settingsPanel.style.display = 'none';
  }
  if (elements.settingsDisplay) {
    elements.settingsDisplay.style.display = 'block';
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
  if (players.length === 2) {
    elements.waitingMessage.classList.add('hidden');
    elements.startGameBtn.classList.remove('hidden');
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

  if (players.length < 2) {
    elements.waitingMessage.classList.remove('hidden');
    elements.startGameBtn.classList.add('hidden');
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
                ${a.correct ? '✓' : '✗'}
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
              <div class="coins-change">${r.coinsChange >= 0 ? '+' : ''}${r.coinsChange} 🪙</div>
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
              ${r.correct ? '✓' : '✗'}
              ${r.time ? ` • ${(r.time / 1000).toFixed(2)}s` : ''}
            </div>
          </div>
          <div class="result-change">
            <div class="points-change ${r.pointsEarned > 0 ? 'positive' : ''}">${r.pointsEarned > 0 ? '+' : ''}${r.pointsEarned} pts</div>
            <div class="coins-change">${r.coinsChange >= 0 ? '+' : ''}${r.coinsChange} 🪙</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  elements.roundResults.innerHTML = resultsHtml;

  if (results.winner) {
    const winnerResult = results.results.find(r => r.id === results.winner.id);
    if (winnerResult) {
      const winnerText = winnerResult.id === myId ? 'You won this round!' : `${winnerResult.name} won this round!`;
      showToast(winnerText);
    }
  }

  showScreen('results');

  // Countdown to next round
  let countdown = 3;
  elements.nextRoundTimer.innerHTML = `Next round in <span>${countdown}</span>...`;
  elements.nextRoundTimer.classList.remove('hidden');

  if (results.gameOver) {
    elements.nextRoundTimer.innerHTML = 'Game Over! Final results coming...';
  }
});

socket.on('game-over', (results) => {
  const winner = results.winner;
  const isWinner = winner.id === myId;

  elements.winnerTitle.textContent = isWinner ? '🏆 You Won! 🏆' : '🏆 Winner! 🏆';
  elements.winnerName.textContent = winner.name;

  elements.finalScores.innerHTML = results.players.map((p, i) => `
        <div class="final-score-item">
            <div class="final-player-info">
                <span class="final-rank">${i === 0 ? '🥇' : '🥈'}</span>
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
