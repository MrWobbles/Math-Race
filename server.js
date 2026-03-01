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
      { symbol: '+', fn: (a, b) => a + b, name: 'add', hint: 'Addition: a + b = sum' },
      { symbol: '-', fn: (a, b) => a - b, name: 'subtract', hint: 'Subtraction: a - b = difference' },
      { symbol: '×', fn: (a, b) => a * b, name: 'multiply', hint: 'Multiplication: a × b = product' },
      { symbol: '÷', fn: (a, b) => a / b, name: 'divide', hint: 'Division: a ÷ b = quotient' }
    ];
    const op = ops[randomInt(0, 3)];
    let a, b, answer, solution;

    if (op.symbol === '÷') {
      b = randomInt(2, 12);
      answer = randomInt(2, 15);
      a = b * answer;
      solution = `${a} ÷ ${b} = ${answer}`;
    } else if (op.symbol === '×') {
      a = randomInt(2, 12);
      b = randomInt(2, 12);
      answer = op.fn(a, b);
      solution = `${a} × ${b} = ${answer}`;
    } else {
      a = randomInt(10, 150);
      b = randomInt(5, 100);
      if (op.symbol === '-' && b > a) [a, b] = [b, a];
      answer = op.fn(a, b);
      solution = `${a} ${op.symbol} ${b} = ${answer}`;
    }

    return { question: `${a} ${op.symbol} ${b} = ?`, answer, solution, hint: op.hint };
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
      const answer = roundTo(simplified / denom, 2);
      return {
        question: `Simplify: ${num}/${denomFull} (answer as decimal)`,
        answer,
        solution: `${num}/${denomFull} = ${simplified}/${denom} (divide both by ${divisor})\n${simplified} ÷ ${denom} = ${answer}`,
        hint: 'Simplify: Divide numerator and denominator by GCD, then convert to decimal'
      };
    }

    const denom = randomInt(2, 8);
    const num1 = randomInt(1, denom - 1);
    const num2 = randomInt(1, denom - 1);

    if (type === 'add') {
      const sum = num1 + num2;
      const answer = roundTo(sum / denom, 2);
      return {
        question: `${num1}/${denom} + ${num2}/${denom} = ? (decimal)`,
        answer,
        solution: `(${num1} + ${num2})/${denom} = ${sum}/${denom}\n${sum} ÷ ${denom} = ${answer}`,
        hint: 'Same denominator: (a + b) / d = result, then divide'
      };
    } else if (type === 'subtract') {
      const [n1, n2] = num1 > num2 ? [num1, num2] : [num2, num1];
      const diff = n1 - n2;
      const answer = roundTo(diff / denom, 2);
      return {
        question: `${n1}/${denom} - ${n2}/${denom} = ? (decimal)`,
        answer,
        solution: `(${n1} - ${n2})/${denom} = ${diff}/${denom}\n${diff} ÷ ${denom} = ${answer}`,
        hint: 'Same denominator: (a - b) / d = result, then divide'
      };
    } else {
      const denom2 = randomInt(2, 6);
      const num2b = randomInt(1, denom2);
      const numResult = num1 * num2b;
      const denomResult = denom * denom2;
      const answer = roundTo(numResult / denomResult, 2);
      return {
        question: `${num1}/${denom} × ${num2b}/${denom2} = ? (decimal)`,
        answer,
        solution: `(${num1} × ${num2b})/(${denom} × ${denom2}) = ${numResult}/${denomResult}\n${numResult} ÷ ${denomResult} = ${answer}`,
        hint: 'Multiply fractions: (a/b) × (c/d) = (a×c)/(b×d)'
      };
    }
  },

  // Decimals
  decimals: () => {
    const ops = [
      { symbol: '+', hint: 'Decimal addition: Line up decimal points and add' },
      { symbol: '-', hint: 'Decimal subtraction: Line up decimal points and subtract' },
      { symbol: '×', hint: 'Decimal multiplication: Multiply, count total decimal places' }
    ];
    const opObj = ops[randomInt(0, 2)];
    const op = opObj.symbol;
    const a = roundTo(randomInt(10, 99) / 10, 1);
    const b = roundTo(randomInt(10, 99) / 10, 1);

    let answer, solution, question;
    if (op === '+') {
      answer = roundTo(a + b, 2);
      question = `${a} + ${b} = ?`;
      solution = `${a} + ${b} = ${answer}`;
    } else if (op === '-') {
      const [x, y] = a > b ? [a, b] : [b, a];
      answer = roundTo(x - y, 2);
      question = `${x} - ${y} = ?`;
      solution = `${x} - ${y} = ${answer}`;
    } else {
      answer = roundTo(a * b, 2);
      question = `${a} × ${b} = ?`;
      solution = `${a} × ${b} = ${answer}`;
    }

    return { question, answer, solution, hint: opObj.hint };
  },

  // Percentages
  percentages: () => {
    const types = ['findPercent', 'whatPercent', 'percentOf'];
    const type = types[randomInt(0, 2)];

    if (type === 'findPercent') {
      const percent = randomInt(1, 10) * 5;
      const whole = randomInt(2, 20) * 10;
      const answer = (percent / 100) * whole;
      return {
        question: `What is ${percent}% of ${whole}?`,
        answer,
        solution: `${percent}% = ${percent}/100 = ${percent / 100}\n${percent / 100} × ${whole} = ${answer}`,
        hint: 'Find percent: (percent / 100) × whole = answer'
      };
    } else if (type === 'whatPercent') {
      const part = randomInt(1, 10) * 5;
      const whole = randomInt(2, 5) * part;
      const answer = (part / whole) * 100;
      return {
        question: `${part} is what % of ${whole}?`,
        answer,
        solution: `(${part} ÷ ${whole}) × 100\n= ${roundTo(part / whole, 4)} × 100\n= ${answer}%`,
        hint: 'What percent: (part ÷ whole) × 100 = percent'
      };
    } else {
      const result = randomInt(2, 10) * 5;
      const percent = randomInt(1, 5) * 10;
      const whole = (result / percent) * 100;
      return {
        question: `${result} is ${percent}% of what number?`,
        answer: whole,
        solution: `${result} = ${percent}% × x\nx = ${result} ÷ (${percent}/100)\nx = ${result} ÷ ${percent / 100}\nx = ${whole}`,
        hint: 'Find whole: result ÷ (percent / 100) = whole'
      };
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
      const answer = a / g;
      return {
        question: `Simplify ratio ${a}:${b}. What is the first number?`,
        answer,
        solution: `GCD of ${a} and ${b} is ${g}\n${a}÷${g} : ${b}÷${g} = ${a / g}:${b / g}\nFirst number = ${answer}`,
        hint: 'Simplify ratio: Divide both by GCD (greatest common divisor)'
      };
    } else if (type === 'solve') {
      const a = randomInt(2, 8);
      const b = randomInt(2, 8);
      const c = randomInt(2, 6) * a;
      const answer = (c * b) / a;
      return {
        question: `If ${a}/${b} = ${c}/x, find x`,
        answer,
        solution: `Cross multiply: ${a} × x = ${b} × ${c}\n${a}x = ${b * c}\nx = ${b * c} ÷ ${a}\nx = ${answer}`,
        hint: 'Cross multiply: a/b = c/x → a×x = b×c → x = (b×c)/a'
      };
    } else {
      const total = randomInt(3, 10) * 12;
      const ratio1 = randomInt(1, 4);
      const ratio2 = randomInt(1, 4);
      const parts = ratio1 + ratio2;
      const part1 = (total * ratio1) / parts;
      const part2 = (total * ratio2) / parts;
      const answer = Math.max(part1, part2);
      return {
        question: `Divide ${total} in ratio ${ratio1}:${ratio2}. Larger part?`,
        answer,
        solution: `Total parts = ${ratio1} + ${ratio2} = ${parts}\nEach part = ${total} ÷ ${parts} = ${total / parts}\nPart 1 = ${ratio1} × ${total / parts} = ${part1}\nPart 2 = ${ratio2} × ${total / parts} = ${part2}\nLarger = ${answer}`,
        hint: 'Divide in ratio: total ÷ (a+b) = unit, then multiply each part'
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
      const answer = Math.pow(base, exp);
      const steps = Array(exp).fill(base).join(' × ');
      return {
        question: `${base}^${exp} = ?`,
        answer,
        solution: `${base}^${exp} = ${steps} = ${answer}`,
        hint: 'Exponent: base^n = base × base × ... (n times)'
      };
    } else if (type === 'multiply') {
      const base = randomInt(2, 5);
      const exp1 = randomInt(1, 3);
      const exp2 = randomInt(1, 3);
      const answer = exp1 + exp2;
      return {
        question: `${base}^${exp1} × ${base}^${exp2} = ${base}^?`,
        answer,
        solution: `When multiplying same bases, add exponents:\n${base}^${exp1} × ${base}^${exp2} = ${base}^(${exp1}+${exp2}) = ${base}^${answer}`,
        hint: 'Multiply exponents: a^m × a^n = a^(m+n)'
      };
    } else {
      const base = randomInt(2, 4);
      const exp = randomInt(2, 3);
      const mult = randomInt(2, 5);
      const power = Math.pow(base, exp);
      const answer = mult * power;
      return {
        question: `${mult} × ${base}^${exp} = ?`,
        answer,
        solution: `First: ${base}^${exp} = ${power}\nThen: ${mult} × ${power} = ${answer}`,
        hint: 'Evaluate: First calculate the exponent, then multiply'
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
      const answer = Math.sqrt(sq);
      return {
        question: `√${sq} = ?`,
        answer,
        solution: `√${sq} = ${answer} because ${answer} × ${answer} = ${sq}`,
        hint: 'Square root: √n = x where x × x = n'
      };
    } else if (type === 'multiply') {
      const sq = perfectSquares[randomInt(0, 5)];
      const mult = randomInt(2, 6);
      const sqRoot = Math.sqrt(sq);
      const answer = mult * sqRoot;
      return {
        question: `${mult} × √${sq} = ?`,
        answer,
        solution: `√${sq} = ${sqRoot}\n${mult} × ${sqRoot} = ${answer}`,
        hint: 'Multiply root: k × √n = k × (root of n)'
      };
    } else {
      const sq1 = perfectSquares[randomInt(0, 4)];
      const sq2 = perfectSquares[randomInt(0, 4)];
      const root1 = Math.sqrt(sq1);
      const root2 = Math.sqrt(sq2);
      const answer = root1 + root2;
      return {
        question: `√${sq1} + √${sq2} = ?`,
        answer,
        solution: `√${sq1} = ${root1}\n√${sq2} = ${root2}\n${root1} + ${root2} = ${answer}`,
        hint: 'Add roots: Find each root separately, then add'
      };
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
        return {
          question: `${a}x = ${b}. Find x`,
          answer: x,
          solution: `${a}x = ${b}\nDivide both sides by ${a}:\nx = ${b} ÷ ${a}\nx = ${x}`,
          hint: 'ax = b → x = b ÷ a'
        };
      } else if (op === '+') {
        const answer = b - a;
        return {
          question: `x + ${a} = ${b}. Find x`,
          answer,
          solution: `x + ${a} = ${b}\nSubtract ${a} from both sides:\nx = ${b} - ${a}\nx = ${answer}`,
          hint: 'x + a = b → x = b - a'
        };
      } else {
        return {
          question: `x - ${a} = ${b - a}. Find x`,
          answer: b,
          solution: `x - ${a} = ${b - a}\nAdd ${a} to both sides:\nx = ${b - a} + ${a}\nx = ${b}`,
          hint: 'x - a = b → x = b + a'
        };
      }
    } else if (type === 'twoStep') {
      const x = randomInt(2, 10);
      const a = randomInt(2, 6);
      const b = randomInt(1, 10);
      const result = a * x + b;
      return {
        question: `${a}x + ${b} = ${result}. Find x`,
        answer: x,
        solution: `${a}x + ${b} = ${result}\nSubtract ${b}: ${a}x = ${result} - ${b} = ${result - b}\nDivide by ${a}: x = ${result - b} ÷ ${a} = ${x}`,
        hint: 'ax + b = c → ax = c - b → x = (c-b)/a'
      };
    } else {
      const x = randomInt(2, 8);
      const a = randomInt(2, 5);
      const b = randomInt(1, 5);
      const c = randomInt(1, a - 1);
      const d = (a - c) * x + b;
      return {
        question: `${a}x + ${b} = ${c}x + ${d}. Find x`,
        answer: x,
        solution: `${a}x + ${b} = ${c}x + ${d}\nSubtract ${c}x: ${a - c}x + ${b} = ${d}\nSubtract ${b}: ${a - c}x = ${d - b}\nDivide by ${a - c}: x = ${d - b} ÷ ${a - c} = ${x}`,
        hint: 'Get all x terms on one side, constants on other, then solve'
      };
    }
  },

  // Word Problems - Electrical Context
  wordProblems: () => {
    const problems = [
      () => {
        const v = randomInt(12, 24) * 10;
        const r = randomInt(2, 10) * 10;
        const i = v / r;
        return {
          question: `Ohm's Law: V=${v}V, R=${r}Ω. Find I (amps)`,
          answer: i,
          solution: `Ohm's Law: I = V ÷ R\nI = ${v}V ÷ ${r}Ω\nI = ${i}A`,
          hint: "Ohm's Law: I = V / R (Current = Voltage / Resistance)"
        };
      },
      () => {
        const i = randomInt(5, 20);
        const r = randomInt(2, 15);
        const v = i * r;
        return {
          question: `Ohm's Law: I=${i}A, R=${r}Ω. Find V (volts)`,
          answer: v,
          solution: `Ohm's Law: V = I × R\nV = ${i}A × ${r}Ω\nV = ${v}V`,
          hint: "Ohm's Law: V = I × R (Voltage = Current × Resistance)"
        };
      },
      () => {
        const v = randomInt(10, 25) * 10;
        const i = randomInt(2, 10);
        const p = v * i;
        return {
          question: `Power: V=${v}V, I=${i}A. Find P (watts)`,
          answer: p,
          solution: `Power formula: P = V × I\nP = ${v}V × ${i}A\nP = ${p}W`,
          hint: 'Power: P = V × I (Watts = Volts × Amps)'
        };
      },
      () => {
        const totalFeet = randomInt(5, 20) * 10;
        const inches = totalFeet * 12;
        return {
          question: `Convert ${totalFeet} feet to inches`,
          answer: inches,
          solution: `1 foot = 12 inches\n${totalFeet} feet × 12 = ${inches} inches`,
          hint: 'Conversion: 1 foot = 12 inches'
        };
      },
      () => {
        const hours = randomInt(3, 8);
        const rate = randomInt(25, 75);
        const total = hours * rate;
        return {
          question: `${hours} hours labor at $${rate}/hr. Total cost?`,
          answer: total,
          solution: `Total = Hours × Rate\nTotal = ${hours} × $${rate}\nTotal = $${total}`,
          hint: 'Labor cost: Total = Hours × Hourly rate'
        };
      },
      () => {
        const watts = randomInt(10, 100) * 10;
        const hours = randomInt(2, 10);
        const kwh = (watts * hours) / 1000;
        return {
          question: `${watts}W for ${hours} hrs = ? kWh`,
          answer: kwh,
          solution: `kWh = (Watts × Hours) ÷ 1000\nkWh = (${watts} × ${hours}) ÷ 1000\nkWh = ${watts * hours} ÷ 1000\nkWh = ${kwh}`,
          hint: 'Energy: kWh = (Watts × Hours) ÷ 1000'
        };
      },
      () => {
        const boxes = randomInt(3, 8);
        const perBox = randomInt(10, 25);
        const total = boxes * perBox;
        return {
          question: `${boxes} boxes with ${perBox} outlets each. Total outlets?`,
          answer: total,
          solution: `Total = Boxes × Outlets per box\nTotal = ${boxes} × ${perBox}\nTotal = ${total} outlets`,
          hint: 'Total = Groups × Items per group'
        };
      },
      () => {
        const runs = randomInt(3, 6);
        const feetPer = randomInt(20, 50);
        const total = runs * feetPer;
        return {
          question: `${runs} wire runs, ${feetPer} ft each. Total feet?`,
          answer: total,
          solution: `Total = Runs × Feet per run\nTotal = ${runs} × ${feetPer}\nTotal = ${total} feet`,
          hint: 'Total = Number of runs × Length each'
        };
      },
      () => {
        const price = randomInt(50, 200);
        const discount = randomInt(1, 4) * 5;
        const savings = (price * discount) / 100;
        const final = price - savings;
        return {
          question: `$${price} item, ${discount}% off. Sale price?`,
          answer: final,
          solution: `Discount = ${discount}% of $${price}\nDiscount = $${price} × ${discount / 100} = $${savings}\nSale price = $${price} - $${savings} = $${final}`,
          hint: 'Sale price = Original - (Original × discount%)'
        };
      },
      () => {
        const circuits = randomInt(10, 20);
        const amps = 15;
        const total = circuits * amps;
        return {
          question: `${circuits} circuits × ${amps}A each = total amps?`,
          answer: total,
          solution: `Total amps = Circuits × Amps each\nTotal = ${circuits} × ${amps}A\nTotal = ${total}A`,
          hint: 'Total = Number of circuits × Amps per circuit'
        };
      }
    ];

    return problems[randomInt(0, problems.length - 1)]();
  }
};

