const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game state
const rooms = new Map();
const playerRooms = new Map();

// Helper functions for math problems
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Problem generators for electrician exam topics
const problemGenerators = {
  // Basic Arithmetic
  arithmetic: () => {
    const ops = [
      { symbol: '+', fn: (a, b) => a + b },
      { symbol: '-', fn: (a, b) => a - b },
      { symbol: '×', fn: (a, b) => a * b },
      { symbol: '÷', fn: (a, b) => a / b }
    ];
    const op = ops[randomInt(0, 3)];
    let a, b, answer;

    if (op.symbol === '÷') {
      b = randomInt(2, 12);
      answer = randomInt(2, 15);
      a = b * answer;
    } else if (op.symbol === '×') {
      a = randomInt(2, 12);
      b = randomInt(2, 12);
      answer = op.fn(a, b);
    } else {
      a = randomInt(10, 150);
      b = randomInt(5, 100);
      if (op.symbol === '-' && b > a) [a, b] = [b, a];
      answer = op.fn(a, b);
    }

    return { question: `${a} ${op.symbol} ${b} = ?`, answer };
  },

  // Fractions - Addition/Subtraction
  fractions: () => {
    const types = ['add', 'subtract', 'multiply', 'simplify'];
    const type = types[randomInt(0, 3)];

    if (type === 'simplify') {
      const divisor = randomInt(2, 6);
      const simplified = randomInt(1, 5);
      const denom = randomInt(2, 8);
      const num = simplified * divisor;
      const denomFull = denom * divisor;
      return {
        question: `Simplify: ${num}/${denomFull} (answer as decimal)`,
        answer: roundTo(simplified / denom, 2)
      };
    }

    const denom = randomInt(2, 8);
    const num1 = randomInt(1, denom - 1);
    const num2 = randomInt(1, denom - 1);

    if (type === 'add') {
      const answer = roundTo((num1 + num2) / denom, 2);
      return { question: `${num1}/${denom} + ${num2}/${denom} = ? (decimal)`, answer };
    } else if (type === 'subtract') {
      const [n1, n2] = num1 > num2 ? [num1, num2] : [num2, num1];
      const answer = roundTo((n1 - n2) / denom, 2);
      return { question: `${n1}/${denom} - ${n2}/${denom} = ? (decimal)`, answer };
    } else {
      const denom2 = randomInt(2, 6);
      const num2b = randomInt(1, denom2);
      const answer = roundTo((num1 * num2b) / (denom * denom2), 2);
      return { question: `${num1}/${denom} × ${num2b}/${denom2} = ? (decimal)`, answer };
    }
  },

  // Decimals
  decimals: () => {
    const ops = ['+', '-', '×'];
    const op = ops[randomInt(0, 2)];
    const a = roundTo(randomInt(10, 99) / 10, 1);
    const b = roundTo(randomInt(10, 99) / 10, 1);

    let answer;
    if (op === '+') answer = roundTo(a + b, 2);
    else if (op === '-') answer = roundTo(Math.abs(a - b), 2);
    else answer = roundTo(a * b, 2);

    const question = op === '-' && b > a
      ? `${b} ${op} ${a} = ?`
      : `${a} ${op} ${b} = ?`;

    return { question, answer };
  },

  // Percentages
  percentages: () => {
    const types = ['findPercent', 'whatPercent', 'percentOf'];
    const type = types[randomInt(0, 2)];

    if (type === 'findPercent') {
      const percent = randomInt(1, 10) * 5; // 5, 10, 15, ... 50
      const whole = randomInt(2, 20) * 10; // 20, 30, ... 200
      const answer = (percent / 100) * whole;
      return { question: `What is ${percent}% of ${whole}?`, answer };
    } else if (type === 'whatPercent') {
      const part = randomInt(1, 10) * 5;
      const whole = randomInt(2, 5) * part;
      const answer = (part / whole) * 100;
      return { question: `${part} is what % of ${whole}?`, answer };
    } else {
      const result = randomInt(2, 10) * 5;
      const percent = randomInt(1, 5) * 10;
      const whole = (result / percent) * 100;
      return { question: `${result} is ${percent}% of what number?`, answer: whole };
    }
  },

  // Ratios and Proportions
  ratios: () => {
    const types = ['simplify', 'solve', 'divide'];
    const type = types[randomInt(0, 2)];

    if (type === 'simplify') {
      const common = randomInt(2, 5);
      const a = randomInt(1, 6) * common;
      const b = randomInt(1, 6) * common;
      const g = gcd(a, b);
      return {
        question: `Simplify ratio ${a}:${b}. What is the first number?`,
        answer: a / g
      };
    } else if (type === 'solve') {
      const a = randomInt(2, 8);
      const b = randomInt(2, 8);
      const c = randomInt(2, 6) * a;
      const answer = (c * b) / a;
      return { question: `If ${a}/${b} = ${c}/x, find x`, answer };
    } else {
      const total = randomInt(3, 10) * 12;
      const ratio1 = randomInt(1, 4);
      const ratio2 = randomInt(1, 4);
      const part1 = (total * ratio1) / (ratio1 + ratio2);
      return {
        question: `Divide ${total} in ratio ${ratio1}:${ratio2}. Larger part?`,
        answer: Math.max(part1, total - part1)
      };
    }
  },

  // Exponents
  exponents: () => {
    const types = ['power', 'multiply', 'evaluate'];
    const type = types[randomInt(0, 2)];

    if (type === 'power') {
      const base = randomInt(2, 6);
      const exp = randomInt(2, 4);
      return { question: `${base}^${exp} = ?`, answer: Math.pow(base, exp) };
    } else if (type === 'multiply') {
      const base = randomInt(2, 5);
      const exp1 = randomInt(1, 3);
      const exp2 = randomInt(1, 3);
      return {
        question: `${base}^${exp1} × ${base}^${exp2} = ${base}^?`,
        answer: exp1 + exp2
      };
    } else {
      const base = randomInt(2, 4);
      const exp = randomInt(2, 3);
      const mult = randomInt(2, 5);
      return {
        question: `${mult} × ${base}^${exp} = ?`,
        answer: mult * Math.pow(base, exp)
      };
    }
  },

  // Square Roots
  squareRoots: () => {
    const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
    const types = ['basic', 'multiply', 'add'];
    const type = types[randomInt(0, 2)];

    if (type === 'basic') {
      const sq = perfectSquares[randomInt(0, perfectSquares.length - 1)];
      return { question: `√${sq} = ?`, answer: Math.sqrt(sq) };
    } else if (type === 'multiply') {
      const sq = perfectSquares[randomInt(0, 5)];
      const mult = randomInt(2, 6);
      return { question: `${mult} × √${sq} = ?`, answer: mult * Math.sqrt(sq) };
    } else {
      const sq1 = perfectSquares[randomInt(0, 4)];
      const sq2 = perfectSquares[randomInt(0, 4)];
      return { question: `√${sq1} + √${sq2} = ?`, answer: Math.sqrt(sq1) + Math.sqrt(sq2) };
    }
  },

  // Linear Equations - Solve for x
  linearEquations: () => {
    const types = ['oneStep', 'twoStep', 'bothSides'];
    const type = types[randomInt(0, 2)];

    if (type === 'oneStep') {
      const x = randomInt(2, 15);
      const a = randomInt(2, 9);
      const b = a * x;
      const ops = ['×', '+', '-'];
      const op = ops[randomInt(0, 2)];

      if (op === '×') {
        return { question: `${a}x = ${b}. Find x`, answer: x };
      } else if (op === '+') {
        return { question: `x + ${a} = ${b}. Find x`, answer: b - a };
      } else {
        return { question: `x - ${a} = ${b - a}. Find x`, answer: b };
      }
    } else if (type === 'twoStep') {
      const x = randomInt(2, 10);
      const a = randomInt(2, 6);
      const b = randomInt(1, 10);
      const result = a * x + b;
      return { question: `${a}x + ${b} = ${result}. Find x`, answer: x };
    } else {
      const x = randomInt(2, 8);
      const a = randomInt(2, 5);
      const b = randomInt(1, 5);
      const c = randomInt(1, a - 1);
      const d = (a - c) * x + b;
      return { question: `${a}x + ${b} = ${c}x + ${d}. Find x`, answer: x };
    }
  },

  // Word Problems - Electrical Context
  wordProblems: () => {
    const problems = [
      () => {
        const v = randomInt(12, 24) * 10; // Voltage
        const r = randomInt(2, 10) * 10;  // Resistance
        const i = v / r;
        return { question: `Ohm's Law: V=${v}V, R=${r}Ω. Find I (amps)`, answer: i };
      },
      () => {
        const i = randomInt(5, 20);
        const r = randomInt(2, 15);
        const v = i * r;
        return { question: `Ohm's Law: I=${i}A, R=${r}Ω. Find V (volts)`, answer: v };
      },
      () => {
        const v = randomInt(10, 25) * 10;
        const i = randomInt(2, 10);
        const p = v * i;
        return { question: `Power: V=${v}V, I=${i}A. Find P (watts)`, answer: p };
      },
      () => {
        const totalFeet = randomInt(5, 20) * 10;
        const inches = totalFeet * 12;
        return { question: `Convert ${totalFeet} feet to inches`, answer: inches };
      },
      () => {
        const hours = randomInt(3, 8);
        const rate = randomInt(25, 75);
        const total = hours * rate;
        return { question: `${hours} hours labor at $${rate}/hr. Total cost?`, answer: total };
      },
      () => {
        const watts = randomInt(10, 100) * 10;
        const hours = randomInt(2, 10);
        const kwh = (watts * hours) / 1000;
        return { question: `${watts}W for ${hours} hrs = ? kWh`, answer: kwh };
      },
      () => {
        const boxes = randomInt(3, 8);
        const perBox = randomInt(10, 25);
        const total = boxes * perBox;
        return { question: `${boxes} boxes with ${perBox} outlets each. Total outlets?`, answer: total };
      },
      () => {
        const runs = randomInt(3, 6);
        const feetPer = randomInt(20, 50);
        const total = runs * feetPer;
        return { question: `${runs} wire runs, ${feetPer} ft each. Total feet?`, answer: total };
      },
      () => {
        const price = randomInt(50, 200);
        const discount = randomInt(1, 4) * 5;
        const final = price * (1 - discount / 100);
        return { question: `$${price} item, ${discount}% off. Sale price?`, answer: final };
      },
      () => {
        const circuits = randomInt(10, 20);
        const amps = 15;
        const total = circuits * amps;
        return { question: `${circuits} circuits × ${amps}A each = total amps?`, answer: total };
      }
    ];

    return problems[randomInt(0, problems.length - 1)]();
  }
};

