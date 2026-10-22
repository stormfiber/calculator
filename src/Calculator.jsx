import { useState, useEffect, useCallback, useRef } from 'react';

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

const STORAGE_KEYS = {
  history: 'calcPro_history',
  settings: 'calcPro_settings'
};

const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  history: true
};

/**
 * localStorage can throw (private mode, disabled storage, quota). Every access
 * is guarded so that the calculator keeps working.
 */
const safeLocalStorage = {
  getItem(key) {
    try {
      return typeof Storage !== 'undefined' && localStorage ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silently fail if localStorage is not available
    }
  }
};

/* -------------------------------------------------------------------------- */
/* Expression evaluation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The calculator evaluates the expression that is shown in the display. The
 * expression is parsed and evaluated by the small recursive descent parser
 * below - using `eval()` or the `Function` constructor would allow arbitrary
 * code execution inside the WebView.
 */
const EXPRESSION_FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: (value) => Math.log10(value),
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs
};

const EXPRESSION_CONSTANTS = {
  pi: Math.PI,
  'π': Math.PI,
  e: Math.E
};

const OPERATOR_SYMBOLS = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  '**': '^'
};

class ExpressionError extends Error {}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new ExpressionError('Invalid factorial');
  }

  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function tokenize(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === ' ') {
      index += 1;
      continue;
    }

    // numbers
    if ((char >= '0' && char <= '9') || (char === '.' && /[0-9]/.test(input[index + 1] || ''))) {
      let end = index;
      while (end < input.length && /[0-9.]/.test(input[end])) {
        end += 1;
      }
      const value = Number.parseFloat(input.slice(index, end));
      if (Number.isNaN(value)) {
        throw new ExpressionError('Invalid number');
      }
      tokens.push({ type: 'number', value });
      index = end;
      continue;
    }

    // identifiers (functions and constants)
    if (/[a-zA-Zπ]/.test(char)) {
      let end = index;
      while (end < input.length && /[a-zA-Zπ]/.test(input[end])) {
        end += 1;
      }
      tokens.push({ type: 'identifier', value: input.slice(index, end).toLowerCase() });
      index = end;
      continue;
    }

    // operators
    if ('+-*/^()!%'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    throw new ExpressionError(`Unexpected character "${char}"`);
  }

  return tokens;
}

/**
 * Evaluates a mathematical expression such as "2π", "sin(45)" or "3^2+1".
 *
 * Supported: numbers, + - * / ^, unary +/-, parentheses, implicit
 * multiplication, the constants π and e, the functions sin, cos, tan, log,
 * ln, sqrt and abs as well as the postfix factorial operator.
 */
