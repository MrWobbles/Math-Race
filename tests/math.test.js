/**
 * Math Race - Automated Test Suite
 * Tests problem generators, formulas, calculations, and answer matching
 *
 * Run with: npm test
 */

const assert = require('assert');

// ============================================
// UTILITY FUNCTIONS (extracted from server.js)
// ============================================

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function answersMatch(given, correct) {
  if (given === null || given === undefined) return false;
  const givenRounded = Math.round(given * 100) / 100;
  const correctRounded = Math.round(correct * 100) / 100;
  return Math.abs(givenRounded - correctRounded) < 0.01;
}

// ============================================
// PROBLEM GENERATORS (extracted from server.js)
// ============================================

const problemGenerators = {
  arithmetic: () => {
    const ops = [
      { symbol: '+', fn: (a, b) => a + b, hint: 'Addition: a + b = sum' },
      { symbol: '-', fn: (a, b) => a - b, hint: 'Subtraction: a - b = difference' },
      { symbol: '×', fn: (a, b) => a * b, hint: 'Multiplication: a × b = product' },
      { symbol: '÷', fn: (a, b) => a / b, hint: 'Division: a ÷ b = quotient' }
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
        solution: `${num}/${denomFull} = ${simplified}/${denom}`,
        hint: 'Simplify: Divide numerator and denominator by GCD'
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
        hint: 'Same denominator: (a + b) / d'
      };
    } else if (type === 'subtract') {
      const [n1, n2] = num1 > num2 ? [num1, num2] : [num2, num1];
      const diff = n1 - n2;
      const answer = roundTo(diff / denom, 2);
      return {
        question: `${n1}/${denom} - ${n2}/${denom} = ? (decimal)`,
        answer,
        hint: 'Same denominator: (a - b) / d'
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
        hint: 'Multiply fractions: (a/b) × (c/d) = (a×c)/(b×d)'
      };
    }
  },

  decimals: () => {
    const ops = [
      { symbol: '+', hint: 'Decimal addition' },
      { symbol: '-', hint: 'Decimal subtraction' },
      { symbol: '×', hint: 'Decimal multiplication' }
    ];
    const opObj = ops[randomInt(0, 2)];
    const op = opObj.symbol;
    const a = roundTo(randomInt(10, 99) / 10, 1);
    const b = roundTo(randomInt(10, 99) / 10, 1);

    let answer, question;
    if (op === '+') {
      answer = roundTo(a + b, 2);
      question = `${a} + ${b} = ?`;
    } else if (op === '-') {
      const [x, y] = a > b ? [a, b] : [b, a];
      answer = roundTo(x - y, 2);
      question = `${x} - ${y} = ?`;
    } else {
      answer = roundTo(a * b, 2);
      question = `${a} × ${b} = ?`;
    }

    return { question, answer, hint: opObj.hint };
  },

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
        hint: 'Find percent: (percent / 100) × whole'
      };
    } else if (type === 'whatPercent') {
      const part = randomInt(1, 10) * 5;
      const whole = randomInt(2, 5) * part;
      const answer = (part / whole) * 100;
      return {
        question: `${part} is what % of ${whole}?`,
        answer,
        hint: 'What percent: (part ÷ whole) × 100'
      };
    } else {
      const result = randomInt(2, 10) * 5;
      const percent = randomInt(1, 5) * 10;
      const whole = (result / percent) * 100;
      return {
        question: `${result} is ${percent}% of what number?`,
        answer: whole,
        hint: 'Find whole: result ÷ (percent / 100)'
      };
    }
  },

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
        hint: 'Simplify ratio: Divide both by GCD'
      };
    } else if (type === 'solve') {
      const a = randomInt(2, 8);
      const b = randomInt(2, 8);
      const c = randomInt(2, 6) * a;
      const answer = (c * b) / a;
      return {
        question: `If ${a}/${b} = ${c}/x, find x`,
        answer,
        hint: 'Cross multiply: a/b = c/x → x = (b×c)/a'
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
        hint: 'Divide in ratio: total ÷ (a+b) = unit'
      };
    }
  },

  exponents: () => {
    const types = ['power', 'multiply', 'evaluate'];
    const type = types[randomInt(0, 2)];

    if (type === 'power') {
      const base = randomInt(2, 6);
      const exp = randomInt(2, 4);
      const answer = Math.pow(base, exp);
      return {
        question: `${base}^${exp} = ?`,
        answer,
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
        hint: 'Evaluate: First calculate the exponent, then multiply'
      };
    }
  },

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
        hint: 'Add roots: Find each root separately, then add'
      };
    }
  },

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
          hint: 'ax = b → x = b ÷ a'
        };
      } else if (op === '+') {
        const answer = b - a;
        return {
          question: `x + ${a} = ${b}. Find x`,
          answer,
          hint: 'x + a = b → x = b - a'
        };
      } else {
        return {
          question: `x - ${a} = ${b - a}. Find x`,
          answer: b,
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
        hint: 'Get all x terms on one side, constants on other'
      };
    }
  },

  wordProblems: () => {
    const problems = [
      () => {
        const v = randomInt(12, 24) * 10;
        const r = randomInt(2, 10) * 10;
        const i = v / r;
        return {
          question: `Ohm's Law: V=${v}V, R=${r}Ω. Find I (amps)`,
          answer: i,
          hint: "Ohm's Law: I = V / R"
        };
      },
      () => {
        const i = randomInt(5, 20);
        const r = randomInt(2, 15);
        const v = i * r;
        return {
          question: `Ohm's Law: I=${i}A, R=${r}Ω. Find V (volts)`,
          answer: v,
          hint: "Ohm's Law: V = I × R"
        };
      },
      () => {
        const v = randomInt(10, 25) * 10;
        const i = randomInt(2, 10);
        const p = v * i;
        return {
          question: `Power: V=${v}V, I=${i}A. Find P (watts)`,
          answer: p,
          hint: 'Power: P = V × I'
        };
      },
      () => {
        const totalFeet = randomInt(5, 20) * 10;
        const inches = totalFeet * 12;
        return {
          question: `Convert ${totalFeet} feet to inches`,
          answer: inches,
          hint: '1 foot = 12 inches'
        };
      },
      () => {
        const hours = randomInt(3, 8);
        const rate = randomInt(25, 75);
        const total = hours * rate;
        return {
          question: `${hours} hours labor at $${rate}/hr. Total cost?`,
          answer: total,
          hint: 'Total = Hours × Rate'
        };
      },
      () => {
        const watts = randomInt(10, 100) * 10;
        const hours = randomInt(2, 10);
        const kwh = (watts * hours) / 1000;
        return {
          question: `${watts}W for ${hours} hrs = ? kWh`,
          answer: kwh,
          hint: 'kWh = (Watts × Hours) ÷ 1000'
        };
      }
    ];

    return problems[randomInt(0, problems.length - 1)]();
  }
};