// Main problem generator
function generateMathProblem(difficulty = 1) {
  const categories = [
    'arithmetic',
    'fractions',
    'decimals',
    'percentages',
    'ratios',
    'exponents',
    'squareRoots',
    'linearEquations',
    'wordProblems'
  ];

  const category = categories[randomInt(0, categories.length - 1)];
  const problem = problemGenerators[category]();

  // Round answer to avoid floating point issues
  problem.answer = typeof problem.answer === 'number'
    ? roundTo(problem.answer, 2)
    : problem.answer;

  return problem;
}

// Create a new room
function createRoom(hostId, hostName) {
  const roomCode = uuidv4().substring(0, 6).toUpperCase();
  const room = {
    code: roomCode,
    host: hostId,
    players: [{
      id: hostId,
      name: hostName,
      score: 0,
      coins: 100,
      bet: 0,
      currentAnswer: null,
      answerTime: null,
      ready: false
    }],
    state: 'waiting', // waiting, betting, playing, results
    currentProblem: null,
    questionNumber: 0,
    totalQuestions: 10,
    roundStartTime: null,
    difficulty: 1
  };
  rooms.set(roomCode, room);
  playerRooms.set(hostId, roomCode);
  return room;
}

// Join an existing room
function joinRoom(roomCode, playerId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 2) return { error: 'Room is full' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };

  room.players.push({
    id: playerId,
    name: playerName,
    score: 0,
    coins: 100,
    bet: 0,
    currentAnswer: null,
    answerTime: null,
    ready: false
  });
  playerRooms.set(playerId, roomCode);
  return room;
}

