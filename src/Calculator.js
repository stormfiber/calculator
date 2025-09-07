import React, { useState, useEffect, useCallback } from 'react';

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState('');
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeMode, setActiveMode] = useState('basic');
  const [settings, setSettings] = useState({
    sound: true,
    vibration: true,
    history: true,
    theme: true
  });

  // Safe localStorage operations
  const safeLocalStorage = {
    getItem: (key) => {
      try {
        return typeof Storage !== 'undefined' && localStorage ? localStorage.getItem(key) : null;
      } catch (e) {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        if (typeof Storage !== 'undefined' && localStorage) {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        // Silently fail if localStorage is not available
      }
    }
  };

  // Load saved data on mount
  useEffect(() => {
    const savedHistory = safeLocalStorage.getItem('calcPro_history');
    const savedSettings = safeLocalStorage.getItem('calcPro_settings');
    
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
      } catch (e) {
        setHistory([]);
      }
    }
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          sound: true,
          vibration: true,
          history: true,
          theme: true,
          ...parsedSettings
        });
      } catch (e) {
        // Keep default settings
      }
    }
  }, []);

  // Save history whenever it changes (but not on initial load)
  useEffect(() => {
    if (history.length > 0) {
      safeLocalStorage.setItem('calcPro_history', JSON.stringify(history));
    }
  }, [history]);

  // Save settings whenever they change
  useEffect(() => {
    safeLocalStorage.setItem('calcPro_settings', JSON.stringify(settings));
  }, [settings]);

  const playSound = useCallback((type) => {
    if (!settings.sound) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    } catch (e) {}
  }, [settings.sound]);

  const vibrate = useCallback(() => {
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [settings.vibration]);

  const formatNumber = (value) => {
    if (typeof value !== 'string') value = String(value);
    
    if (value === 'Error' || value === 'Infinity' || value === '-Infinity' || isNaN(value)) {
      return value;
    }
    
    const num = parseFloat(value);
    
    if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-6 && num !== 0)) {
      return num.toExponential(6);
    }
    
    if (value.includes('.')) {
      return parseFloat(value).toLocaleString('en-US', {
        maximumFractionDigits: 10,
        useGrouping: false
      });
    }
    
    return num.toLocaleString('en-US', { useGrouping: false });
  };

  const appendValue = (value) => {
    playSound('number');
    vibrate();

    if (waitingForOperand) {
      setDisplay(value);
      setWaitingForOperand(false);
    } else {
      if (display === '0' && value !== '.') {
        setDisplay(value);
      } else {
        if (value === '.' && display.includes('.')) {
          return;
        }
        setDisplay(display + value);
      }
    }
  };

  const appendOperator = (nextOperator) => {
    playSound('operator');
    vibrate();

    const inputValue = parseFloat(display);

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
  };

  const performCalculation = (operator, firstOperand, secondOperand) => {
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
  };

  const calculate = () => {
    playSound('equals');
    vibrate();

    try {
      let result;
      
      if (operation && previousValue !== '') {
        result = performCalculation(operation, previousValue, parseFloat(display));
        
        if (settings.history) {
          addToHistory(`${formatNumber(previousValue)} ${getOperatorSymbol(operation)} ${formatNumber(display)}`, result);
        }
      } else {
        let expression = display;
        
        // Handle scientific expressions
        expression = expression.replace(/π/g, Math.PI);
        expression = expression.replace(/e/g, Math.E);
        expression = expression.replace(/sin\(/g, 'Math.sin(');
        expression = expression.replace(/cos\(/g, 'Math.cos(');
        expression = expression.replace(/tan\(/g, 'Math.tan(');
        expression = expression.replace(/log\(/g, 'Math.log10(');
        expression = expression.replace(/ln\(/g, 'Math.log(');
        expression = expression.replace(/sqrt\(/g, 'Math.sqrt(');
        expression = expression.replace(/abs\(/g, 'Math.abs(');
        expression = expression.replace(/\^/g, '**');

        result = Function('"use strict"; return (' + expression + ')')();
        
        if (settings.history && expression !== display) {
          addToHistory(display, result);
        }
      }

      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Invalid calculation');
      }

      setDisplay(String(result));
      setPreviousValue('');
      setOperation(null);
      setWaitingForOperand(true);
    } catch (error) {
      setDisplay('Error');
      setTimeout(() => {
        clearAll();
      }, 1500);
    }
  };

  const getOperatorSymbol = (op) => {
    const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '**': '^' };
    return symbols[op] || op;
  };

  const addToHistory = (expression, result) => {
    const historyItem = {
      expression,
      result: String(result),
      timestamp: new Date().toLocaleString()
    };
    
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
  };

  const clearAll = () => {
    playSound('clear');
    vibrate();
    setDisplay('0');
    setPreviousValue('');
    setOperation(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    playSound('clear');
    vibrate();
    
    if (display.length > 1 && display !== 'Error') {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const appendFunction = (func) => {
    playSound('number');
    vibrate();
    
    if (waitingForOperand || display === '0') {
      setDisplay(func);
      setWaitingForOperand(false);
    } else {
      setDisplay(display + func);
    }
  };

  const power = () => {
    const value = parseFloat(display);
    setDisplay(String(value * value));
  };

  const factorial = () => {
    const num = parseInt(display);
    
    if (num < 0 || num > 170 || !Number.isInteger(parseFloat(display))) {
      setDisplay('Error');
      setTimeout(() => clearAll(), 1500);
      return;
    }
    
    let result = 1;
    for (let i = 2; i <= num; i++) {
      result *= i;
    }
    
    setDisplay(String(result));
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const toggleSetting = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    playSound('click');
  };

  const loadFromHistory = (result) => {
    setDisplay(result);
    setActiveMode('basic');
  };

  // Keyboard event handler
  useEffect(() => {
    const handleKeyboard = (event) => {
      const key = event.key;
      
      if (/[0-9+\-*/=.()%]/.test(key) || ['Enter', 'Escape', 'Backspace', 'Delete'].includes(key)) {
        event.preventDefault();
      }

      if (/[0-9.]/.test(key)) {
        appendValue(key);
      } else if (key === '+') {
        appendOperator('+');
      } else if (key === '-') {
        appendOperator('-');
      } else if (key === '*') {
        appendOperator('*');
      } else if (key === '/') {
        appendOperator('/');
      } else if (key === 'Enter' || key === '=') {
        calculate();
      } else if (key === 'Escape' || key === 'Delete') {
        clearAll();
      } else if (key === 'Backspace') {
        backspace();
      } else if (key === '%') {
        percentage();
      } else if (key === '(' || key === ')') {
        appendValue(key);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [display, previousValue, operation, waitingForOperand]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            <i className="fas fa-calculator mr-3"></i>CalculatorPro
          </h1>
          <p className="text-white/80">Professional Scientific Calculator</p>
        </div>

        {/* Calculator Body */}
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
          {/* Mode Switcher */}
          <div className="flex bg-gray-800/50 rounded-2xl p-1.5 mb-6 gap-1">
            {[
              { key: 'basic', icon: 'fa-calculator', label: 'Basic' },
              { key: 'scientific', icon: 'fa-flask', label: 'Sci' },
              { key: 'history', icon: 'fa-history', label: 'History' },
              { key: 'settings', icon: 'fa-cog', label: 'Settings' }
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setActiveMode(mode.key)}
                className={`flex-1 px-3 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                  activeMode === mode.key
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform -translate-y-0.5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <i className={`fas ${mode.icon} mr-1.5`}></i>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Display */}
          <div className="bg-gray-800 rounded-2xl p-6 mb-6 shadow-inner">
            {previousValue && operation && (
              <div className="text-right text-gray-400 text-sm mb-2">
                {formatNumber(previousValue)} {getOperatorSymbol(operation)}
              </div>
            )}
            <div className={`text-right text-white font-semibold text-3xl overflow-hidden ${
              display === 'Error' ? 'text-red-400' : ''
            }`}>
              {formatNumber(display)}
            </div>
          </div>

          {/* Scientific Panel */}
          {activeMode === 'scientific' && (
            <div className="grid grid-cols-5 gap-2 mb-4">
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
                { label: 'xʸ', action: () => appendOperator('**') },
                { label: '(', action: () => appendValue('(') },
                { label: ')', action: () => appendValue(')') },
                { label: '|x|', action: () => appendFunction('abs(') },
                { label: 'x!', action: factorial },
                { label: '%', action: percentage }
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.action}
                  className="h-10 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium text-xs hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* History Panel */}
          {activeMode === 'history' && (
            <div className="mb-4 max-h-64 overflow-y-auto bg-gray-800/50 rounded-2xl p-4">
              {history.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <i className="fas fa-history text-3xl mb-3 opacity-50"></i>
                  <p>No calculations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => loadFromHistory(item.result)}
                      className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="text-white font-medium">
                        {item.expression} = {formatNumber(item.result)}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {item.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Panel */}
          {activeMode === 'settings' && (
            <div className="mb-4 bg-gray-800/50 rounded-2xl p-4 space-y-4">
              {Object.entries({
                sound: 'Sound Effects',
                vibration: 'Vibration Feedback',
                history: 'Save History',
                theme: 'Dark Theme'
              }).map(([key, label]) => (
                <div key={key} className="flex justify-between items-center">
                  <label className="text-white font-medium">{label}</label>
                  <button
                    onClick={() => toggleSetting(key)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 ${
                      settings[key] ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                      settings[key] ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Buttons */}
          <div className="grid grid-cols-4 gap-3">
            {/* Row 1 */}
            <button onClick={clearAll} className="h-14 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              AC
            </button>
            <button onClick={backspace} className="h-14 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              <i className="fas fa-backspace"></i>
            </button>
            <button onClick={() => appendOperator('/')} className="h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              ÷
            </button>
            <button onClick={() => appendOperator('*')} className="h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              ×
            </button>

            {/* Row 2 */}
            <button onClick={() => appendValue('7')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              7
            </button>
            <button onClick={() => appendValue('8')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              8
            </button>
            <button onClick={() => appendValue('9')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              9
            </button>
            <button onClick={() => appendOperator('-')} className="h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              −
            </button>

            {/* Row 3 */}
            <button onClick={() => appendValue('4')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              4
            </button>
            <button onClick={() => appendValue('5')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              5
            </button>
            <button onClick={() => appendValue('6')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              6
            </button>
            <button onClick={() => appendOperator('+')} className="h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              +
            </button>

            {/* Row 4 */}
            <button onClick={() => appendValue('1')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              1
            </button>
            <button onClick={() => appendValue('2')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              2
            </button>
            <button onClick={() => appendValue('3')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              3
            </button>
            <button onClick={() => appendValue('.')} className="h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              .
            </button>

            {/* Row 5 */}
            <button onClick={() => appendValue('0')} className="col-span-2 h-14 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              0
            </button>
            <button onClick={calculate} className="col-span-2 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              =
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.8);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 1);
        }

        /* Responsive adjustments */
        @media (max-height: 700px) and (orientation: landscape) {
          .min-h-screen {
            min-height: auto;
            padding: 1rem;
          }
        }

        @media (max-width: 380px) {
          .text-4xl {
            font-size: 2rem;
          }
          .text-3xl {
            font-size: 1.5rem;
          }
          .h-14 {
            height: 3rem;
          }
          .h-10 {
            height: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Calculator;