// Category display names
const categoryNames = {
  arithmetic: 'Basic Arithmetic',
  fractions: 'Fractions',
  decimals: 'Decimals',
  percentages: 'Percentages',
  ratios: 'Ratios & Proportions',
  exponents: 'Exponents',
  squareRoots: 'Square Roots',
  linearEquations: 'Linear Equations',
  wordProblems: 'Word Problems'
};

const allCategories = Object.keys(categoryNames);

// Main problem generator
function generateMathProblem(difficulty = 1, focusCategory = null) {
  let category;

  if (focusCategory && problemGenerators[focusCategory]) {
    category = focusCategory;
  } else {
    category = allCategories[randomInt(0, allCategories.length - 1)];
  }

  const problem = problemGenerators[category]();

  // Round answer to avoid floating point issues
  problem.answer = typeof problem.answer === 'number'
    ? roundTo(problem.answer, 2)
    : problem.answer;

  problem.category = category;
  problem.categoryName = categoryNames[category];

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
      ready: false,
      batchAnswers: [],  // For batch mode: [{answer, time, questionIndex}]
      batchCorrect: 0    // Count of correct answers in batch
    }],
    state: 'waiting', // waiting, betting, playing, results
    currentProblem: null,
    questionNumber: 0,
    totalQuestions: 10,
    roundStartTime: null,
    difficulty: 1,
    // New settings
    settings: {
      timeLimit: 10,        // 0 = no limit, or seconds per question
      questionsPerBatch: 1, // 1-10 questions per betting round
      focusCategory: null   // null = all categories, or specific category
    },
    // Batch mode tracking
    batchProblems: [],      // Array of problems in current batch
    currentBatchIndex: 0,   // Current question index in batch
    questionStartTime: null, // When current question started
    // Stats tracking
    roundStats: []          // [{question, category, playerResults: [{id, answer, time, correct}]}]
  };
  rooms.set(roomCode, room);
  playerRooms.set(hostId, roomCode);
  return room;
}

