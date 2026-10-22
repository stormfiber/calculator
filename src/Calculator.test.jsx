import { evaluateExpression, formatNumber, performCalculation, getOperatorSymbol } from './Calculator.jsx';

describe('evaluateExpression', () => {
  it('evaluates plain numbers', () => {
    expect(evaluateExpression('42')).toBe(42);
    expect(evaluateExpression('3.5')).toBe(3.5);
    expect(evaluateExpression('.5')).toBe(0.5);
  });

  it('evaluates the four basic operations', () => {
    expect(evaluateExpression('1+2')).toBe(3);
    expect(evaluateExpression('10-4')).toBe(6);
    expect(evaluateExpression('6*7')).toBe(42);
    expect(evaluateExpression('9/2')).toBe(4.5);
  });

  it('respects the operator precedence', () => {
    expect(evaluateExpression('2+3*4')).toBe(14);
    expect(evaluateExpression('2*3+4')).toBe(10);
    expect(evaluateExpression('2+3*4-6/3')).toBe(12);
  });

  it('supports parentheses', () => {
    expect(evaluateExpression('(2+3)*4')).toBe(20);
    expect(evaluateExpression('((1+2)*(3+4))')).toBe(21);
  });

  it('supports unary minus and plus', () => {
    expect(evaluateExpression('-5')).toBe(-5);
    expect(evaluateExpression('-5+3')).toBe(-2);
    expect(evaluateExpression('+7')).toBe(7);
    expect(evaluateExpression('2*-3')).toBe(-6);
    expect(evaluateExpression('-(2+3)')).toBe(-5);
  });

  it('evaluates the power operator from right to left', () => {
    expect(evaluateExpression('2^3')).toBe(8);
    expect(evaluateExpression('2^3^2')).toBe(512);
    expect(evaluateExpression('2^-2')).toBe(0.25);
  });

  it('evaluates the constants pi and e', () => {
    expect(evaluateExpression('π')).toBeCloseTo(Math.PI, 10);
    expect(evaluateExpression('e')).toBeCloseTo(Math.E, 10);
    expect(evaluateExpression('2π')).toBeCloseTo(2 * Math.PI, 10);
    expect(evaluateExpression('3e')).toBeCloseTo(3 * Math.E, 10);
  });

  it('evaluates the scientific functions', () => {
    expect(evaluateExpression('sin(0)')).toBe(0);
    expect(evaluateExpression('cos(0)')).toBe(1);
    expect(evaluateExpression('tan(0)')).toBe(0);
    expect(evaluateExpression('log(100)')).toBe(2);
    expect(evaluateExpression('ln(1)')).toBe(0);
    expect(evaluateExpression('sqrt(16)')).toBe(4);
    expect(evaluateExpression('abs(-7)')).toBe(7);
  });

  it('supports implicit multiplication', () => {
    expect(evaluateExpression('2(3+4)')).toBe(14);
    expect(evaluateExpression('2π')).toBeCloseTo(2 * Math.PI, 10);
  });

  it('supports the factorial operator', () => {
    expect(evaluateExpression('5!')).toBe(120);
    expect(evaluateExpression('0!')).toBe(1);
  });

  it('rejects invalid expressions', () => {
    expect(() => evaluateExpression('1+')).toThrow();
    expect(() => evaluateExpression('(1+2')).toThrow();
    expect(() => evaluateExpression('1+2)')).toThrow();
    expect(() => evaluateExpression('unknown(2)')).toThrow();
    expect(() => evaluateExpression('1/0')).toThrow();
    expect(() => evaluateExpression('(-1)!')).toThrow();
  });
});

describe('formatNumber', () => {
  it('formats integers without grouping', () => {
    expect(formatNumber('1234')).toBe('1234');
  });

  it('keeps decimals', () => {
    expect(formatNumber('12.5')).toBe('12.5');
  });

  it('passes errors through', () => {
    expect(formatNumber('Error')).toBe('Error');
  });

  it('uses the exponential notation for very large numbers', () => {
    expect(formatNumber('1e20')).toMatch(/e\+/);
  });
});

describe('performCalculation', () => {
  it('performs the basic operations', () => {
    expect(performCalculation('+', 1, 2)).toBe(3);
    expect(performCalculation('-', 5, 2)).toBe(3);
    expect(performCalculation('*', 3, 4)).toBe(12);
    expect(performCalculation('/', 9, 3)).toBe(3);
    expect(performCalculation('**', 2, 10)).toBe(1024);
  });
});

describe('getOperatorSymbol', () => {
  it('maps the operators to their symbols', () => {
    expect(getOperatorSymbol('+')).toBe('+');
    expect(getOperatorSymbol('-')).toBe('−');
    expect(getOperatorSymbol('*')).toBe('×');
    expect(getOperatorSymbol('/')).toBe('÷');
    expect(getOperatorSymbol('**')).toBe('^');
  });
});