// ============================================
// TEST RUNNER
// ============================================

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ============================================
// TESTS: UTILITY FUNCTIONS
// ============================================

describe('Utility Functions', () => {
  test('gcd(12, 8) should return 4', () => {
    assert.strictEqual(gcd(12, 8), 4);
  });

  test('gcd(15, 25) should return 5', () => {
    assert.strictEqual(gcd(15, 25), 5);
  });

  test('gcd(7, 3) should return 1', () => {
    assert.strictEqual(gcd(7, 3), 1);
  });

  test('roundTo(3.14159, 2) should return 3.14', () => {
    assert.strictEqual(roundTo(3.14159, 2), 3.14);
  });

  test('roundTo(2.555, 2) should return 2.56', () => {
    assert.strictEqual(roundTo(2.555, 2), 2.56);
  });

  test('randomInt should return values within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(5, 10);
      assert(val >= 5 && val <= 10, `${val} not in range [5, 10]`);
    }
  });
});

// ============================================
// TESTS: ANSWER MATCHING
// ============================================

describe('Answer Matching', () => {
  test('answersMatch(5, 5) should return true', () => {
    assert.strictEqual(answersMatch(5, 5), true);
  });

  test('answersMatch(5.001, 5) should return true (within tolerance)', () => {
    assert.strictEqual(answersMatch(5.001, 5), true);
  });

  test('answersMatch(5.1, 5) should return false', () => {
    assert.strictEqual(answersMatch(5.1, 5), false);
  });

  test('answersMatch(null, 5) should return false', () => {
    assert.strictEqual(answersMatch(null, 5), false);
  });

  test('answersMatch(undefined, 5) should return false', () => {
    assert.strictEqual(answersMatch(undefined, 5), false);
  });

  test('answersMatch(0.33, 0.333) should return true', () => {
    assert.strictEqual(answersMatch(0.33, 0.333), true);
  });

  test('answersMatch(-5, -5) should return true', () => {
    assert.strictEqual(answersMatch(-5, -5), true);
  });
});

