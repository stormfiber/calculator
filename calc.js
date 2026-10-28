// Quadrant Calc Pro - Core Engine & UI Logic
(function () {
  'use strict';

  // State
  let currentMode = 'basic'; // 'basic' | 'standard' | 'professional' | 'scientific'
  let expression = '';
  let result = '0';
  let isResultEvaluated = false;
  let memoryValue = 0;
  let isDegreeMode = true; // true = DEG, false = RAD
  let isSecondFn = false; // For scientific alternate functions
  let soundEnabled = true;
  let defaultTaxRate = 10.0;
  let calculationHistory = [];
  let historySeq = 0;
  let undoHistoryTimer = null;
  let undoToastEl = null;
  let historyQuery = '';
  let historyDateFilter = 'all';
  let currentPalette = 'purple';
  let currentTheme = 'system';

  // Elements
  const exprEl = document.getElementById('calc-expression');
  const resultEl = document.getElementById('calc-result');
  const previewEl = document.getElementById('calc-preview');
  const keypadEl = document.getElementById('calc-keypad');
  const quickToolbarEl = document.getElementById('quick-toolbar');
  const radDegIndicator = document.getElementById('indicator-rad-deg');
  const memoryIndicator = document.getElementById('indicator-memory');
  const modeNameIndicator = document.getElementById('indicator-mode-name');
  const modePills = document.querySelectorAll('.m3-mode-pill');
  
  // History & Sheets
  const sheetHistory = document.getElementById('sheet-history');
  const sheetSettings = document.getElementById('sheet-settings');
  const modalProTool = document.getElementById('modal-pro-tool');
  const sheetHistoryList = document.getElementById('sheet-history-list');
  const desktopHistoryList = document.getElementById('desktop-history-list');
  const historyBadge = document.getElementById('history-badge');
  const sheetHistorySearch = document.getElementById('sheet-history-search');
  const desktopHistorySearch = document.getElementById('desktop-history-search');
  const sheetHistoryDateFilter = document.getElementById('sheet-history-date-filter');
  const desktopHistoryDateFilter = document.getElementById('desktop-history-date-filter');
  const soundIcon = document.getElementById('sound-icon');
  const settingSoundToggle = document.getElementById('setting-sound-toggle');
  const settingTaxRateInput = document.getElementById('setting-tax-rate');
  const btnCopyResult = document.getElementById('btn-copy-result');

  // Keypad layouts
  const layouts = {
    basic: [
      { label: 'C', action: 'clear', type: 'key-clear' },
      { label: '⌫', action: 'backspace', type: 'key-func' },
      { label: '%', action: 'percent', type: 'key-func' },
      { label: '÷', action: 'op', value: '/', type: 'key-op' },

      { label: '7', action: 'num', value: '7', type: 'key-num' },
      { label: '8', action: 'num', value: '8', type: 'key-num' },
      { label: '9', action: 'num', value: '9', type: 'key-num' },
      { label: '×', action: 'op', value: '*', type: 'key-op' },

      { label: '4', action: 'num', value: '4', type: 'key-num' },
      { label: '5', action: 'num', value: '5', type: 'key-num' },
      { label: '6', action: 'num', value: '6', type: 'key-num' },
      { label: '−', action: 'op', value: '-', type: 'key-op' },

      { label: '1', action: 'num', value: '1', type: 'key-num' },
      { label: '2', action: 'num', value: '2', type: 'key-num' },
      { label: '3', action: 'num', value: '3', type: 'key-num' },
      { label: '+', action: 'op', value: '+', type: 'key-op' },

      { label: '±', action: 'negate', type: 'key-func' },
      { label: '0', action: 'num', value: '0', type: 'key-num' },
      { label: '.', action: 'dot', type: 'key-num' },
      { label: '=', action: 'equals', type: 'key-equal' }
    ],

    standard: [
      { label: '(', action: 'paren', value: '(', type: 'key-func' },
      { label: ')', action: 'paren', value: ')', type: 'key-func' },
      { label: '⌫', action: 'backspace', type: 'key-func' },
      { label: 'C', action: 'clear', type: 'key-clear' },

      { label: 'x²', action: 'func', value: 'sqr', type: 'key-func' },
      { label: '√x', action: 'func', value: 'sqrt', type: 'key-func' },
      { label: '%', action: 'percent', type: 'key-func' },
      { label: '÷', action: 'op', value: '/', type: 'key-op' },

      { label: '7', action: 'num', value: '7', type: 'key-num' },
      { label: '8', action: 'num', value: '8', type: 'key-num' },
      { label: '9', action: 'num', value: '9', type: 'key-num' },
      { label: '×', action: 'op', value: '*', type: 'key-op' },

      { label: '4', action: 'num', value: '4', type: 'key-num' },
      { label: '5', action: 'num', value: '5', type: 'key-num' },
      { label: '6', action: 'num', value: '6', type: 'key-num' },
      { label: '−', action: 'op', value: '-', type: 'key-op' },

      { label: '1', action: 'num', value: '1', type: 'key-num' },
      { label: '2', action: 'num', value: '2', type: 'key-num' },
      { label: '3', action: 'num', value: '3', type: 'key-num' },
      { label: '+', action: 'op', value: '+', type: 'key-op' },

      { label: '±', action: 'negate', type: 'key-func' },
      { label: '0', action: 'num', value: '0', type: 'key-num' },
      { label: '.', action: 'dot', type: 'key-num' },
      { label: '=', action: 'equals', type: 'key-equal' }
    ],

    professional: [
      { label: 'TAX+', action: 'tax_add', type: 'key-func' },
      { label: 'TAX−', action: 'tax_sub', type: 'key-func' },
      { label: 'MU', action: 'markup', type: 'key-func' },
      { label: '⌫', action: 'backspace', type: 'key-func' },
      { label: 'C', action: 'clear', type: 'key-clear' },

      { label: 'GT', action: 'gt', type: 'key-func' },
      { label: '7', action: 'num', value: '7', type: 'key-num' },
      { label: '8', action: 'num', value: '8', type: 'key-num' },
      { label: '9', action: 'num', value: '9', type: 'key-num' },
      { label: '÷', action: 'op', value: '/', type: 'key-op' },

      { label: '%', action: 'percent', type: 'key-func' },
      { label: '4', action: 'num', value: '4', type: 'key-num' },
      { label: '5', action: 'num', value: '5', type: 'key-num' },
      { label: '6', action: 'num', value: '6', type: 'key-num' },
      { label: '×', action: 'op', value: '*', type: 'key-op' },

      { label: '±', action: 'negate', type: 'key-func' },
      { label: '1', action: 'num', value: '1', type: 'key-num' },
      { label: '2', action: 'num', value: '2', type: 'key-num' },
      { label: '3', action: 'num', value: '3', type: 'key-num' },
      { label: '−', action: 'op', value: '-', type: 'key-op' },

      { label: '00', action: 'num', value: '00', type: 'key-num' },
      { label: '0', action: 'num', value: '0', type: 'key-num' },
      { label: '.', action: 'dot', type: 'key-num' },
      { label: '=', action: 'equals', type: 'key-equal', wide: 2 }
    ],

    scientific: [
      { label: '2nd', action: 'sci_2nd', type: 'key-sci' },
      { label: 'deg', action: 'sci_angle', type: 'key-sci' },
      { label: 'sin', action: 'sci_fn', value: 'sin', type: 'key-sci' },
      { label: 'cos', action: 'sci_fn', value: 'cos', type: 'key-sci' },
      { label: 'tan', action: 'sci_fn', value: 'tan', type: 'key-sci' },

      { label: 'xʸ', action: 'op', value: '^', type: 'key-sci' },
      { label: 'lg', action: 'sci_fn', value: 'log', type: 'key-sci' },
      { label: 'ln', action: 'sci_fn', value: 'ln', type: 'key-sci' },
      { label: '(', action: 'paren', value: '(', type: 'key-func' },
      { label: ')', action: 'paren', value: ')', type: 'key-func' },

      { label: '√', action: 'func', value: 'sqrt', type: 'key-sci' },
      { label: 'C', action: 'clear', type: 'key-clear' },
      { label: '⌫', action: 'backspace', type: 'key-func' },
      { label: '%', action: 'percent', type: 'key-func' },
      { label: '÷', action: 'op', value: '/', type: 'key-op' },

      { label: 'x!', action: 'sci_fn', value: 'fact', type: 'key-sci' },
      { label: '7', action: 'num', value: '7', type: 'key-num' },
      { label: '8', action: 'num', value: '8', type: 'key-num' },
      { label: '9', action: 'num', value: '9', type: 'key-num' },
      { label: '×', action: 'op', value: '*', type: 'key-op' },

      { label: '1/x', action: 'func', value: 'inv', type: 'key-sci' },
      { label: '4', action: 'num', value: '4', type: 'key-num' },
      { label: '5', action: 'num', value: '5', type: 'key-num' },
      { label: '6', action: 'num', value: '6', type: 'key-num' },
      { label: '−', action: 'op', value: '-', type: 'key-op' },

      { label: 'π', action: 'sci_const', value: 'PI', type: 'key-sci' },
      { label: '1', action: 'num', value: '1', type: 'key-num' },
      { label: '2', action: 'num', value: '2', type: 'key-num' },
      { label: '3', action: 'num', value: '3', type: 'key-num' },
      { label: '+', action: 'op', value: '+', type: 'key-op' },

      { label: 'e', action: 'sci_const', value: 'E', type: 'key-sci' },
      { label: '±', action: 'negate', type: 'key-func' },
      { label: '0', action: 'num', value: '0', type: 'key-num' },
      { label: '.', action: 'dot', type: 'key-num' },
      { label: '=', action: 'equals', type: 'key-equal' }
    ]
  };

  // Grand total accumulator for Pro mode
  let grandTotal = 0;

  // Sound Feedback
  function playClick(type = 'tap') {
    if (!soundEnabled) return;
    try {
      if (window.fx && typeof window.fx.sound === 'function') {
        if (type === 'equal') window.fx.sound('pop');
        else if (type === 'clear') window.fx.sound('whoosh');
        else window.fx.sound('tap');
      }
    } catch (_) {}
  }

  // Update Display Elements
  function updateDisplay() {
    exprEl.textContent = formatExpressionDisplay(expression);
    resultEl.textContent = formatNumberDisplay(result);

    // Scale long results to the available display width while keeping them legible.
    const len = Math.max(result.length, 1);
    const availableWidth = resultEl.parentElement.clientWidth;
    const fittedSize = availableWidth / (len * 0.61);
    resultEl.style.fontSize = `${Math.max(20, Math.min(42, fittedSize))}px`;

    // Live preview
    if (expression && !isResultEvaluated) {
      try {
        const preview = evaluateExpression(expression);
        if (preview !== null && !isNaN(preview) && preview.toString() !== result) {
          previewEl.textContent = '= ' + formatNumberDisplay(preview.toString());
        } else {
          previewEl.textContent = '';
        }
      } catch (_) {
        previewEl.textContent = '';
      }
    } else {
      previewEl.textContent = '';
    }

    // Indicators
    if (memoryValue !== 0) {
      memoryIndicator.style.display = 'inline-block';
    } else {
      memoryIndicator.style.display = 'none';
    }

    if (currentMode === 'scientific') {
      radDegIndicator.style.display = 'inline-block';
      radDegIndicator.textContent = isDegreeMode ? 'DEG' : 'RAD';
    } else {
      radDegIndicator.style.display = 'none';
    }

    modeNameIndicator.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);

    persistState();
  }

  function formatExpressionDisplay(expr) {
    return expr
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ')
      .replace(/\+/g, ' + ')
      .replace(/\-/g, ' − ')
      .replace(/\^/g, ' ^ ');
  }

  function formatNumberDisplay(numStr) {
    if (numStr === 'Error' || numStr === 'Infinity' || numStr === '-Infinity') return numStr;
    const parts = numStr.split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? '.' + parts[1] : '';

    // Commas for integer part
    const isNeg = intPart.startsWith('-');
    if (isNeg) intPart = intPart.slice(1);

    if (intPart.length > 3) {
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    return (isNeg ? '-' : '') + intPart + decPart;
  }

  // Key Handler
  function handleKeyAction(key) {
    switch (key.action) {
      case 'num':
        handleNumber(key.value);
        playClick('tap');
        break;
      case 'dot':
        handleDot();
        playClick('tap');
        break;
      case 'op':
        handleOperator(key.value);
        playClick('tap');
        break;
      case 'clear':
        handleClear();
        playClick('clear');
        break;
      case 'backspace':
        handleBackspace();
        playClick('tap');
        break;
      case 'negate':
        handleNegate();
        playClick('tap');
        break;
      case 'percent':
        handlePercent();
        playClick('tap');
        break;
      case 'paren':
        handleParen(key.value);
        playClick('tap');
        break;
      case 'func':
        handleStandardFunc(key.value);
        playClick('tap');
        break;
      case 'equals':
        handleEquals();
        playClick('equal');
        break;
      case 'tax_add':
        handleTax(true);
        playClick('tap');
        break;
      case 'tax_sub':
        handleTax(false);
        playClick('tap');
        break;
      case 'markup':
        handleMarkup();
        playClick('tap');
        break;
      case 'gt':
        handleGrandTotal();
        playClick('tap');
        break;
      case 'sci_2nd':
        isSecondFn = !isSecondFn;
        renderKeypad();
        playClick('tap');
        break;
      case 'sci_angle':
        isDegreeMode = !isDegreeMode;
        renderKeypad();
        updateDisplay();
        playClick('tap');
        break;
      case 'sci_fn':
        handleSciFunction(key.value);
        playClick('tap');
        break;
      case 'sci_const':
        handleSciConstant(key.value);
        playClick('tap');
        break;
    }
    updateDisplay();
  }

  function handleNumber(val) {
    if (isResultEvaluated) {
      result = val === '00' ? '0' : val;
      expression = '';
      isResultEvaluated = false;
      return;
    }

    if (result === '0') {
      result = val === '00' ? '0' : val;
    } else {
      if (result.length < 16) {
        result += val;
      }
    }
  }

  function handleDot() {
    if (isResultEvaluated) {
      result = '0.';
      expression = '';
      isResultEvaluated = false;
      return;
    }

    if (!result.includes('.')) {
      result += '.';
    }
  }

  function handleOperator(op) {
    if (result === 'Error') handleClear();

    if (isResultEvaluated) {
      expression = result + op;
      result = '0';
      isResultEvaluated = false;
      return;
    }

    // If expression ends with operator and user didn't enter new number yet
    if (result === '0' && expression.length > 0 && isOperator(expression.slice(-1))) {
      expression = expression.slice(0, -1) + op;
      return;
    }

    expression += result + op;
    result = '0';
  }

  function isOperator(c) {
    return ['+', '-', '*', '/', '^'].includes(c);
  }

  function handleClear() {
    expression = '';
    result = '0';
    isResultEvaluated = false;
    grandTotal = 0;
  }

  function handleBackspace() {
    if (isResultEvaluated) {
      expression = '';
      isResultEvaluated = false;
      return;
    }

    if (result.length > 1) {
      result = result.slice(0, -1);
      if (result === '-' || result === '') result = '0';
    } else if (expression && /[+\-*/^*(]/.test(expression.slice(-1))) {
      // Display is a bare 0 but the expression ends with an operator or '(':
      // delete that trailing character instead of doing nothing.
      expression = expression.slice(0, -1);
    } else {
      result = '0';
    }
  }

  function handleNegate() {
    if (result === '0' || result === 'Error') return;
    if (result.startsWith('-')) {
      result = result.slice(1);
    } else {
      result = '-' + result;
    }
  }

  function handlePercent() {
    const val = parseFloat(result);
    if (!isNaN(val)) {
      const res = cleanNumber(val / 100);
      pushHistory(`${val}%`, res);
      result = res;
      isResultEvaluated = true;
    }
  }

  function handleParen(p) {
    if (p === '(') {
      if (result !== '0' && !isResultEvaluated) {
        expression += result + '*(';
      } else {
        expression += '(';
      }
      result = '0';
    } else {
      // Only close a parenthesis when there is actually one open; otherwise a
      // stray ')' (e.g. right after "=") would produce a malformed "4)" and an
      // "Error" display.
      const openCount = (expression.match(/\(/g) || []).length;
      const closeCount = (expression.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        expression += result + ')';
        result = '0';
      }
    }
    isResultEvaluated = false;
  }

  function handleStandardFunc(fn) {
    const val = parseFloat(result);
    if (isNaN(val)) return;

    let res = 0;
    if (fn === 'sqr') res = Math.pow(val, 2);
    else if (fn === 'sqrt') {
      if (val < 0) { result = 'Error'; return; }
      res = Math.sqrt(val);
    } else if (fn === 'inv') {
      if (val === 0) { result = 'Error'; return; }
      res = 1 / val;
    }

    pushHistory(`${fn}(${val})`, cleanNumber(res));
    result = cleanNumber(res);
    isResultEvaluated = true;
  }

  function scientificValue(fn, val, second, degreeMode) {
    const rad = degreeMode ? (val * Math.PI) / 180 : val;

    if (!second) {
      if (fn === 'sin') return Math.sin(rad);
      if (fn === 'cos') return Math.cos(rad);
      if (fn === 'tan') return Math.abs(Math.cos(rad)) < 1e-15 ? NaN : Math.tan(rad);
      if (fn === 'ln') return val > 0 ? Math.log(val) : NaN;
      if (fn === 'log') return val > 0 ? Math.log10(val) : NaN;
      if (fn === 'fact') return val >= 0 && Number.isInteger(val) ? factorial(val) : NaN;
    }

    if (fn === 'sin') {
      if (val < -1 || val > 1) return NaN;
      return degreeMode ? (Math.asin(val) * 180) / Math.PI : Math.asin(val);
    }
    if (fn === 'cos') {
      if (val < -1 || val > 1) return NaN;
      return degreeMode ? (Math.acos(val) * 180) / Math.PI : Math.acos(val);
    }
    if (fn === 'tan') return degreeMode ? (Math.atan(val) * 180) / Math.PI : Math.atan(val);
    if (fn === 'ln') return Math.exp(val);
    if (fn === 'log') return Math.pow(10, val);
    if (fn === 'fact') return val;
    return NaN;
  }

  function handleSciFunction(fn) {
    const val = parseFloat(result);
    if (isNaN(val)) return;

    const res = scientificValue(fn, val, isSecondFn, isDegreeMode);
    if (Number.isNaN(res)) {
      result = 'Error';
      return;
    }

    pushHistory(`${isSecondFn ? 'arc' : ''}${fn}(${val})`, cleanNumber(res));
    result = cleanNumber(res);
    isResultEvaluated = true;
  }

  function factorial(n) {
    if (n > 170) return Infinity;
    let acc = 1;
    for (let i = 2; i <= n; i++) acc *= i;
    return acc;
  }

  function handleSciConstant(c) {
    if (c === 'PI') result = cleanNumber(Math.PI);
    else if (c === 'E') result = cleanNumber(Math.E);
    isResultEvaluated = true;
  }

  // Tax and Markup for Professional mode
  function handleTax(isAdd) {
    const val = parseFloat(result);
    if (isNaN(val)) return;

    const rate = defaultTaxRate / 100;
    let res = 0;
    let desc = '';
    if (isAdd) {
      res = val * (1 + rate);
      desc = `${val} + ${defaultTaxRate}% TAX`;
    } else {
      res = val / (1 + rate);
      desc = `${val} - ${defaultTaxRate}% TAX`;
    }

    pushHistory(desc, cleanNumber(res));
    result = cleanNumber(res);
    isResultEvaluated = true;
  }

  function handleMarkup() {
    const val = parseFloat(result);
    if (isNaN(val) || val === 0) return;
    openProToolModal('margin');
  }

  function handleGrandTotal() {
    result = cleanNumber(grandTotal);
    isResultEvaluated = true;
  }

  function handleEquals() {
    let fullExpr = expression;
    if (!isResultEvaluated) {
      fullExpr += result;
    } else {
      return;
    }

    // Nothing entered (or just a lone 0) → no meaningful calculation to run.
    if (!fullExpr || fullExpr === '0') return;

    try {
      const evalRes = evaluateExpression(fullExpr);
      if (evalRes === null || isNaN(evalRes)) {
        result = 'Error';
      } else {
        const cleanRes = cleanNumber(evalRes);
        pushHistory(fullExpr, cleanRes);
        grandTotal += evalRes;
        result = cleanRes;
        expression = '';
        isResultEvaluated = true;
      }
    } catch (_) {
      result = 'Error';
    }
  }

  function evaluateExpression(raw) {
    if (!/^[0-9eE+\-*/().\s^]+$/.test(raw)) return null;

    // Allow an unfinished expression such as "(2+2" to close automatically.
    const openParens = (raw.match(/\(/g) || []).length;
    const closeParens = (raw.match(/\)/g) || []).length;
    if (closeParens > openParens) return null;
    const input = raw + ')'.repeat(openParens - closeParens);
    let cursor = 0;

    function skipSpaces() {
      while (/\s/.test(input[cursor] || '')) cursor++;
    }

    function parsePrimary() {
      skipSpaces();
      if (input[cursor] === '(') {
        cursor++;
        const value = parseExpression();
        skipSpaces();
        if (input[cursor] !== ')') throw new Error('Expected closing parenthesis');
        cursor++;
        return value;
      }

      const match = input.slice(cursor).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error('Expected a number');
      cursor += match[0].length;
      return Number(match[0]);
    }

    function parsePower() {
      let value = parsePrimary();
      skipSpaces();

      if (input[cursor] === '^') {
        cursor++;
        value = Math.pow(value, parseUnary());
      } else if (input.slice(cursor, cursor + 2) === '**') {
        cursor += 2;
        value = Math.pow(value, parseUnary());
      }
      return value;
    }

    function parseUnary() {
      skipSpaces();
      if (input[cursor] === '+') {
        cursor++;
        return parseUnary();
      }
      if (input[cursor] === '-') {
        cursor++;
        return -parseUnary();
      }
      return parsePower();
    }

    function parseTerm() {
      let value = parseUnary();
      while (true) {
        skipSpaces();
        const operator = input[cursor];
        if (operator !== '*' && operator !== '/') break;
        cursor++;
        const right = parseUnary();
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    }

    function parseExpression() {
      let value = parseTerm();
      while (true) {
        skipSpaces();
        const operator = input[cursor];
        if (operator !== '+' && operator !== '-') break;
        cursor++;
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }

    try {
      const value = parseExpression();
      skipSpaces();
      return cursor === input.length && Number.isFinite(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function cleanNumber(num) {
    if (num === Infinity) return 'Infinity';
    if (num === -Infinity) return '-Infinity';
    if (isNaN(num)) return 'Error';
    // Round to 12 significant digits to fix floating point precision without
    // clobbering very small (1e-13) or very large (1e20+) results.
    return String(Number(num.toPrecision(12)));
  }

  // Memory Operations
  function memoryClear() {
    memoryValue = 0;
    updateDisplay();
    playClick('clear');
  }

  function memoryRecall() {
    result = cleanNumber(memoryValue);
    isResultEvaluated = true;
    updateDisplay();
    playClick('tap');
  }

  function memoryAdd() {
    const val = parseFloat(result);
    if (!isNaN(val)) {
      memoryValue += val;
      updateDisplay();
      playClick('tap');
    }
  }

  function memorySubtract() {
    const val = parseFloat(result);
    if (!isNaN(val)) {
      memoryValue -= val;
      updateDisplay();
      playClick('tap');
    }
  }

  function memoryStore() {
    const val = parseFloat(result);
    if (!isNaN(val)) {
      memoryValue = val;
      updateDisplay();
      playClick('tap');
    }
  }

  // Render Mode Toolbars & Keypads
  function renderQuickToolbar() {
    quickToolbarEl.innerHTML = '';

    if (currentMode === 'basic') {
      quickToolbarEl.style.display = 'none';
      return;
    }

    quickToolbarEl.style.display = 'flex';

    if (currentMode === 'standard') {
      const memKeys = [
        { label: 'MC', action: memoryClear },
        { label: 'MR', action: memoryRecall },
        { label: 'M+', action: memoryAdd },
        { label: 'M−', action: memorySubtract },
        { label: 'MS', action: memoryStore }
      ];
      memKeys.forEach(k => {
        const btn = document.createElement('button');
        btn.className = 'm3-quick-btn';
        btn.textContent = k.label;
        btn.onclick = k.action;
        quickToolbarEl.appendChild(btn);
      });
    } else if (currentMode === 'professional') {
      const tools = [
        { label: 'Margin & Markup', tool: 'margin' },
        { label: 'Discount Calc', tool: 'discount' },
        { label: 'Loan / EMI', tool: 'loan' },
        { label: 'Tax Rate: ' + defaultTaxRate + '%', tool: 'tax' }
      ];
      tools.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'm3-quick-btn accent-chip';
        btn.textContent = t.label;
        btn.onclick = () => openProToolModal(t.tool);
        quickToolbarEl.appendChild(btn);
      });
    } else if (currentMode === 'scientific') {
      const btnAngle = document.createElement('button');
      btnAngle.className = 'm3-quick-btn accent-chip';
      btnAngle.textContent = isDegreeMode ? 'Mode: DEG' : 'Mode: RAD';
      btnAngle.onclick = () => {
        isDegreeMode = !isDegreeMode;
        renderQuickToolbar();
        updateDisplay();
        playClick('tap');
      };

      const btnAns = document.createElement('button');
      btnAns.className = 'm3-quick-btn';
      btnAns.textContent = 'Ans';
      btnAns.onclick = () => {
        if (calculationHistory.length > 0) {
          result = calculationHistory[0].val;
          isResultEvaluated = true;
          updateDisplay();
          playClick('tap');
        }
      };

      const btnRand = document.createElement('button');
      btnRand.className = 'm3-quick-btn';
      btnRand.textContent = 'RAND';
      btnRand.onclick = () => {
        result = cleanNumber(Math.random());
        isResultEvaluated = true;
        updateDisplay();
        playClick('tap');
      };

      quickToolbarEl.appendChild(btnAngle);
      quickToolbarEl.appendChild(btnAns);
      quickToolbarEl.appendChild(btnRand);

      const btnChecks = document.createElement('button');
      btnChecks.className = 'm3-quick-btn accent-chip';
      btnChecks.textContent = 'Run checks';
      btnChecks.onclick = runScientificChecks;
      quickToolbarEl.appendChild(btnChecks);
    }
  }

  function renderKeypad() {
    keypadEl.innerHTML = '';
    keypadEl.className = `m3-keypad-grid ${currentMode}-layout`;

    const keys = layouts[currentMode] || layouts.basic;

    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.className = `m3-key ${k.type || ''} ${k.wide ? 'key-wide-' + k.wide : ''}`;
      
      let label = k.label;
      if (currentMode === 'scientific' && isSecondFn) {
        if (k.value === 'sin') label = 'sin⁻¹';
        else if (k.value === 'cos') label = 'cos⁻¹';
        else if (k.value === 'tan') label = 'tan⁻¹';
        else if (k.value === 'ln') label = 'eˣ';
        else if (k.value === 'log') label = '10ˣ';
      }
      if (k.action === 'sci_angle') {
        label = isDegreeMode ? 'DEG' : 'RAD';
      }
      if (k.action === 'sci_2nd') {
        if (isSecondFn) btn.style.backgroundColor = 'var(--md-primary-container)';
      }

      btn.textContent = label;
      btn.addEventListener('click', () => handleKeyAction(k));
      keypadEl.appendChild(btn);
    });

    renderQuickToolbar();
  }

  // History Operations
  function pushHistory(expr, val) {
    const createdAt = Date.now();
    historySeq += 1;
    calculationHistory.unshift({
      id: historySeq,
      createdAt,
      expr,
      val,
      time: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (calculationHistory.length > 50) calculationHistory.pop();
    renderHistoryLists();
  }

  function renderHistoryLists() {
    const query = historyQuery.trim().toLowerCase();
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const visibleHistory = calculationHistory.filter(item => {
      const timestamp = Number(item.createdAt || item.id);
      const inDateRange = historyDateFilter === 'today'
        ? Number.isFinite(timestamp) && timestamp >= todayStart.getTime() && timestamp <= now
        : historyDateFilter === '7d'
          ? Number.isFinite(timestamp) && timestamp >= now - 7 * 24 * 60 * 60 * 1000 && timestamp <= now
          : historyDateFilter === '30d'
            ? Number.isFinite(timestamp) && timestamp >= now - 30 * 24 * 60 * 60 * 1000 && timestamp <= now
            : true;
      const searchDate = Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString() : '';
      const matchesQuery = !query || [item.expr, item.val, item.time, searchDate]
        .some(value => String(value || '').toLowerCase().includes(query));
      return inDateRange && matchesQuery;
    });

    const listHtml = visibleHistory.length === 0
      ? calculationHistory.length === 0
        ? '<div class="th-empty m3-empty-state"><p>Calculations appear here as you work.</p></div>'
        : '<div class="th-empty m3-empty-state"><p>No matching calculations. Try another search.</p></div>'
      : visibleHistory.map(item => `
          <div class="m3-history-item" data-val="${item.val}" data-id="${item.id}">
            <div class="m3-history-expr">${escapeHtml(item.expr)}</div>
            <div class="m3-history-time">${escapeHtml(item.time || '')}</div>
            <div class="m3-history-val">= ${formatNumberDisplay(item.val)}</div>
            <div class="m3-history-actions">
              <button class="m3-history-btn btn-reuse" data-val="${item.val}">Use result</button>
              <button class="m3-history-btn btn-copy" data-val="${item.val}">Copy</button>
              <button class="m3-history-btn btn-remove" data-id="${item.id}">Remove</button>
            </div>
          </div>
        `).join('');

    sheetHistoryList.innerHTML = listHtml;
    desktopHistoryList.innerHTML = listHtml;

    if (calculationHistory.length > 0) {
      historyBadge.style.display = 'block';
    } else {
      historyBadge.style.display = 'none';
    }

    // Attach listeners
    [sheetHistoryList, desktopHistoryList].forEach(container => {
      container.querySelectorAll('.btn-reuse').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          result = btn.dataset.val;
          isResultEvaluated = true;
          updateDisplay();
          playClick('tap');
          if (sheetHistory.open) closeSheet(sheetHistory);
        };
      });

      container.querySelectorAll('.btn-copy').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          btn.disabled = true;
          btn.textContent = 'Copying…';

          try {
            let copied = false;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              try {
                await navigator.clipboard.writeText(btn.dataset.val);
                copied = true;
              } catch (_) {}
            }

            if (!copied) {
              const fallback = document.createElement('textarea');
              fallback.value = btn.dataset.val;
              fallback.setAttribute('readonly', '');
              fallback.style.position = 'fixed';
              fallback.style.opacity = '0';
              document.body.appendChild(fallback);
              fallback.select();
              copied = document.execCommand('copy');
              fallback.remove();
            }

            if (!copied) throw new Error('Copy failed');
            btn.textContent = 'Copied';
          } catch (_) {
            btn.textContent = 'Try again';
          }

          btn.disabled = false;
          setTimeout(() => {
            if (btn.isConnected) btn.textContent = 'Copy';
          }, 1500);
        };
      });

      container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const index = calculationHistory.findIndex(item => String(item.id) === btn.dataset.id);
          if (index < 0) return;
          const removedItem = calculationHistory.splice(index, 1)[0];
          renderHistoryLists();
          showUndoToast(removedItem, index);
          playClick('clear');
        };
      });

      container.querySelectorAll('.m3-history-item').forEach(card => {
        card.onclick = () => {
          result = card.dataset.val;
          isResultEvaluated = true;
          updateDisplay();
          playClick('tap');
          if (sheetHistory.open) closeSheet(sheetHistory);
        };
      });
    });

    persistState();
  }

  function clearHistory() {
    calculationHistory = [];
    renderHistoryLists();
    playClick('clear');
  }

  function showUndoToast(item, index) {
    hideUndoToast();

    const toast = document.createElement('div');
    toast.className = 'm3-undo-toast';
    toast.setAttribute('role', 'status');

    const message = document.createElement('span');
    message.textContent = 'Calculation removed';

    const undoButton = document.createElement('button');
    undoButton.type = 'button';
    undoButton.className = 'm3-undo-button';
    undoButton.textContent = 'Undo';
    undoButton.addEventListener('click', () => {
      calculationHistory.splice(Math.min(index, calculationHistory.length), 0, item);
      if (calculationHistory.length > 50) calculationHistory.pop();
      renderHistoryLists();
      hideUndoToast();
    });

    toast.append(message, undoButton);
    document.body.appendChild(toast);
    undoToastEl = toast;
    undoHistoryTimer = setTimeout(hideUndoToast, 5000);
  }

  function hideUndoToast() {
    if (undoHistoryTimer) {
      clearTimeout(undoHistoryTimer);
      undoHistoryTimer = null;
    }
    if (undoToastEl) {
      undoToastEl.remove();
      undoToastEl = null;
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Run repeatable checks through the same scientific functions used by the keypad.
  function runScientificChecks() {
    const checks = [
      { name: '2 + 2', actual: evaluateExpression('2+2'), expected: 4 },
      { name: '2 × 3 + 4', actual: evaluateExpression('2*3+4'), expected: 10 },
      { name: 'Parentheses', actual: evaluateExpression('(2+3)*4'), expected: 20 },
      { name: 'Unclosed parenthesis closes automatically', actual: evaluateExpression('(2+3'), expected: 5 },
      { name: '2 to the power of 3', actual: evaluateExpression('2^3'), expected: 8 },
      { name: 'Chained powers', actual: evaluateExpression('2^3^2'), expected: 512 },
      { name: 'Negative exponent', actual: evaluateExpression('2^-3'), expected: 0.125 },
      { name: 'Negative number raised to a power', actual: evaluateExpression('(-2)^2'), expected: 4 },
      { name: 'Unary minus before a power', actual: evaluateExpression('-2^2'), expected: -4 },
      { name: 'Decimal arithmetic', actual: evaluateExpression('0.1+0.2'), expected: 0.3 },
      { name: 'Leading decimal values', actual: evaluateExpression('.5+.25'), expected: 0.75 },
      { name: 'Scientific notation', actual: evaluateExpression('1e3+2'), expected: 1002 },
      { name: 'Division by zero is rejected', actual: evaluateExpression('2/0'), expectNull: true },
      { name: 'Extra closing parenthesis is rejected', actual: evaluateExpression('2)'), expectNull: true },
      { name: 'Malformed decimal is rejected', actual: evaluateExpression('1..2'), expectNull: true },
      { name: 'sin(30°)', actual: scientificValue('sin', 30, false, true), expected: 0.5 },
      { name: 'cos(60°)', actual: scientificValue('cos', 60, false, true), expected: 0.5 },
      { name: 'tan(45°)', actual: scientificValue('tan', 45, false, true), expected: 1 },
      { name: 'sin⁻¹(0.5) in degrees', actual: scientificValue('sin', 0.5, true, true), expected: 30 },
      { name: 'cos⁻¹(0.5) in degrees', actual: scientificValue('cos', 0.5, true, true), expected: 60 },
      { name: 'tan⁻¹(1) in degrees', actual: scientificValue('tan', 1, true, true), expected: 45 },
      { name: 'sin(π ÷ 2 radians)', actual: scientificValue('sin', Math.PI / 2, false, false), expected: 1 },
      { name: 'cos(π radians)', actual: scientificValue('cos', Math.PI, false, false), expected: -1 },
      { name: 'tan(0 radians)', actual: scientificValue('tan', 0, false, false), expected: 0 },
      { name: 'sin⁻¹(0.5) in radians', actual: scientificValue('sin', 0.5, true, false), expected: Math.PI / 6 },
      { name: 'cos⁻¹(0.5) in radians', actual: scientificValue('cos', 0.5, true, false), expected: Math.PI / 3 },
      { name: 'tan⁻¹(1) in radians', actual: scientificValue('tan', 1, true, false), expected: Math.PI / 4 },
      { name: 'ln(e)', actual: scientificValue('ln', Math.E, false, true), expected: 1 },
      { name: 'e to the power of 1', actual: scientificValue('ln', 1, true, true), expected: Math.E },
      { name: 'log(100)', actual: scientificValue('log', 100, false, true), expected: 2 },
      { name: '10 to the power of 2', actual: scientificValue('log', 2, true, true), expected: 100 },
      { name: '5 factorial', actual: scientificValue('fact', 5, false, true), expected: 120 },
      { name: '0 factorial', actual: scientificValue('fact', 0, false, true), expected: 1 },
      { name: '170 factorial stays finite', actual: scientificValue('fact', 170, false, true), expected: factorial(170) },
      { name: '171 factorial overflows', actual: scientificValue('fact', 171, false, true), expectInfinity: true },
      { name: 'ln(0) is invalid', actual: scientificValue('ln', 0, false, true), expectNaN: true },
      { name: 'ln(-1) is invalid', actual: scientificValue('ln', -1, false, true), expectNaN: true },
      { name: 'log(0) is invalid', actual: scientificValue('log', 0, false, true), expectNaN: true },
      { name: 'sin⁻¹(2) is invalid', actual: scientificValue('sin', 2, true, true), expectNaN: true },
      { name: 'cos⁻¹(-2) is invalid', actual: scientificValue('cos', -2, true, true), expectNaN: true },
      { name: 'Negative factorial is invalid', actual: scientificValue('fact', -1, false, true), expectNaN: true },
      { name: '3.5 factorial is invalid', actual: scientificValue('fact', 3.5, false, true), expectNaN: true },
      { name: 'tan(90°) is invalid', actual: scientificValue('tan', 90, false, true), expectNaN: true },
      { name: 'e to the power of 1000 overflows', actual: scientificValue('ln', 1000, true, true), expectInfinity: true }
    ];

    function checkPassed(test) {
      if (test.expectNaN) return Number.isNaN(test.actual);
      if (test.expectNull) return test.actual === null;
      if (test.expectInfinity) return test.actual === Infinity;
      return test.actual !== null && Number.isFinite(test.actual) &&
        Math.abs(test.actual - test.expected) < 1e-9;
    }

    const passed = checks.filter(checkPassed).length;

    document.getElementById('pro-tool-title').textContent = 'Scientific calculation checks';
    document.getElementById('pro-tool-content').innerHTML = `
      <div class="m3-pro-form">
        <p>${passed} of ${checks.length} checks passed.</p>
        <div class="m3-pro-calc-result">
          ${checks.map(test => {
            const ok = checkPassed(test);
            return `<div class="m3-pro-calc-row">
              <span>${escapeHtml(test.name)}</span>
              <strong>${ok ? 'Pass' : 'Check'}${ok ? '' : ` · Got ${escapeHtml(String(test.actual))}`}</strong>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
    openModal(modalProTool);
  }

  // Professional Dialog Tools (Margin, Discount, Loan)
  function openProToolModal(type) {
    const modalContent = document.getElementById('pro-tool-content');
    const modalTitle = document.getElementById('pro-tool-title');

    if (type === 'margin') {
      modalTitle.textContent = 'Cost, Price & Profit Margin';
      modalContent.innerHTML = `
        <div class="m3-pro-form">
          <div class="m3-form-field">
            <label>Cost</label>
            <input type="number" id="pro-cost" class="th-input" placeholder="e.g. 100" value="${parseFloat(result) || 100}">
          </div>
          <div class="m3-form-field">
            <label>Profit Margin (%)</label>
            <input type="number" id="pro-margin" class="th-input" placeholder="e.g. 25" value="25">
          </div>
          <div class="m3-pro-calc-result" id="pro-margin-output">
            <div class="m3-pro-calc-row"><span>Gross Profit</span><strong id="margin-profit">$33.33</strong></div>
            <div class="m3-pro-calc-row"><span>Markup</span><strong id="margin-markup">33.3%</strong></div>
            <div class="m3-pro-calc-row highlight"><span>Selling Price</span><strong id="margin-selling">$133.33</strong></div>
          </div>
          <button id="btn-apply-margin" class="th-btn th-btn-primary th-btn-block">Paste to Calculator</button>
        </div>
      `;

      function computeMargin() {
        const cost = parseFloat(document.getElementById('pro-cost').value) || 0;
        const margin = parseFloat(document.getElementById('pro-margin').value) || 0;
        if (margin >= 100) return;
        const selling = cost / (1 - margin / 100);
        const profit = selling - cost;
        const markup = cost > 0 ? (profit / cost) * 100 : 0;

        document.getElementById('margin-profit').textContent = '$' + cleanNumber(profit);
        document.getElementById('margin-markup').textContent = cleanNumber(markup) + '%';
        document.getElementById('margin-selling').textContent = '$' + cleanNumber(selling);
      }

      document.getElementById('pro-cost').oninput = computeMargin;
      document.getElementById('pro-margin').oninput = computeMargin;
      computeMargin();

      document.getElementById('btn-apply-margin').onclick = () => {
        const sellingText = document.getElementById('margin-selling').textContent.replace('$', '');
        result = sellingText;
        isResultEvaluated = true;
        updateDisplay();
        closeModal(modalProTool);
      };
    } else if (type === 'discount') {
      modalTitle.textContent = 'Discount & Savings';
      modalContent.innerHTML = `
        <div class="m3-pro-form">
          <div class="m3-form-field">
            <label>Original Price</label>
            <input type="number" id="pro-disc-price" class="th-input" placeholder="e.g. 80" value="${parseFloat(result) || 80}">
          </div>
          <div class="m3-form-field">
            <label>Discount Rate (%)</label>
            <input type="number" id="pro-disc-rate" class="th-input" placeholder="e.g. 20" value="20">
          </div>
          <div class="m3-pro-calc-result">
            <div class="m3-pro-calc-row"><span>You Save</span><strong id="disc-saved">$16.00</strong></div>
            <div class="m3-pro-calc-row highlight"><span>Final Price</span><strong id="disc-final">$64.00</strong></div>
          </div>
          <button id="btn-apply-discount" class="th-btn th-btn-primary th-btn-block">Paste to Calculator</button>
        </div>
      `;

      function computeDiscount() {
        const price = parseFloat(document.getElementById('pro-disc-price').value) || 0;
        const rate = parseFloat(document.getElementById('pro-disc-rate').value) || 0;
        const saved = price * (rate / 100);
        const finalP = price - saved;
        document.getElementById('disc-saved').textContent = '$' + cleanNumber(saved);
        document.getElementById('disc-final').textContent = '$' + cleanNumber(finalP);
      }

      document.getElementById('pro-disc-price').oninput = computeDiscount;
      document.getElementById('pro-disc-rate').oninput = computeDiscount;
      computeDiscount();

      document.getElementById('btn-apply-discount').onclick = () => {
        const finalVal = document.getElementById('disc-final').textContent.replace('$', '');
        result = finalVal;
        isResultEvaluated = true;
        updateDisplay();
        closeModal(modalProTool);
      };
    } else if (type === 'loan') {
      modalTitle.textContent = 'Loan / EMI Calculator';
      modalContent.innerHTML = `
        <div class="m3-pro-form">
          <div class="m3-form-field">
            <label>Principal Amount</label>
            <input type="number" id="loan-p" class="th-input" value="${parseFloat(result) || 10000}">
          </div>
          <div class="m3-form-field">
            <label>Annual Interest Rate (%)</label>
            <input type="number" id="loan-r" class="th-input" value="6.5">
          </div>
          <div class="m3-form-field">
            <label>Term (Years)</label>
            <input type="number" id="loan-t" class="th-input" value="3">
          </div>
          <div class="m3-pro-calc-result">
            <div class="m3-pro-calc-row"><span>Total Interest</span><strong id="loan-interest">$1,036</strong></div>
            <div class="m3-pro-calc-row"><span>Total Payment</span><strong id="loan-total">$11,036</strong></div>
            <div class="m3-pro-calc-row highlight"><span>Monthly EMI</span><strong id="loan-emi">$306.56</strong></div>
          </div>
          <button id="btn-apply-loan" class="th-btn th-btn-primary th-btn-block">Paste EMI to Calculator</button>
        </div>
      `;

      function computeLoan() {
        const p = parseFloat(document.getElementById('loan-p').value) || 0;
        const annualRate = (parseFloat(document.getElementById('loan-r').value) || 0) / 100;
        const years = parseFloat(document.getElementById('loan-t').value) || 1;
        const months = years * 12;
        const monthlyRate = annualRate / 12;

        let emi = 0;
        if (monthlyRate === 0) {
          emi = p / months;
        } else {
          emi = (p * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        }

        const totalPay = emi * months;
        const totalInt = totalPay - p;

        document.getElementById('loan-emi').textContent = '$' + cleanNumber(emi);
        document.getElementById('loan-interest').textContent = '$' + cleanNumber(totalInt);
        document.getElementById('loan-total').textContent = '$' + cleanNumber(totalPay);
      }

      document.getElementById('loan-p').oninput = computeLoan;
      document.getElementById('loan-r').oninput = computeLoan;
      document.getElementById('loan-t').oninput = computeLoan;
      computeLoan();

      document.getElementById('btn-apply-loan').onclick = () => {
        const emiVal = document.getElementById('loan-emi').textContent.replace('$', '');
        result = emiVal;
        isResultEvaluated = true;
        updateDisplay();
        closeModal(modalProTool);
      };
    } else if (type === 'tax') {
      openSheet(sheetSettings);
      return;
    }

    openModal(modalProTool);
  }

  // Dialog and Sheet Management with th.back
  let activeBackHandles = [];

  function openSheet(dialogEl) {
    if (typeof dialogEl.showModal === 'function') {
      dialogEl.showModal();
    }
    if (window.th && window.th.back) {
      const handle = window.th.back.push(() => {
        closeSheet(dialogEl, false);
      });
      activeBackHandles.push({ dialog: dialogEl, handle });
    }
  }

  function closeSheet(dialogEl, popBack = true) {
    if (dialogEl.open) {
      dialogEl.close();
    }
    if (popBack) {
      const idx = activeBackHandles.findIndex(item => item.dialog === dialogEl);
      if (idx !== -1) {
        if (activeBackHandles[idx].handle && activeBackHandles[idx].handle.close) {
          activeBackHandles[idx].handle.close();
        }
        activeBackHandles.splice(idx, 1);
      }
    }
  }

  function openModal(modalEl) {
    openSheet(modalEl);
  }

  function closeModal(modalEl) {
    closeSheet(modalEl);
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // If inside a text input, select or textarea, don't hijack
    const targetTag = e.target && e.target.tagName;
    if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      btnCopyResult.click();
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      handleNumber(e.key);
      playClick('tap');
    } else if (e.key === '.') {
      handleDot();
      playClick('tap');
    } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
      handleOperator(e.key);
      playClick('tap');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      handleEquals();
      playClick('equal');
    } else if (e.key === 'Backspace') {
      handleBackspace();
      playClick('tap');
    } else if (e.key === 'Escape') {
      handleClear();
      playClick('clear');
    } else if (e.key === '(' || e.key === ')') {
      handleParen(e.key);
      playClick('tap');
    } else if (e.key === '%') {
      handlePercent();
      playClick('tap');
    }
    updateDisplay();
  });

  // Mode Selection
  function switchMode(newMode) {
    currentMode = newMode;
    modePills.forEach(pill => {
      pill.classList.toggle('is-active', pill.dataset.mode === newMode);
    });
    renderKeypad();
    updateDisplay();
    playClick('tap');
  }

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      switchMode(pill.dataset.mode);
    });
  });

  // Settings & Theme Handlers
  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    document.querySelectorAll('.m3-theme-btn').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.themeChoice === theme);
    });
    persistState();
  }

  function applyPalette(palette) {
    currentPalette = palette;
    document.documentElement.setAttribute('data-palette', palette);

    document.querySelectorAll('.m3-palette-chip').forEach(chip => {
      chip.classList.toggle('is-selected', chip.dataset.palette === palette);
    });
    persistState();
  }

  // Setup Event Listeners
  document.getElementById('btn-open-history').addEventListener('click', () => {
    openSheet(sheetHistory);
  });
  document.getElementById('btn-close-history').addEventListener('click', () => {
    closeSheet(sheetHistory);
  });
  document.getElementById('btn-sheet-clear-hist').addEventListener('click', clearHistory);
  document.getElementById('btn-desktop-clear-hist').addEventListener('click', clearHistory);

  [sheetHistorySearch, desktopHistorySearch].forEach(input => {
    input.addEventListener('input', () => {
      historyQuery = input.value;
      [sheetHistorySearch, desktopHistorySearch].forEach(search => {
        if (search !== input) search.value = historyQuery;
      });
      renderHistoryLists();
    });
  });

  [sheetHistoryDateFilter, desktopHistoryDateFilter].forEach(select => {
    select.addEventListener('change', async () => {
      historyDateFilter = select.value;
      [sheetHistoryDateFilter, desktopHistoryDateFilter].forEach(otherSelect => {
        otherSelect.value = historyDateFilter;
      });
      renderHistoryLists();
      if (window.th && window.th.session) {
        try {
          await window.th.session.set('quadrant_calc_history_filter_v1', historyDateFilter);
        } catch (_) {}
      }
    });
  });

  document.getElementById('btn-open-settings').addEventListener('click', () => {
    openSheet(sheetSettings);
  });
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    closeSheet(sheetSettings);
  });
  document.getElementById('btn-close-pro-modal').addEventListener('click', () => {
    closeModal(modalProTool);
  });

  // Restore the default modal title whenever the dialog closes (close button,
  // backdrop click, or Escape) so "Scientific calculation checks" from
  // runScientificChecks doesn't leak into the next tool.
  modalProTool.addEventListener('close', () => {
    document.getElementById('pro-tool-title').textContent = 'Business Calculator';
  });

  // Sound toggle button on top bar
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  btnSoundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateSoundUI();
    persistState();
  });

  let copyResultResetTimer = null;
  btnCopyResult.addEventListener('click', async () => {
    const label = btnCopyResult.querySelector('span');
    const textToCopy = result;
    clearTimeout(copyResultResetTimer);
    btnCopyResult.disabled = true;
    label.textContent = 'Copying…';

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch (_) {
          const fallback = document.createElement('textarea');
          fallback.value = textToCopy;
          fallback.setAttribute('readonly', '');
          fallback.style.position = 'fixed';
          fallback.style.opacity = '0';
          document.body.appendChild(fallback);
          fallback.select();
          const copied = document.execCommand('copy');
          fallback.remove();
          if (!copied) throw new Error('Copy failed');
        }
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = textToCopy;
        fallback.setAttribute('readonly', '');
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        const copied = document.execCommand('copy');
        fallback.remove();
        if (!copied) throw new Error('Copy failed');
      }
      label.textContent = 'Copied';
    } catch (_) {
      label.textContent = 'Try again';
    }

    btnCopyResult.disabled = false;
    copyResultResetTimer = setTimeout(() => {
      label.textContent = 'Copy';
    }, 1600);
  });

  settingSoundToggle.addEventListener('change', () => {
    soundEnabled = settingSoundToggle.checked;
    updateSoundUI();
    persistState();
  });

  function updateSoundUI() {
    settingSoundToggle.checked = soundEnabled;
    soundIcon.setAttribute('data-icon', soundEnabled ? 'volume-2' : 'volume-x');
    if (window.icon) {
      // Replace the contents of the existing element instead of swapping it out,
      // so the cached reference stays attached to the live DOM node.
      soundIcon.innerHTML = window.icon(soundEnabled ? 'volume-2' : 'volume-x');
    }
  }

  // Palette and Theme listeners
  document.querySelectorAll('.m3-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
  });

  document.querySelectorAll('.m3-palette-chip').forEach(chip => {
    chip.addEventListener('click', () => applyPalette(chip.dataset.palette));
  });

  document.getElementById('btn-save-tax-rate').addEventListener('click', () => {
    const val = parseFloat(settingTaxRateInput.value);
    if (!isNaN(val) && val >= 0) {
      defaultTaxRate = val;
      renderQuickToolbar();
      closeSheet(sheetSettings);
      if (window.fx && window.fx.toast) window.fx.toast('Tax rate updated');
    }
  });

  // State Persistence (th.session & th.storage)
  async function persistState() {
    const stateObj = {
      currentMode,
      expression,
      result,
      isResultEvaluated,
      memoryValue,
      isDegreeMode,
      soundEnabled,
      defaultTaxRate,
      calculationHistory: calculationHistory.slice(0, 30),
      historyQuery,
      currentPalette,
      currentTheme
    };

    if (window.th && window.th.session) {
      try {
        await window.th.session.set('quadrant_calc_state_v1', stateObj);
      } catch (_) {}
    }
  }

  async function restoreState() {
    if (window.th && window.th.session) {
      try {
        const savedFilter = await window.th.session.get('quadrant_calc_history_filter_v1');
        if (['all', 'today', '7d', '30d'].includes(savedFilter)) historyDateFilter = savedFilter;
      } catch (_) {}
      try {
        const saved = await window.th.session.get('quadrant_calc_state_v1');
        if (saved) {
          if (saved.currentMode) currentMode = saved.currentMode;
          if (saved.expression !== undefined) expression = saved.expression;
          if (saved.result !== undefined) result = saved.result;
          if (saved.isResultEvaluated !== undefined) isResultEvaluated = saved.isResultEvaluated;
          if (saved.memoryValue !== undefined) memoryValue = saved.memoryValue;
          if (saved.isDegreeMode !== undefined) isDegreeMode = saved.isDegreeMode;
          if (saved.soundEnabled !== undefined) soundEnabled = saved.soundEnabled;
          if (saved.defaultTaxRate !== undefined) defaultTaxRate = saved.defaultTaxRate;
          if (Array.isArray(saved.calculationHistory)) calculationHistory = saved.calculationHistory;
          historySeq = calculationHistory.reduce((max, item) => {
            const n = Number(item.id);
            return Number.isFinite(n) && n > max ? n : max;
          }, 0);
          if (typeof saved.historyQuery === 'string') historyQuery = saved.historyQuery;
          if (saved.currentPalette) currentPalette = saved.currentPalette;
          if (saved.currentTheme) currentTheme = saved.currentTheme;
        }
      } catch (_) {}
    }

    sheetHistorySearch.value = historyQuery;
    desktopHistorySearch.value = historyQuery;
    sheetHistoryDateFilter.value = historyDateFilter;
    desktopHistoryDateFilter.value = historyDateFilter;
    applyTheme(currentTheme);
    applyPalette(currentPalette);
    updateSoundUI();
    settingTaxRateInput.value = defaultTaxRate;

    modePills.forEach(pill => {
      pill.classList.toggle('is-active', pill.dataset.mode === currentMode);
    });

    renderKeypad();
    renderHistoryLists();
    updateDisplay();
  }

  // Initialize
  async function init() {
    if (window.th && window.th.ready) {
      try {
        await window.th.ready();
      } catch (_) {}
    }
    await restoreState();
  }

  init();
})();