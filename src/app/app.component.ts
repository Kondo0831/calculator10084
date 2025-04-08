import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  display: string = '0';
  rawDisplay: string = '0';
  maxDigits: number = 10;
  formula: string = '';
  showFormula: boolean = false;

  @ViewChild('calculatorDisplay', { static: true }) displayElement!: ElementRef;

  buttons: string[] = [
    'C', '←', '%', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '±', '='
  ];

  ngAfterViewInit() {
    this.adjustFontSize();
  }

  onButtonClick(value: string) {
    switch (value) {
      case '=': this.calculateResult(); break;
      case 'C': this.clearDisplay(); break;
      case '←': this.deleteLast(); break;
      case '%': this.appendValue('%'); break;
      case '±': this.toggleSign(); break;
      default: this.appendValue(value);
    }
  }

  appendValue(value: string) {
    if (this.rawDisplay === '0' && value !== '.' && value !== '%') this.rawDisplay = '';

    const operators = ['+', '-', '*', '/'];

    if (/[0-9.]/.test(value)) {
      const lastNumberMatch = this.rawDisplay.match(/(\d+(\.\d+)?)(?!.*\d)/);
      const lastNumber = lastNumberMatch ? lastNumberMatch[0] : '';
      const isDecimal = lastNumber.includes('.');

      const currentBlockMatch = this.rawDisplay.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
      const currentBlock = currentBlockMatch ? currentBlockMatch[1] : '';
      const [intPart = '', decimalPart = ''] = currentBlock.split('.');
      const cleanInt = intPart.replace(/^[-0]*/, '');
      const decimalLength = decimalPart.length;

      if (value === '.' && isDecimal) return;
      if (value !== '.' && isDecimal && decimalLength >= 8) return;
      if (/[0-9]/.test(value) && cleanInt.length >= 10 && !isDecimal) return;
      if (/[0-9]/.test(value) && isDecimal && cleanInt.length >= 10) return;
      if (/[0-9]/.test(value) && (cleanInt.length + decimalLength >= 17)) return;

      this.rawDisplay += value;
    } else if (operators.includes(value) || value === '%') {
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar) && value !== '%') {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
      } else {
        this.rawDisplay += value;
      }
    }

    this.display = this.formatDisplay(this.rawDisplay);
  }

  deleteLast() {
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.display = this.formatDisplay(this.rawDisplay);
    this.adjustFontSize();
  }

  calculateResult() {
    try {
      const result = this.evaluateExpression(this.rawDisplay);
      const formatted = this.formatNumber(result);

      if (formatted === 'Overflow') {
        this.display = 'Overflow';
        this.rawDisplay = '0';
        this.formula = '';
        this.showFormula = false;
      } else {
        this.formula = this.formatDisplay(this.rawDisplay) + ' =';
        this.display = formatted;
        this.showFormula = true;
      }
    } catch {
      this.display = 'Error';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
    }
    this.adjustFontSize();
  }

  roundTo8Decimals(value: string): string {
    const num = Number(value);
    if (isNaN(num)) throw new Error('Invalid number');
    const rounded = num.toFixed(8).replace(/\.?0+$/, '');
    return rounded;
  }

  evaluateExpression(expr: string): string {
    expr = expr.replace(/(\d+(\.\d+)?)%/g, (_, num) => `(${num}/100)`);
    const rawTokens = expr.match(/[+\-*/]|[0-9.]+/g);
    if (!rawTokens) throw new Error('Invalid expression');

    const tokens: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      if (token === '-' && (i === 0 || ['+', '-', '*', '/'].includes(rawTokens[i - 1]))) {
        const next = rawTokens[++i];
        if (!next || !/^\d+(\.\d+)?$/.test(next)) throw new Error('Invalid negative number');
        tokens.push('-' + next);
      } else {
        tokens.push(token);
      }
    }

    const applyOp = (a: string, op: string, b: string): string => {
      const isDecimal = a.includes('.') || b.includes('.');
      if (isDecimal) {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        let result: number;

        switch (op) {
          case '+': result = numA + numB; break;
          case '-': result = numA - numB; break;
          case '*': result = numA * numB; break;
          case '/': if (numB === 0) throw new Error('Divide by zero'); result = numA / numB; break;
          default: throw new Error('Unknown operator');
        }

        return result.toFixed(8).replace(/\.?0+$/, '');
      } else {
        switch (op) {
          case '+': return this.addStrings(a, b);
          case '-': return this.subtractStrings(a, b);
          case '*': return this.multiplyStrings(a, b);
          case '/': return this.divideStrings(a, b, 8);
          default: throw new Error('Unknown operator');
        }
      }
    };

    let values: string[] = [];
    let operators: string[] = [];

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (['*', '/'].includes(token)) {
        const a = values.pop()!;
        const b = tokens[++i];
        values.push(applyOp(a, token, b));
      } else if (['+', '-'].includes(token)) {
        operators.push(token);
      } else {
        values.push(token);
      }
      i++;
    }

    let result = values[0];
    let valIndex = 1;
    for (const op of operators) {
      result = applyOp(result, op, values[valIndex++]);
    }

    return this.roundTo8Decimals(result);
  }

  addStrings(a: string, b: string): string {
    let res = '', carry = 0;
    a = a.replace(/^0+/, '').split('').reverse().join('');
    b = b.replace(/^0+/, '').split('').reverse().join('');
    let maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      let digitA = i < a.length ? +a[i] : 0;
      let digitB = i < b.length ? +b[i] : 0;
      let sum = digitA + digitB + carry;
      res = (sum % 10) + res;
      carry = Math.floor(sum / 10);
    }
    if (carry) res = carry + res;
    return res.replace(/^0+/, '') || '0';
  }

  subtractStrings(a: string, b: string): string {
    if (this.compareStrings(a, b) < 0) return '-' + this.subtractStrings(b, a);
    let res = '', borrow = 0;
    a = a.replace(/^0+/, '').split('').reverse().join('');
    b = b.replace(/^0+/, '').split('').reverse().join('');
    for (let i = 0; i < a.length; i++) {
      let digitA = +a[i];
      let digitB = i < b.length ? +b[i] : 0;
      let sub = digitA - digitB - borrow;
      if (sub < 0) {
        sub += 10;
        borrow = 1;
      } else {
        borrow = 0;
      }
      res = sub + res;
    }
    return res.replace(/^0+/, '') || '0';
  }

  multiplyStrings(a: string, b: string): string {
    a = a.replace(/^0+/, '');
    b = b.replace(/^0+/, '');
    if (a === '0' || b === '0') return '0';

    let result = Array(a.length + b.length).fill(0);
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        let mul = +a[i] * +b[j];
        let p1 = i + j, p2 = i + j + 1;
        let sum = mul + result[p2];
        result[p2] = sum % 10;
        result[p1] += Math.floor(sum / 10);
      }
    }

    while (result[0] === 0) result.shift();
    return result.join('');
  }

  divideStrings(a: string, b: string, precision: number): string {
    if (b === '0') throw new Error('Divide by zero');

    let dividend = BigInt(a);
    let divisor = BigInt(b);
    let quotient = dividend / divisor;
    let remainder = dividend % divisor;

    if (remainder === BigInt(0)) return quotient.toString();

    let decimal = '';
    for (let i = 0; i < precision && remainder !== BigInt(0); i++) {
      remainder *= BigInt(10);
      decimal += (remainder / divisor).toString();
      remainder %= divisor;
    }

    decimal = decimal.replace(/0+$/, '');
    return decimal ? `${quotient}.${decimal}` : quotient.toString();
  }

  compareStrings(a: string, b: string): number {
    a = a.replace(/^0+/, '');
    b = b.replace(/^0+/, '');
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  }

  formatNumber(value: string): string {
    const [intPart, decimal] = value.split('.');
    const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
    if (decimal) {
      const trimmed = decimal.slice(0, 8).replace(/0+$/, '');
      return trimmed ? `${formatted}.${trimmed}` : formatted;
    }
    return formatted;
  }

  toggleSign() {
    if (this.rawDisplay.startsWith('-')) {
      this.rawDisplay = this.rawDisplay.slice(1);
    } else {
      this.rawDisplay = '-' + this.rawDisplay;
    }
    this.display = this.formatDisplay(this.rawDisplay);
    this.adjustFontSize();
  }

  clearDisplay() {
    this.rawDisplay = '0';
    this.display = '0';
    this.formula = '';
    this.showFormula = false;
    this.adjustFontSize();
  }

  adjustFontSize() {
    requestAnimationFrame(() => {
      if (!this.displayElement) return;
      let fontSize = 48;
      this.displayElement.nativeElement.style.fontSize = `${fontSize}px`;
      while (this.displayElement.nativeElement.scrollWidth > this.displayElement.nativeElement.clientWidth - 5 && fontSize > 24) {
        fontSize--;
        this.displayElement.nativeElement.style.fontSize = `${fontSize}px`;
      }
    });
  }

  formatDisplay(value: string): string {
    return value.replace(/-?\d+(\.\d+)?/g, (match) => {
      const [intPart, decimalPart] = match.split('.');
      const formattedInt = new Intl.NumberFormat('en-US').format(Number(intPart));
      return decimalPart ? `${formattedInt}.${decimalPart}` : formattedInt;
    });
  }
}