// ============================================
// TESTS: ARITHMETIC GENERATOR
// ============================================

describe('Arithmetic Problem Generator', () => {
  test('should generate valid addition problems', () => {
    for (let i = 0; i < 20; i++) {
      const problem = problemGenerators.arithmetic();
      if (problem.question.includes('+')) {
        const match = problem.question.match(/(\d+) \+ (\d+) = \?/);
        if (match) {
          const [, a, b] = match.map(Number);
          assert.strictEqual(problem.answer, a + b, `${a} + ${b} should equal ${a + b}, got ${problem.answer}`);
        }
      }
    }
  });

  test('should generate valid subtraction problems', () => {
    for (let i = 0; i < 20; i++) {
      const problem = problemGenerators.arithmetic();
      if (problem.question.includes('-')) {
        const match = problem.question.match(/(\d+) - (\d+) = \?/);
        if (match) {
          const [, a, b] = match.map(Number);
          assert.strictEqual(problem.answer, a - b, `${a} - ${b} should equal ${a - b}, got ${problem.answer}`);
        }
      }
    }
  });

  test('should generate valid multiplication problems', () => {
    for (let i = 0; i < 20; i++) {
      const problem = problemGenerators.arithmetic();
      if (problem.question.includes('×')) {
        const match = problem.question.match(/(\d+) × (\d+) = \?/);
        if (match) {
          const [, a, b] = match.map(Number);
          assert.strictEqual(problem.answer, a * b, `${a} × ${b} should equal ${a * b}, got ${problem.answer}`);
        }
      }
    }
  });

  test('should generate valid division problems with whole number results', () => {
    for (let i = 0; i < 20; i++) {
      const problem = problemGenerators.arithmetic();
      if (problem.question.includes('÷')) {
        const match = problem.question.match(/(\d+) ÷ (\d+) = \?/);
        if (match) {
          const [, a, b] = match.map(Number);
          assert.strictEqual(problem.answer, a / b, `${a} ÷ ${b} should equal ${a / b}, got ${problem.answer}`);
          assert(Number.isInteger(problem.answer), 'Division answer should be whole number');
        }
      }
    }
  });
});

// ============================================
// TESTS: FRACTIONS GENERATOR
// ============================================

describe('Fractions Problem Generator', () => {
  test('should generate valid fraction problems with correct answers', () => {
    for (let i = 0; i < 50; i++) {
      const problem = problemGenerators.fractions();
      assert(problem.answer !== undefined, 'Answer should be defined');
      assert(typeof problem.answer === 'number', 'Answer should be a number');
      assert(!isNaN(problem.answer), 'Answer should not be NaN');
    }
  });

  test('fraction addition: (a+b)/d should match answer', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.fractions();
      if (problem.question.includes('+') && problem.question.includes('decimal')) {
        const match = problem.question.match(/(\d+)\/(\d+) \+ (\d+)\/(\d+)/);
        if (match) {
          const [, n1, d1, n2, d2] = match.map(Number);
          if (d1 === d2) {
            const expected = roundTo((n1 + n2) / d1, 2);
            assert(answersMatch(problem.answer, expected),
              `${n1}/${d1} + ${n2}/${d2} should be ${expected}, got ${problem.answer}`);
          }
        }
      }
    }
  });
});