// Add CPU opponent to room
function addCpuOpponent(room) {
  if (room.players.length >= 2) return { error: 'Room is full' };

  const cpuId = 'CPU_' + uuidv4().substring(0, 8);
  room.players.push({
    id: cpuId,
    name: 'CPU',
    score: 0,
    coins: 100,
    bet: 0,
    currentAnswer: null,
    answerTime: null,
    ready: false,
    batchAnswers: [],
    batchCorrect: 0,
    isCpu: true
  });
  room.hasCpu = true;
  return room;
}

// CPU places a bet (random amount between 0 and 50% of coins)
function cpuPlaceBet(room) {
  const cpu = room.players.find(p => p.isCpu);
  if (!cpu || room.state !== 'betting') return;

  const maxBet = Math.floor(cpu.coins * 0.5);
  const betAmount = Math.floor(Math.random() * (maxBet + 1));
  cpu.bet = Math.min(betAmount, cpu.coins);
  cpu.ready = true;
  return cpu.bet;
}

// CPU answers a question (80% accuracy, random delay 1-4 seconds)
function cpuAnswerQuestion(room, io, roomCode) {
  const cpu = room.players.find(p => p.isCpu);
  if (!cpu || room.state !== 'playing') return;

  const problem = room.batchProblems[room.currentBatchIndex];
  if (!problem) return;

  // Random delay between 1-4 seconds
  const delay = 1000 + Math.random() * 3000;

  setTimeout(() => {
    if (room.state !== 'playing') return;

    // 80% chance of correct answer
    const isCorrect = Math.random() < 0.8;
    let answer;

    if (isCorrect) {
      answer = problem.answer;
    } else {
      // Wrong answer: offset by 10-50%
      const offset = problem.answer * (0.1 + Math.random() * 0.4);
      answer = Math.round((problem.answer + (Math.random() > 0.5 ? offset : -offset)) * 100) / 100;
    }

    const result = submitAnswer(room, cpu.id, answer);
    if (result.error) return;

    io.to(roomCode).emit('answer-submitted', {
      playerId: cpu.id,
      questionIndex: room.currentBatchIndex
    });

    if (result.allAnswered) {
      handleAllAnswered(roomCode, room);
    }
  }, delay);
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
    ready: false,
    batchAnswers: [],
    batchCorrect: 0
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

// Start a new question round (or batch)
function startQuestionRound(room) {
  room.state = 'playing';

  const batchSize = room.settings.questionsPerBatch;

  // Generate batch of problems
  room.batchProblems = [];
  for (let i = 0; i < batchSize; i++) {
    room.batchProblems.push(generateMathProblem(room.difficulty, room.settings.focusCategory));
  }

  room.currentBatchIndex = 0;
  room.currentProblem = room.batchProblems[0];
  room.roundStartTime = Date.now();
  room.questionStartTime = Date.now();

  room.players.forEach(p => {
    p.currentAnswer = null;
    p.answerTime = null;
    p.batchAnswers = [];
    p.batchCorrect = 0;
    p.usedHint = false;
  });

  return room;
}

// Move to next question in batch
function nextBatchQuestion(room) {
  room.currentBatchIndex++;
  if (room.currentBatchIndex < room.batchProblems.length) {
    room.currentProblem = room.batchProblems[room.currentBatchIndex];
    room.questionStartTime = Date.now();
    room.players.forEach(p => {
      p.currentAnswer = null;
      p.answerTime = null;
      p.usedHint = false;
    });
    return true;
  }
  return false;
}

// Submit an answer
function submitAnswer(room, playerId, answer) {
  const player = room.players.find(p => p.id === playerId);
  if (!player || player.currentAnswer !== null) return { error: 'Cannot submit answer' };

  const answerTime = Date.now() - room.questionStartTime;
  player.currentAnswer = answer;
  player.answerTime = answerTime;

  // Track in batch answers
  const correct = answersMatch(answer, room.currentProblem.answer);
  player.batchAnswers.push({
    questionIndex: room.currentBatchIndex,
    answer: answer,
    time: answerTime,
    correct: correct,
    category: room.currentProblem.category,
    categoryName: room.currentProblem.categoryName,
    question: room.currentProblem.question,
    correctAnswer: room.currentProblem.answer
  });

  if (correct) {
    player.batchCorrect++;
  }

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

// Calculate results for single question (used in batch mode)
function calculateQuestionResult(room) {
  const problem = room.currentProblem;
  const correctAnswer = problem.answer;

  let winner = null;
  let fastestTime = Infinity;

  room.players.forEach(p => {
    if (answersMatch(p.currentAnswer, correctAnswer) && p.answerTime < fastestTime) {
      fastestTime = p.answerTime;
      winner = p;
    }
  });

  return {
    question: problem.question,
    correctAnswer: correctAnswer,
    category: problem.category,
    categoryName: problem.categoryName,
    winner: winner ? { id: winner.id, name: winner.name, time: winner.answerTime } : null,
    playerResults: room.players.map(p => ({
      id: p.id,
      name: p.name,
      answer: p.currentAnswer,
      correct: answersMatch(p.currentAnswer, correctAnswer),
      time: p.answerTime
    }))
  };
}

// Calculate batch/round results (determines pot winner and stats)
function calculateRoundResults(room) {
  const batchSize = room.settings.questionsPerBatch;

  // For single question mode, use simple winner determination
  if (batchSize === 1) {
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

      if (winner) {
        // There is a winner
        if (p.id === winner.id) {
          // Winner gets points and opponent's bet
          pointsEarned = 10 + Math.floor((5000 - Math.min(p.answerTime, 5000)) / 100);
          // Apply 75% penalty if hint was used
          if (p.usedHint) {
            pointsEarned = Math.floor(pointsEarned * 0.75);
          }
          const opponent = room.players.find(op => op.id !== p.id);
          if (opponent) {
            coinsChange = opponent.bet;
          }
        } else {
          // Loser loses their bet (even if they got it correct but slower)
          if (correct) {
            pointsEarned = 5; // Some points for being correct
            if (p.usedHint) {
              pointsEarned = Math.floor(pointsEarned * 0.75);
            }
          }
          coinsChange = -p.bet;
        }
      } else {
        // No winner (both wrong or no answers)
        if (!correct) {
          coinsChange = -p.bet; // Lose bet if wrong
        }
        // If correct but no winner (shouldn't happen in 1v1), keep bet
      }

      p.score += pointsEarned;
      p.coins += coinsChange;
      if (p.coins < 0) p.coins = 0; // Floor at 0

      return {
        id: p.id,
        name: p.name,
        answer: p.currentAnswer,
        correct,
        time: p.answerTime,
        pointsEarned,
        coinsChange,
        totalScore: p.score,
        totalCoins: p.coins,
        batchAnswers: p.batchAnswers
      };
    });

    room.questionNumber++;

    return {
      correctAnswer,
      category: room.currentProblem.category,
      categoryName: room.currentProblem.categoryName,
      question: room.currentProblem.question,
      winner: winner ? { id: winner.id, name: winner.name } : null,
      results,
      questionNumber: room.questionNumber,
      totalQuestions: room.totalQuestions,
      gameOver: room.questionNumber >= room.totalQuestions,
      batchMode: false
    };
  }

  // Batch mode - winner is whoever got most correct (ties go to faster average)
  let batchWinner = null;
  let maxCorrect = 0;
  let fastestAvg = Infinity;

  room.players.forEach(p => {
    const correctCount = p.batchCorrect;
    const avgTime = p.batchAnswers.length > 0
      ? p.batchAnswers.reduce((sum, a) => sum + a.time, 0) / p.batchAnswers.length
      : Infinity;

    if (correctCount > maxCorrect || (correctCount === maxCorrect && avgTime < fastestAvg)) {
      maxCorrect = correctCount;
      fastestAvg = avgTime;
      batchWinner = p;
    }
  });

  // Calculate scores and coins for batch
  const totalPot = room.players.reduce((sum, p) => sum + p.bet, 0);

  const results = room.players.map(p => {
    let coinsChange = 0;
    let pointsEarned = 0;

    const avgTime = p.batchAnswers.length > 0
      ? p.batchAnswers.reduce((sum, a) => sum + a.time, 0) / p.batchAnswers.length
      : 0;

    if (batchWinner) {
      // There is a winner
      if (p.id === batchWinner.id) {
        // Winner gets points per correct answer + opponent's bet
        pointsEarned = p.batchCorrect * 10;
        const opponent = room.players.find(op => op.id !== p.id);
        if (opponent) {
          coinsChange = opponent.bet;
        }
      } else {
        // Loser loses their bet
        pointsEarned = p.batchCorrect * 3; // Some points for correct answers
        coinsChange = -p.bet;
      }
    } else {
      // No winner (tie or both zero)
      pointsEarned = p.batchCorrect * 3;
      // Keep bets in a tie
    }

    p.score += pointsEarned;
    p.coins += coinsChange;
    if (p.coins < 0) p.coins = 0; // Floor at 0

    return {
      id: p.id,
      name: p.name,
      batchCorrect: p.batchCorrect,
      batchTotal: batchSize,
      avgTime: Math.round(avgTime),
      pointsEarned,
      coinsChange,
      totalScore: p.score,
      totalCoins: p.coins,
      batchAnswers: p.batchAnswers
    };
  });

  room.questionNumber += batchSize;

  // Compile batch stats
  const batchStats = room.batchProblems.map((problem, idx) => ({
    question: problem.question,
    correctAnswer: problem.answer,
    category: problem.category,
    categoryName: problem.categoryName,
    playerResults: room.players.map(p => {
      const ans = p.batchAnswers.find(a => a.questionIndex === idx);
      return {
        id: p.id,
        name: p.name,
        answer: ans ? ans.answer : null,
        time: ans ? ans.time : null,
        correct: ans ? ans.correct : false
      };
    })
  }));

  return {
    batchMode: true,
    batchSize: batchSize,
    batchStats: batchStats,
    winner: batchWinner ? { id: batchWinner.id, name: batchWinner.name, correct: maxCorrect } : null,
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
    socket.emit('room-created', {
      roomCode: room.code,
      player: room.players[0],
      settings: room.settings,
      categories: categoryNames
    });
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
    socket.emit('room-joined', {
      roomCode: roomCode.toUpperCase(),
      player: newPlayer,
      settings: result.settings,
      categories: categoryNames
    });
    io.to(roomCode.toUpperCase()).emit('player-joined', {
      players: result.players,
      settings: result.settings
    });
  });

  // Add CPU opponent to room
  socket.on('add-cpu', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.state !== 'waiting') return;

    const result = addCpuOpponent(room);
    if (result.error) {
      socket.emit('error', result.error);
      return;
    }

    io.to(roomCode).emit('player-joined', {
      players: room.players,
      settings: room.settings
    });
  });

  // Create room and immediately add CPU
  socket.on('play-vs-cpu', (playerName) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    addCpuOpponent(room);

    socket.emit('room-created', {
      roomCode: room.code,
      player: room.players[0],
      settings: room.settings,
      categories: categoryNames
    });

    // Immediately notify about CPU joining
    io.to(room.code).emit('player-joined', {
      players: room.players,
      settings: room.settings
    });
  });

  // Update room settings (host only)
  socket.on('update-settings', (newSettings) => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;
    if (room.state !== 'waiting') return;

    // Validate and apply settings
    if (typeof newSettings.timeLimit === 'number') {
      room.settings.timeLimit = Math.max(0, Math.min(300, newSettings.timeLimit));
    }
    if (typeof newSettings.questionsPerBatch === 'number') {
      room.settings.questionsPerBatch = Math.max(1, Math.min(10, newSettings.questionsPerBatch));
    }
    if (newSettings.focusCategory === null || categoryNames[newSettings.focusCategory]) {
      room.settings.focusCategory = newSettings.focusCategory;
    }
    if (typeof newSettings.totalQuestions === 'number') {
      room.totalQuestions = Math.max(5, Math.min(50, newSettings.totalQuestions));
    }

    io.to(roomCode).emit('settings-updated', {
      settings: room.settings,
      totalQuestions: room.totalQuestions
    });
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
    room.roundStats = [];
    room.players.forEach(p => {
      p.score = 0;
      p.coins = 100;
      p.batchAnswers = [];
      p.batchCorrect = 0;
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
      totalQuestions: room.totalQuestions,
      settings: room.settings,
      batchSize: room.settings.questionsPerBatch
    });

    // Auto-bet for CPU after a short delay
    if (room.hasCpu) {
      setTimeout(() => {
        const cpuBet = cpuPlaceBet(room);
        if (cpuBet !== undefined) {
          const cpu = room.players.find(p => p.isCpu);
          io.to(roomCode).emit('bet-placed', {
            playerId: cpu.id,
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              ready: p.ready,
              coins: p.coins
            }))
          });

          // Check if all ready
          if (room.players.every(p => p.ready)) {
            setTimeout(() => {
              startQuestionRound(room);
              emitQuestionStart(roomCode, room);
            }, 1000);
          }
        }
      }, 500 + Math.random() * 1000);
    }
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
        emitQuestionStart(roomCode, room);
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

    io.to(roomCode).emit('answer-submitted', {
      playerId: socket.id,
      questionIndex: room.currentBatchIndex
    });

    if (result.allAnswered) {
      handleAllAnswered(roomCode, room);
    }
  });

  // Request hint
  socket.on('request-hint', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.usedHint) {
      player.usedHint = true;
      socket.emit('hint-response', {
        hint: room.currentProblem.hint || 'No hint available'
      });
    }
  });

  // Return to lobby (host only)
  socket.on('return-to-lobby', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    // Find the winner before resetting scores
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    const lastWinnerId = sortedPlayers[0]?.score > 0 ? sortedPlayers[0].id : null;

    room.state = 'waiting';
    room.questionNumber = 0;
    room.roundStats = [];
    room.lastWinnerId = lastWinnerId;
    room.players.forEach(p => {
      p.score = 0;
      p.coins = 100;
      p.ready = false;
      p.batchAnswers = [];
      p.batchCorrect = 0;
    });

    io.to(roomCode).emit('game-reset', {
      players: room.players,
      settings: room.settings,
      lastWinnerId: lastWinnerId
    });
  });

  // Play again
  socket.on('play-again', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room) return;

    // Find the winner before resetting scores
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    const lastWinnerId = sortedPlayers[0]?.score > 0 ? sortedPlayers[0].id : null;

    room.state = 'waiting';
    room.questionNumber = 0;
    room.roundStats = [];
    room.lastWinnerId = lastWinnerId;
    room.players.forEach(p => {
      p.score = 0;
      p.coins = 100;
      p.ready = false;
      p.batchAnswers = [];
      p.batchCorrect = 0;
    });

    io.to(roomCode).emit('game-reset', {
      players: room.players,
      settings: room.settings,
      lastWinnerId: lastWinnerId
    });
  });

  // Ready for next round
  socket.on('ready-next-round', () => {
    const roomCode = playerRooms.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'results') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.readyForNext = true;
    }

    // Notify all players of ready status
    io.to(roomCode).emit('player-ready-next', {
      playerId: socket.id,
      readyPlayers: room.players.filter(p => p.readyForNext).map(p => p.name)
    });

    // Auto-ready CPU
    if (room.hasCpu) {
      const cpu = room.players.find(p => p.isCpu);
      if (cpu && !cpu.readyForNext) {
        setTimeout(() => {
          cpu.readyForNext = true;
          io.to(roomCode).emit('player-ready-next', {
            playerId: cpu.id,
            readyPlayers: room.players.filter(p => p.readyForNext).map(p => p.name)
          });
          checkAllReadyForNext(roomCode, room);
        }, 500 + Math.random() * 1000);
      }
    }

    checkAllReadyForNext(roomCode, room);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const roomCode = playerRooms.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Clear any pending timers for this room
        if (room.questionTimer) {
          clearTimeout(room.questionTimer);
        }
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