// Start betting round
function startBettingRound(room) {
  room.state = 'betting';
  room.players.forEach(p => {
    p.bet = 0;
    p.ready = false;
  });
  return room;
}

// Place a bet
function placeBet(room, playerId, amount) {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (amount < 0 || amount > player.coins) return { error: 'Invalid bet amount' };

  player.bet = amount;
  player.ready = true;

  // Check if all players are ready
  const allReady = room.players.every(p => p.ready);
  return { success: true, allReady };
}

// Start a new question round
function startQuestionRound(room) {
  room.state = 'playing';
  room.questionNumber++;
  room.currentProblem = generateMathProblem(room.difficulty);
  room.roundStartTime = Date.now();
  room.players.forEach(p => {
    p.currentAnswer = null;
    p.answerTime = null;
  });
  return room;
}

// Submit an answer
function submitAnswer(room, playerId, answer) {
  const player = room.players.find(p => p.id === playerId);
  if (!player || player.currentAnswer !== null) return { error: 'Cannot submit answer' };

  player.currentAnswer = answer;
  player.answerTime = Date.now() - room.roundStartTime;

  // Check if all players have answered
  const allAnswered = room.players.every(p => p.currentAnswer !== null);
  return { success: true, allAnswered };
}

// Helper to compare answers (handles floating point)
function answersMatch(given, correct) {
  if (given === null || given === undefined) return false;
  // Round both to 2 decimal places for comparison
  const givenRounded = Math.round(given * 100) / 100;
  const correctRounded = Math.round(correct * 100) / 100;
  return Math.abs(givenRounded - correctRounded) < 0.01;
}