// ============================================
// TESTS: PERCENTAGES GENERATOR
// ============================================

describe('Percentages Problem Generator', () => {
  test('findPercent: X% of Y should equal (X/100)*Y', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.percentages();
      if (problem.question.includes('What is') && problem.question.includes('%')) {
        const match = problem.question.match(/What is (\d+)% of (\d+)\?/);
        if (match) {
          const [, percent, whole] = match.map(Number);
          const expected = (percent / 100) * whole;
          assert(answersMatch(problem.answer, expected),
            `${percent}% of ${whole} should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test('whatPercent: part/whole * 100 should match answer', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.percentages();
      if (problem.question.includes('what %')) {
        const match = problem.question.match(/(\d+) is what % of (\d+)\?/);
        if (match) {
          const [, part, whole] = match.map(Number);
          const expected = (part / whole) * 100;
          assert(answersMatch(problem.answer, expected),
            `${part} is ${expected}% of ${whole}, got ${problem.answer}`);
        }
      }
    }
  });
});

// ============================================
// TESTS: EXPONENTS GENERATOR
// ============================================

describe('Exponents Problem Generator', () => {
  test('power: base^exp should equal Math.pow(base, exp)', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.exponents();
      if (problem.question.match(/^\d+\^\d+ = \?$/)) {
        const match = problem.question.match(/(\d+)\^(\d+) = \?/);
        if (match) {
          const [, base, exp] = match.map(Number);
          const expected = Math.pow(base, exp);
          assert.strictEqual(problem.answer, expected,
            `${base}^${exp} should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test('multiply exponents: a^m × a^n = a^(m+n)', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.exponents();
      if (problem.question.includes('×') && problem.question.includes('^?')) {
        const match = problem.question.match(/(\d+)\^(\d+) × (\d+)\^(\d+) = (\d+)\^\?/);
        if (match) {
          const [, base1, exp1, base2, exp2] = match.map(Number);
          if (base1 === base2) {
            const expected = exp1 + exp2;
            assert.strictEqual(problem.answer, expected,
              `${base1}^${exp1} × ${base1}^${exp2} = ${base1}^${expected}, got ${problem.answer}`);
          }
        }
      }
    }
  });
});

// ============================================
// TESTS: SQUARE ROOTS GENERATOR
// ============================================

describe('Square Roots Problem Generator', () => {
  test('basic square root: √n should equal Math.sqrt(n)', () => {
    const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.squareRoots();
      if (problem.question.match(/^√\d+ = \?$/)) {
        const match = problem.question.match(/√(\d+) = \?/);
        if (match) {
          const n = Number(match[1]);
          const expected = Math.sqrt(n);
          assert.strictEqual(problem.answer, expected,
            `√${n} should be ${expected}, got ${problem.answer}`);
          assert(perfectSquares.includes(n), `${n} should be a perfect square`);
        }
      }
    }
  });
});

// ============================================
// TESTS: LINEAR EQUATIONS GENERATOR
// ============================================

describe('Linear Equations Problem Generator', () => {
  test('oneStep multiplication: ax = b, x = b/a', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.linearEquations();
      if (problem.question.match(/^\d+x = \d+\. Find x$/)) {
        const match = problem.question.match(/(\d+)x = (\d+)\. Find x/);
        if (match) {
          const [, a, b] = match.map(Number);
          const expected = b / a;
          assert(answersMatch(problem.answer, expected),
            `${a}x = ${b}, x should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test('twoStep: ax + b = c, x = (c-b)/a', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.linearEquations();
      if (problem.question.match(/^\d+x \+ \d+ = \d+\. Find x$/)) {
        const match = problem.question.match(/(\d+)x \+ (\d+) = (\d+)\. Find x/);
        if (match) {
          const [, a, b, c] = match.map(Number);
          const expected = (c - b) / a;
          assert(answersMatch(problem.answer, expected),
            `${a}x + ${b} = ${c}, x should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });
});

// ============================================
// TESTS: WORD PROBLEMS (OHM'S LAW & POWER)
// ============================================

describe('Word Problems - Electrical Formulas', () => {
  test("Ohm's Law (find I): I = V/R", () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.wordProblems();
      if (problem.question.includes('Find I')) {
        const match = problem.question.match(/V=(\d+)V, R=(\d+)Ω/);
        if (match) {
          const [, v, r] = match.map(Number);
          const expected = v / r;
          assert(answersMatch(problem.answer, expected),
            `I = ${v}/${r} should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test("Ohm's Law (find V): V = I*R", () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.wordProblems();
      if (problem.question.includes('Find V')) {
        const match = problem.question.match(/I=(\d+)A, R=(\d+)Ω/);
        if (match) {
          const [, i, r] = match.map(Number);
          const expected = i * r;
          assert(answersMatch(problem.answer, expected),
            `V = ${i}*${r} should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test('Power: P = V*I', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.wordProblems();
      if (problem.question.includes('Find P')) {
        const match = problem.question.match(/V=(\d+)V, I=(\d+)A/);
        if (match) {
          const [, v, i] = match.map(Number);
          const expected = v * i;
          assert(answersMatch(problem.answer, expected),
            `P = ${v}*${i} should be ${expected}, got ${problem.answer}`);
        }
      }
    }
  });

  test('Unit conversion: feet to inches (×12)', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.wordProblems();
      if (problem.question.includes('feet to inches')) {
        const match = problem.question.match(/Convert (\d+) feet/);
        if (match) {
          const feet = Number(match[1]);
          const expected = feet * 12;
          assert.strictEqual(problem.answer, expected,
            `${feet} feet = ${expected} inches, got ${problem.answer}`);
        }
      }
    }
  });

  test('Energy: kWh = (W × h) / 1000', () => {
    for (let i = 0; i < 30; i++) {
      const problem = problemGenerators.wordProblems();
      if (problem.question.includes('kWh')) {
        const match = problem.question.match(/(\d+)W for (\d+) hrs/);
        if (match) {
          const [, watts, hours] = match.map(Number);
          const expected = (watts * hours) / 1000;
          assert(answersMatch(problem.answer, expected),
            `${watts}W × ${hours}h / 1000 = ${expected} kWh, got ${problem.answer}`);
        }
      }
    }
  });
});

// ============================================
// TESTS: HINT PENALTY CALCULATION
// ============================================

describe('Score Calculations', () => {
  test('75% hint penalty calculation', () => {
    const basePoints = 10;
    const withHint = Math.floor(basePoints * 0.75);
    assert.strictEqual(withHint, 7, 'Base 10 points with hint should be 7');

    const speedBonus = 50;
    const fullPoints = basePoints + speedBonus;
    const hintPoints = Math.floor(fullPoints * 0.75);
    assert.strictEqual(hintPoints, 45, '60 points with hint should be 45');
  });

  test('Points should always be non-negative after hint penalty', () => {
    for (let i = 0; i < 100; i++) {
      const basePoints = randomInt(0, 100);
      const hintPoints = Math.floor(basePoints * 0.75);
      assert(hintPoints >= 0, 'Points with hint should be non-negative');
    }
  });
});

// ============================================
// TESTS: ALL GENERATORS PRODUCE VALID PROBLEMS
// ============================================

describe('All Generators Validation', () => {
  const categories = Object.keys(problemGenerators);

  categories.forEach(category => {
    test(`${category}: should always have question, answer, and hint`, () => {
      for (let i = 0; i < 20; i++) {
        const problem = problemGenerators[category]();
        assert(problem.question, `${category} should have a question`);
        assert(problem.answer !== undefined, `${category} should have an answer`);
        assert(problem.hint, `${category} should have a hint`);
        assert(typeof problem.answer === 'number', `${category} answer should be a number`);
        assert(!isNaN(problem.answer), `${category} answer should not be NaN`);
        assert(isFinite(problem.answer), `${category} answer should be finite`);
      }
    });
  });
});

// ============================================
// RUN ALL TESTS
// ============================================

console.log('\n========================================');
console.log('Math Race - Automated Test Suite');
console.log('========================================');

// Tests are run as they're defined above

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failures.length > 0) {
  console.log('\nFailed Tests:');
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