// Helper to emit question start
function emitQuestionStart(roomCode, room) {
  io.to(roomCode).emit('question-start', {
    question: room.currentProblem.question,
    category: room.currentProblem.category,
    categoryName: room.currentProblem.categoryName,
    hint: room.currentProblem.hint,
    questionNumber: room.questionNumber + room.currentBatchIndex + 1,
    totalQuestions: room.totalQuestions,
    batchIndex: room.currentBatchIndex,
    batchSize: room.settings.questionsPerBatch,
    timeLimit: room.settings.timeLimit
  });

  // Set up auto-end timer if time limit is set
  if (room.settings.timeLimit > 0) {
    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(() => {
      if (room.state === 'playing') {
        handleAllAnswered(roomCode, room);
      }
    }, room.settings.timeLimit * 1000);
  }

  // Trigger CPU answer
  if (room.hasCpu) {
    cpuAnswerQuestion(room, io, roomCode);
  }
}

// Handle when all players answered (or timeout)
function handleAllAnswered(roomCode, room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  // Store question result for stats
  const questionResult = calculateQuestionResult(room);
  room.roundStats.push(questionResult);

  // Check if more questions in batch
  if (room.settings.questionsPerBatch > 1 && room.currentBatchIndex < room.batchProblems.length - 1) {
    // Send quick result for this question
    io.to(roomCode).emit('question-result', {
      questionIndex: room.currentBatchIndex,
      correctAnswer: room.currentProblem.answer,
      category: room.currentProblem.categoryName,
      question: room.currentProblem.question,
      playerResults: room.players.map(p => ({
        id: p.id,
        name: p.name,
        answer: p.currentAnswer,
        correct: answersMatch(p.currentAnswer, room.currentProblem.answer),
        time: p.answerTime
      })),
      batchProgress: room.currentBatchIndex + 1,
      batchTotal: room.batchProblems.length
    });

    // Move to next question in batch after brief delay
    setTimeout(() => {
      nextBatchQuestion(room);
      emitQuestionStart(roomCode, room);
    }, 1500);
  } else {
    // End of batch/round
    endRound(roomCode);
  }
}

function endRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  const roundResults = calculateRoundResults(room);
  roundResults.roundStats = room.roundStats;
  room.state = 'results';
  room.roundStats = [];

  // Reset ready state for next round
  room.players.forEach(p => {
    p.readyForNext = false;
  });

  io.to(roomCode).emit('round-results', roundResults);

  if (roundResults.gameOver) {
    // Game over will be triggered when player clicks Next Round on final stats
    room.gameOverPending = true;
  }
  // Don't auto-advance - wait for players to click Next Round
}

// Check if all players are ready for next round
function checkAllReadyForNext(roomCode, room) {
  const allReady = room.players.every(p => p.readyForNext);
  if (allReady) {
    startBettingRound(room);
    io.to(roomCode).emit('betting-phase', {
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        score: p.score
      })),
      questionNumber: room.questionNumber + 1,
      totalQuestions: room.totalQuestions,
      settings: room.settings,
      batchSize: room.settings.questionsPerBatch
    });

    // Auto-bet for CPU
    if (room.hasCpu) {
      setTimeout(() => {
        const cpuBet = cpuPlaceBet(room);
        if (cpuBet !== undefined) {
          const cpu = room.players.find(p => p.isCpu);
          io.to(roomCode).emit('bet-placed', {
            playerId: cpu.id,
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              ready: p.ready,
              coins: p.coins
            }))
          });

          if (room.players.every(p => p.ready)) {
            setTimeout(() => {
              startQuestionRound(room);
              emitQuestionStart(roomCode, room);
            }, 1000);
          }
        }
      }, 500 + Math.random() * 1000);
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Math Race server running on http://localhost:${PORT}`);
});