// Calculate round results
function calculateRoundResults(room) {
  const correctAnswer = room.currentProblem.answer;
  let winner = null;
  let fastestTime = Infinity;

  room.players.forEach(p => {
    if (answersMatch(p.currentAnswer, correctAnswer) && p.answerTime < fastestTime) {
      fastestTime = p.answerTime;
      winner = p;
    }
  });

  // Calculate score and coin changes
  const results = room.players.map(p => {
    const correct = answersMatch(p.currentAnswer, correctAnswer);
    let coinsChange = 0;
    let pointsEarned = 0;

    if (winner && p.id === winner.id) {
      // Winner gets points and wins opponent's bet
      pointsEarned = 10 + Math.floor((5000 - Math.min(p.answerTime, 5000)) / 100);
      const opponent = room.players.find(op => op.id !== p.id);
      if (opponent) {
        coinsChange = opponent.bet;
      }
    } else if (correct) {
      // Correct but not fastest - get some points, keep bet
      pointsEarned = 5;
    } else {
      // Wrong answer - lose bet
      coinsChange = -p.bet;
    }

    p.score += pointsEarned;
    p.coins += coinsChange;

    return {
      id: p.id,
      name: p.name,
      answer: p.currentAnswer,
      correct,
      time: p.answerTime,
      pointsEarned,
      coinsChange,
      totalScore: p.score,
      totalCoins: p.coins
    };
  });

  return {
    correctAnswer,
    winner: winner ? { id: winner.id, name: winner.name } : null,
    results,
    questionNumber: room.questionNumber,
    totalQuestions: room.totalQuestions,
    gameOver: room.questionNumber >= room.totalQuestions
  };
}