function evaluateExpression(input) {
  const tokens = tokenize(input);
  let position = 0;

  const peek = () => tokens[position];
  const consume = () => tokens[position++];

  const parseExpression = () => {
    let left = parseTerm();

    for (;;) {
      const token = peek();
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
        return left;
      }
      consume();
      const right = parseTerm();
      left = token.value === '+' ? left + right : left - right;
    }
  };

  const parseTerm = () => {
    let left = parseFactor();

    for (;;) {
      const token = peek();
      if (!token) {
        return left;
      }

      if (token.type === 'operator' && (token.value === '*' || token.value === '/')) {
        consume();
        const right = parseFactor();
        left = token.value === '*' ? left * right : left / right;
        continue;
      }

      // implicit multiplication, for example 2π, 3(4+5) or 2e
      const startsValue =
        token.type === 'number' ||
        token.type === 'identifier' ||
        (token.type === 'operator' && token.value === '(');

      if (!startsValue) {
        return left;
      }

      left *= parseFactor();
    }
  };

  const parseFactor = () => {
    const token = peek();

    if (token && token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      consume();
      const value = parseFactor();
      return token.value === '-' ? -value : value;
    }

    return parsePower();
  };

  const parsePower = () => {
    const base = parsePostfix();
    const token = peek();

    if (token && token.type === 'operator' && token.value === '^') {
      consume();
      return Math.pow(base, parseFactor());
    }

    return base;
  };

  const parsePostfix = () => {
    let value = parsePrimary();

    while (peek() && peek().type === 'operator' && peek().value === '!') {
      consume();
      value = factorial(value);
    }

    return value;
  };

  const parsePrimary = () => {
    const token = consume();

    if (!token) {
      throw new ExpressionError('Unexpected end of expression');
    }

    if (token.type === 'number') {
      return token.value;
    }

    if (token.type === 'identifier') {
      if (Object.prototype.hasOwnProperty.call(EXPRESSION_CONSTANTS, token.value)) {
        return EXPRESSION_CONSTANTS[token.value];
      }

      if (Object.prototype.hasOwnProperty.call(EXPRESSION_FUNCTIONS, token.value)) {
        const open = peek();
        if (!open || open.type !== 'operator' || open.value !== '(') {
          throw new ExpressionError(`"${token.value}" needs brackets`);
        }
        consume();

        const argument = parseExpression();

        const close = peek();
        if (!close || close.type !== 'operator' || close.value !== ')') {
          throw new ExpressionError('Missing closing bracket');
        }
        consume();

        return EXPRESSION_FUNCTIONS[token.value](argument);
      }

      throw new ExpressionError(`Unknown name "${token.value}"`);
    }

    if (token.type === 'operator' && token.value === '(') {
      const value = parseExpression();

      const close = peek();
      if (!close || close.type !== 'operator' || close.value !== ')') {
        throw new ExpressionError('Missing closing bracket');
      }
      consume();

      return value;
    }

    throw new ExpressionError(`Unexpected "${token.value}"`);
  };

  const result = parseExpression();

  if (position !== tokens.length) {
    throw new ExpressionError('Unexpected token');
  }

  if (!Number.isFinite(result)) {
    throw new ExpressionError('Invalid calculation');
  }

  return result;
}

/**
 * Reads the stored history. Returns an empty list when nothing is stored or
 * when the stored value is corrupted.
 */