// Get final game results
function getFinalResults(room) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  return {
    winner: sorted[0],
    players: sorted,
    gameOver: true
  };
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create a new room
  socket.on('create-room', (playerName) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit('room-created', { roomCode: room.code, player: room.players[0] });
  });

  // Join an existing room
  socket.on('join-room', ({ roomCode, playerName }) => {
    const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName);
    if (result.error) {
      socket.emit('error', result.error);
      return;
    }
    socket.join(roomCode.toUpperCase());
    const newPlayer = result.players.find(p => p.id === socket.id);
    socket.emit('room-joined', { roomCode: roomCode.toUpperCase(), player: newPlayer });
    io.to(roomCode.toUpperCase()).emit('player-joined', { players: result.players });
  });

  // Start the game
  socket.on('start-game', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 2) {
      socket.emit('error', 'Need 2 players to start');
      return;
    }

    room.questionNumber = 0;
    room.players.forEach(p => {
      p.score = 0;
      p.coins = 100;
    });

    startBettingRound(room);
    io.to(roomCode).emit('betting-phase', {
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        score: p.score
      })),
      questionNumber: room.questionNumber + 1,
      totalQuestions: room.totalQuestions
    });
  });

  // Place a bet
  socket.on('place-bet', (amount) => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'betting') return;

    const result = placeBet(room, socket.id, amount);
    if (result.error) {
      socket.emit('error', result.error);
      return;
    }

    io.to(roomCode).emit('bet-placed', {
      playerId: socket.id,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        coins: p.coins
      }))
    });

    if (result.allReady) {
      // Start question after short delay
      setTimeout(() => {
        startQuestionRound(room);
        io.to(roomCode).emit('question-start', {
          question: room.currentProblem.question,
          questionNumber: room.questionNumber,
          totalQuestions: room.totalQuestions
        });

        // Auto-end round after 10 seconds
        setTimeout(() => {
          if (room.state === 'playing' && room.questionNumber === room.questionNumber) {
            endRound(roomCode);
          }
        }, 10000);
      }, 1000);
    }
  });

  // Submit answer
  socket.on('submit-answer', (answer) => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'playing') return;

    const result = submitAnswer(room, socket.id, parseFloat(answer));
    if (result.error) return;

    io.to(roomCode).emit('answer-submitted', { playerId: socket.id });

    if (result.allAnswered) {
      endRound(roomCode);
    }
  });

  // Play again
  socket.on('play-again', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room) return;

    room.state = 'waiting';
    room.questionNumber = 0;
    room.players.forEach(p => {
      p.score = 0;
      p.coins = 100;
      p.ready = false;
    });

    io.to(roomCode).emit('game-reset', { players: room.players });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const roomCode = playerRooms.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        io.to(roomCode).emit('player-left', { playerId: socket.id });
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomCode);
        } else {
          room.host = room.players[0].id;
          room.state = 'waiting';
        }
      }
      playerRooms.delete(socket.id);
    }
    console.log('Player disconnected:', socket.id);
  });
});

function endRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const roundResults = calculateRoundResults(room);
  room.state = 'results';

  io.to(roomCode).emit('round-results', roundResults);

  if (roundResults.gameOver) {
    const finalResults = getFinalResults(room);
    setTimeout(() => {
      io.to(roomCode).emit('game-over', finalResults);
    }, 3000);
  } else {
    // Start next betting round after delay
    setTimeout(() => {
      startBettingRound(room);
      io.to(roomCode).emit('betting-phase', {
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          coins: p.coins,
          score: p.score
        })),
        questionNumber: room.questionNumber + 1,
        totalQuestions: room.totalQuestions
      });
    }, 3000);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Math Race server running on http://localhost:${PORT}`);
});