function loadStoredHistory() {
  const stored = safeLocalStorage.getItem(STORAGE_KEYS.history);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Reads the stored settings and merges them with the defaults.
 */
function loadStoredSettings() {
  const stored = safeLocalStorage.getItem(STORAGE_KEYS.settings);
  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored) || {};
    return {
      sound: parsed.sound !== false,
      vibration: parsed.vibration !== false,
      history: parsed.history !== false
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatNumber(value) {
  if (typeof value !== 'string') {
    value = String(value);
  }

  if (value === 'Error' || value === 'Infinity' || value === '-Infinity' || Number.isNaN(Number(value))) {
    return value;
  }

  const num = Number.parseFloat(value);

  if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential(6);
  }

  if (value.includes('.')) {
    return num.toLocaleString('en-US', {
      maximumFractionDigits: 10,
      useGrouping: false
    });
  }

  return num.toLocaleString('en-US', { useGrouping: false });
}

function performCalculation(operator, firstOperand, secondOperand) {
  switch (operator) {
    case '+':
      return firstOperand + secondOperand;
    case '-':
      return firstOperand - secondOperand;
    case '*':
      return firstOperand * secondOperand;
    case '/':
      return firstOperand / secondOperand;
    case '**':
      return Math.pow(firstOperand, secondOperand);
    default:
      return secondOperand;
  }
}

function getOperatorSymbol(operator) {
  return OPERATOR_SYMBOLS[operator] || operator;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState('');
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState(loadStoredHistory);
  const [activeMode, setActiveMode] = useState('basic');
  const [settings, setSettings] = useState(loadStoredSettings);

  /* ---------------------------------------------------------------------- */
  /* Persistence                                                            */
  /* ---------------------------------------------------------------------- */

  // Save history whenever it changes
  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  // Save settings whenever they change
  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  /* ---------------------------------------------------------------------- */
  /* Feedback                                                               */
  /* ---------------------------------------------------------------------- */

  const playSound = useCallback(
    (type) => {
      if (!settings.sound) {
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const frequencies = {
          number: 800,
          operator: 600,
          equals: 1000,
          clear: 400,
          click: 700
        };

        oscillator.frequency.setValueAtTime(frequencies[type] || 700, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch {
        // Audio is optional, ignore every failure
      }
    },
    [settings.sound]
  );

  const vibrate = useCallback(() => {
    if (settings.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [settings.vibration]);

  /* ---------------------------------------------------------------------- */
  /* Calculation                                                            */
  /* ---------------------------------------------------------------------- */

  const addToHistory = useCallback((expression, result) => {
    const historyItem = {
      expression,
      result: String(result),
      timestamp: new Date().toLocaleString()
    };

    setHistory((previous) => [historyItem, ...previous.slice(0, 49)]);
  }, []);

  const appendValue = useCallback(
    (value) => {
      playSound('number');
      vibrate();

      setDisplay((current) => {
        if (waitingForOperand) {
          setWaitingForOperand(false);
          return value;
        }

        if (current === '0' && value !== '.') {
          return value;
        }

        if (value === '.' && current.includes('.')) {
          return current;
        }

        return current + value;
      });
    },
    [playSound, vibrate, waitingForOperand]
  );

  const appendOperator = useCallback(
    (nextOperator) => {
      playSound('operator');
      vibrate();

      const inputValue = Number.parseFloat(display);

      if (previousValue === '') {
        setPreviousValue(inputValue);
      } else if (operation) {
        const currentValue = previousValue || 0;
        const result = performCalculation(operation, currentValue, inputValue);

        setDisplay(String(result));
        setPreviousValue(result);
      }

      setWaitingForOperand(true);
      setOperation(nextOperator);
    },
    [display, operation, playSound, previousValue, vibrate]
  );

  const clearAll = useCallback(() => {
    playSound('clear');
    vibrate();
    setDisplay('0');
    setPreviousValue('');
    setOperation(null);
    setWaitingForOperand(false);
  }, [playSound, vibrate]);

  const calculate = useCallback(() => {
    playSound('equals');
    vibrate();

    try {
      let result;

      if (operation && previousValue !== '') {
        result = performCalculation(operation, previousValue, Number.parseFloat(display));

        if (settings.history) {
          addToHistory(
            `${formatNumber(previousValue)} ${getOperatorSymbol(operation)} ${formatNumber(display)}`,
            result
          );
        }
      } else {
        result = evaluateExpression(display);

        if (settings.history && display !== String(result)) {
          addToHistory(display, result);
        }
      }

      if (!Number.isFinite(result)) {
        throw new ExpressionError('Invalid calculation');
      }

      setDisplay(String(result));
      setPreviousValue('');
      setOperation(null);
      setWaitingForOperand(true);
    } catch {
      setDisplay('Error');
      setTimeout(() => {
        clearAll();
      }, 1500);
    }
  }, [addToHistory, clearAll, display, operation, playSound, previousValue, settings.history, vibrate]);

  const backspace = useCallback(() => {
    playSound('clear');
    vibrate();

    setDisplay((current) => {
      if (current.length > 1 && current !== 'Error') {
        return current.slice(0, -1);
      }
      return '0';
    });
  }, [playSound, vibrate]);

  const appendFunction = useCallback(
    (func) => {
      playSound('number');
      vibrate();

      setDisplay((current) => {
        if (waitingForOperand || current === '0') {
          setWaitingForOperand(false);
          return func;
        }
        return current + func;
      });
    },
    [playSound, vibrate, waitingForOperand]
  );

  const power = useCallback(() => {
    const value = Number.parseFloat(display);
    setDisplay(String(value * value));
  }, [display]);

  const factorialResult = useCallback(() => {
    const value = Number.parseInt(display, 10);

    if (Number.isNaN(value) || value < 0 || value > 170 || !Number.isInteger(Number.parseFloat(display))) {
      setDisplay('Error');
      setTimeout(() => {
        clearAll();
      }, 1500);
      return;
    }

    try {
      setDisplay(String(factorial(value)));
    } catch {
      setDisplay('Error');
      setTimeout(() => {
        clearAll();
      }, 1500);
    }
  }, [clearAll, display]);

  const percentage = useCallback(() => {
    const value = Number.parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  /* ---------------------------------------------------------------------- */
  /* Settings and history                                                   */
  /* ---------------------------------------------------------------------- */

  const toggleSetting = useCallback(
    (setting) => {
      setSettings((previous) => ({
        ...previous,
        [setting]: !previous[setting]
      }));
      playSound('click');
    },
    [playSound]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    playSound('clear');
    vibrate();
  }, [playSound, vibrate]);

  const loadFromHistory = useCallback((result) => {
    setDisplay(result);
    setActiveMode('basic');
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Long press on AC clears the whole calculation                          */
  /* ---------------------------------------------------------------------- */

  const acHoldTimer = useRef(null);

  const startAcHold = useCallback(() => {
    acHoldTimer.current = setTimeout(() => {
      clearAll();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 600);
  }, [clearAll]);

  const cancelAcHold = useCallback(() => {
    if (acHoldTimer.current) {
      clearTimeout(acHoldTimer.current);
      acHoldTimer.current = null;
    }
  }, []);

  useEffect(() => cancelAcHold, [cancelAcHold]);

  /* ---------------------------------------------------------------------- */
  /* Keyboard support                                                       */
  /* ---------------------------------------------------------------------- */

  // The handlers are kept in a ref so that the listener only has to be
  // registered once, while always calling the current implementation.
  const keyboardHandlers = useRef(null);

  useEffect(() => {
    keyboardHandlers.current = {
      appendValue,
      appendOperator,
      calculate,
      clearAll,
      backspace,
      percentage
    };
  });

  useEffect(() => {
    const handleKeyboard = (event) => {
      const handlers = keyboardHandlers.current;
      if (!handlers) {
        return;
      }

      const key = event.key;

      if (/[0-9+\-*/=.()%]/.test(key) || ['Enter', 'Escape', 'Backspace', 'Delete'].includes(key)) {
        event.preventDefault();
      }

      if (/[0-9.]/.test(key)) {
        handlers.appendValue(key);
      } else if (key === '+') {
        handlers.appendOperator('+');
      } else if (key === '-') {
        handlers.appendOperator('-');
      } else if (key === '*') {
        handlers.appendOperator('*');
      } else if (key === '/') {
        handlers.appendOperator('/');
      } else if (key === 'Enter' || key === '=') {
        handlers.calculate();
      } else if (key === 'Escape' || key === 'Delete') {
        handlers.clearAll();
      } else if (key === 'Backspace') {
        handlers.backspace();
      } else if (key === '%') {
        handlers.percentage();
      } else if (key === '(' || key === ')') {
        handlers.appendValue(key);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  // The result shrinks automatically when it gets long.
  const displaySizeClass = (() => {
    const length = formatNumber(display).length;
    if (length > 15) return 'text-3xl';
    if (length > 11) return 'text-4xl';
    if (length > 8) return 'text-5xl';
    return 'text-6xl';
  })();

  return (
    <div className="calc-root h-screen w-full flex flex-col overflow-hidden bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]">
      {/* Display */}
      <div className="calc-display-area flex-1 min-h-0 flex flex-col justify-end px-5 pb-2">
        {previousValue && operation && (
          <div className="text-right text-[var(--md-sys-color-on-surface-variant)] text-lg font-medium mb-1 truncate">
            {formatNumber(previousValue)} {getOperatorSymbol(operation)}
          </div>
        )}
        <div
          className={`calc-display text-right text-[var(--md-sys-color-on-surface)] font-light tracking-tight truncate ${
            display === 'Error' ? 'text-[var(--md-sys-color-error-container)] text-4xl' : displaySizeClass
          }`}
        >
          {formatNumber(display)}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="px-4 pb-2">
        <div className="flex bg-[var(--md-sys-color-surface-container)] rounded-2xl p-1 gap-1">
          {[
            { key: 'basic', icon: 'fa-calculator', label: 'Basic' },
            { key: 'scientific', icon: 'fa-flask', label: 'Sci' },
            { key: 'history', icon: 'fa-history', label: 'History' },
            { key: 'settings', icon: 'fa-cog', label: 'Settings' }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-1 py-2 rounded-xl font-medium transition-all duration-200 text-xs ${
                activeMode === mode.key
                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)] active:bg-[var(--md-sys-color-surface-container-high)]'
              }`}
            >
              <i className={`fas ${mode.icon} text-sm`}></i>
              <span className="truncate">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/*
        Mode panel.

        The panel always occupies the same amount of space, no matter which mode
        is active. Without this the whole calculator would grow and shrink when
        switching between basic, scientific, history and settings.
      */}
      <div className="calc-panel h-40 px-4 pb-2">
        {/* Scientific Panel */}
        {activeMode === 'scientific' && (
          <div className="h-full grid grid-cols-5 grid-rows-3 gap-2">
            {[
              { label: 'sin', action: () => appendFunction('sin(') },
              { label: 'cos', action: () => appendFunction('cos(') },
              { label: 'tan', action: () => appendFunction('tan(') },
              { label: 'log', action: () => appendFunction('log(') },
              { label: 'ln', action: () => appendFunction('ln(') },
              { label: 'π', action: () => appendValue('π') },
              { label: 'e', action: () => appendValue('e') },
              { label: '√', action: () => appendFunction('sqrt(') },
              { label: 'x²', action: power },
              { label: 'x^y', action: () => appendOperator('**') },
              { label: '(', action: () => appendValue('(') },
              { label: ')', action: () => appendValue(')') },
              { label: '|x|', action: () => appendFunction('abs(') },
              { label: 'x!', action: factorialResult },
              { label: '%', action: percentage }
            ].map((button) => (
              <button
                key={button.label}
                onClick={button.action}
                className="calc-key h-14 bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] rounded-xl font-medium text-sm active:scale-95 active:brightness-95 transition-all duration-100"
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

        {/* History Panel (also used as the "recent calculations" area in basic mode) */}
        {(activeMode === 'history' || activeMode === 'basic') && (
          <div className="h-full bg-[var(--md-sys-color-surface-container-low)] rounded-2xl p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                {activeMode === 'history' ? 'History' : 'Recent calculations'}
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] flex items-center gap-1 px-1"
                >
                  <i className="fas fa-trash text-[10px]"></i>
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="text-center text-[var(--md-sys-color-on-surface-variant)] py-6">
                <i className="fas fa-history text-2xl mb-2 opacity-60"></i>
                <p className="text-sm">No calculations yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.timestamp}-${index}`}
                    onClick={() => loadFromHistory(item.result)}
                    className="block w-full text-left p-2.5 bg-[var(--md-sys-color-surface-container-high)] rounded-xl cursor-pointer active:bg-[var(--md-sys-color-surface-container-highest)] transition-all duration-150"
                  >
                    <div className="text-[var(--md-sys-color-on-surface)] font-medium text-sm truncate">
                      {item.expression} = {formatNumber(item.result)}
                    </div>
                    <div className="text-[var(--md-sys-color-on-surface-variant)] text-xs mt-0.5">
                      {item.timestamp}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {activeMode === 'settings' && (
          <div className="h-full bg-[var(--md-sys-color-surface-container-low)] rounded-2xl p-3 overflow-y-auto">
            <div className="space-y-1">
              {Object.entries({
                sound: 'Sound Effects',
                vibration: 'Vibration Feedback',
                history: 'Save History'
              }).map(([key, label]) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <label className="text-[var(--md-sys-color-on-surface)] font-medium text-sm">{label}</label>
                  <button
                    onClick={() => toggleSetting(key)}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                      settings[key]
                        ? 'bg-[var(--md-sys-color-primary)]'
                        : 'bg-[var(--md-sys-color-surface-container-highest)]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-[var(--md-sys-color-on-primary)] rounded-full shadow transition-transform duration-200 ${
                        settings[key] ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    ></div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="calc-keypad flex-[1.55] min-h-0 px-4 pb-[calc(var(--safe-area-bottom,0px)+0.5rem)] grid grid-cols-4 grid-rows-5 gap-2">
        <button
          onClick={clearAll}
          onPointerDown={startAcHold}
          onPointerUp={cancelAcHold}
          onPointerLeave={cancelAcHold}
          className="calc-key h-14 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-2xl text-xl font-medium active:scale-95 active:brightness-95 transition-all duration-100"
        >
          AC
        </button>
        <button
          onClick={backspace}
          className="calc-key h-14 bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-2xl text-xl font-medium active:scale-95 active:brightness-95 transition-all duration-100"
        >
          <i className="fas fa-backspace"></i>
        </button>
        <button
          onClick={percentage}
          className="calc-key h-14 bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-xl font-medium active:scale-95 active:brightness-95 transition-all duration-100"
        >
          %
        </button>
        <button
          onClick={() => appendOperator('/')}
          className="calc-key h-14 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100"
        >
          ÷
        </button>

        <button onClick={() => appendValue('7')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">7</button>
        <button onClick={() => appendValue('8')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">8</button>
        <button onClick={() => appendValue('9')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">9</button>
        <button onClick={() => appendOperator('*')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">×</button>

        <button onClick={() => appendValue('4')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">4</button>
        <button onClick={() => appendValue('5')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">5</button>
        <button onClick={() => appendValue('6')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">6</button>
        <button onClick={() => appendOperator('-')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">−</button>

        <button onClick={() => appendValue('1')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">1</button>
        <button onClick={() => appendValue('2')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">2</button>
        <button onClick={() => appendValue('3')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">3</button>
        <button onClick={() => appendOperator('+')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">+</button>

        <button onClick={() => appendValue('0')} className="calc-key h-14 col-span-2 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">0</button>
        <button onClick={() => appendValue('.')} className="calc-key h-14 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-2xl text-2xl font-normal active:scale-95 active:brightness-95 transition-all duration-100">.</button>
        <button onClick={calculate} className="calc-key h-14 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-2xl text-2xl font-medium active:scale-95 active:brightness-95 transition-all duration-100">=</button>
      </div>

      <style>{`
        :root {
          --safe-area-top: 0px;
          --safe-area-bottom: 0px;
          --safe-area-left: 0px;
          --safe-area-right: 0px;
        }

        html, body, #root {
          height: 100%;
        }

        body {
          overscroll-behavior: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* The app draws behind the status bar and the gesture bar, the safe area
           variables (injected from Android) keep the content clear of them. */
        .calc-root {
          /* Fill the viewport reliably. 100vh is unreliable inside an Android
             WebView (it can be smaller than the visible area), so the app is
             pinned to the viewport instead. */
          position: fixed;
          inset: 0;
          height: auto;
          padding-top: var(--safe-area-top);
          padding-bottom: var(--safe-area-bottom);
          padding-left: var(--safe-area-left);
          padding-right: var(--safe-area-right);
        }

        .calc-panel > * {
          animation: calc-panel-in 0.18s ease-out;
        }

        /* Industry-standard calculator button height (56 dp / 3.5 rem) */
        .calc-key {
          height: 3.5rem;
        }

        .calc-keypad {
          padding-bottom: calc(var(--safe-area-bottom, 0px) + 0.5rem);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(127, 127, 127, 0.4);
          border-radius: 3px;
        }

        /* Subtle entrance animation when the mode panel changes */
        @keyframes calc-panel-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .calc-panel > * {
          animation: calc-panel-in 0.18s ease-out;
        }

        /*
         * Responsive adjustments: on short screens everything is scaled down a
         * bit so that the calculator still fits on the display.
         */
        @media (max-height: 700px) {
          .calc-panel {
            height: 8.5rem;
          }
          .calc-key {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

/* The pure helpers are exported so that they can be unit tested. */
export { evaluateExpression, formatNumber, performCalculation, getOperatorSymbol };

export default Calculator;
