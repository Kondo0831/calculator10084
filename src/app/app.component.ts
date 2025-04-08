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
  currentInput: string = '0';



  @ViewChild('calculatorDisplay', { static: true }) displayElement!: ElementRef;

  ngAfterViewInit() {
    
  }

  onButtonClick(value: string) {
    switch (value) {
      case '=': this.calculateResult(); break;
      case '%': this.appendValue('%'); break;
      case '±': this.toggleSign(); break;
      default: this.appendValue(value);
    }
  }

  onBackOrClear(): void {
    if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
      this.clearDisplay();
    } else {
      this.deleteLast();
    }
  }
  
  

  clearDisplay() {
    this.rawDisplay = '0';
    this.display = '0';
    this.formula = '';
    this.showFormula = false;
   
  }

  deleteLast() {
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.display = this.formatDisplay(this.rawDisplay);
   
  }
  appendValue(value: string) {
    if (this.rawDisplay === '0' && value !== '.' && value !== '%') {
      this.rawDisplay = '';
    }
  
    const operators = ['+', '-', '*', '/'];
  
    if (/[0-9.]/.test(value)) {
      // 現在の数値ブロックを取得
      const currentBlockMatch = this.rawDisplay.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
      const currentBlock = currentBlockMatch ? currentBlockMatch[1] : '';
      const [intPart = '', decimalPart = ''] = currentBlock.split('.');
      const isDecimal = currentBlock.includes('.');
      const cleanInt = intPart.replace(/^[-]?0+(?!$)/, ''); // 先頭の0除去（ただし1桁は残す）
      const decimalLength = decimalPart.length;
  
      const totalDigits = cleanInt.length + decimalLength;
  
      // 条件チェック（入力を制限する条件）
  
      // 小数点の重複
      if (value === '.' && isDecimal) return;
  
      // 整数部が10桁に到達 → 小数はOKだけど整数はNG
      if (/[0-9]/.test(value)) {
        if (!isDecimal && cleanInt.length >= 10) return; // 整数で10桁以上
        if (isDecimal && decimalLength >= 8) return;     // 小数で8桁以上
        if (totalDigits >= 18) return;                   // 全体で18桁超過
      }
  
      // 整数が10桁でも「.」はOK（小数がまだない場合）
      if (value === '.' && !isDecimal && cleanInt.length <= 10) {
        this.rawDisplay += value;
        this.updateFormattedDisplays();
        return;
      }
  
      // OKなら追加
      this.rawDisplay += value;
    } else if (operators.includes(value) || value === '%') {
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar) && value !== '%') {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
      } else {
        this.rawDisplay += value;
      }
    }
  
    this.updateFormattedDisplays();
  }
  
  private updateFormattedDisplays() {
    this.display = this.formatDisplay(this.rawDisplay);
    this.formula = this.formatDisplay(this.rawDisplay);
    this.showFormula = true;
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

  roundTo8Decimals(value: string): string {
    const num = Number(value);
    if (isNaN(num)) throw new Error('Invalid number');
    return num.toFixed(8).replace(/\.?0+$/, '');
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
    
  }

  formatDisplay(value: string): string {
    const formatted = value.replace(/-?\d+(\.\d+)?/g, (match) => {
      const [intPart, decimalPart] = match.split('.');
      const formattedInt = new Intl.NumberFormat('en-US').format(Number(intPart));
      return decimalPart ? `${formattedInt}.${decimalPart}` : formattedInt;
    });
    return formatted.replace(/\*/g, '×');
  }

  addStrings(a: string, b: string): string {
    const isNegativeA = a.startsWith('-');
    const isNegativeB = b.startsWith('-');
    a = a.replace('-', '');
    b = b.replace('-', '');
  
    if (isNegativeA && isNegativeB) {
      return '-' + this.addStrings(a, b);
    } else if (isNegativeA) {
      return this.subtractStrings(b, a);
    } else if (isNegativeB) {
      return this.subtractStrings(a, b);
    }
  
    let carry = 0;
    let result = '';
    const maxLen = Math.max(a.length, b.length);
    a = a.padStart(maxLen, '0');
    b = b.padStart(maxLen, '0');
  
    for (let i = maxLen - 1; i >= 0; i--) {
      const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
      result = (sum % 10) + result;
      carry = Math.floor(sum / 10);
    }
    if (carry) result = carry + result;
    return result.replace(/^0+/, '') || '0';
  }
  
  subtractStrings(a: string, b: string): string {
    const cmp = this.compareStrings(a, b);
    if (cmp === 0) return '0';
    if (cmp < 0) return '-' + this.subtractStrings(b, a);
  
    let result = '';
    let borrow = 0;
    a = a.padStart(b.length, '0');
  
    for (let i = a.length - 1; i >= 0; i--) {
      let diff = parseInt(a[i]) - (parseInt(b[i] || '0') + borrow);
      if (diff < 0) {
        diff += 10;
        borrow = 1;
      } else {
        borrow = 0;
      }
      result = diff + result;
    }
  
    return result.replace(/^0+/, '') || '0';
  }
  
  multiplyStrings(a: string, b: string): string {
    const isNegative = a.startsWith('-') !== b.startsWith('-');
    a = a.replace('-', '');
    b = b.replace('-', '');
  
    const result = Array(a.length + b.length).fill(0);
  
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        const mul = parseInt(a[i]) * parseInt(b[j]);
        const sum = mul + result[i + j + 1];
        result[i + j + 1] = sum % 10;
        result[i + j] += Math.floor(sum / 10);
      }
    }
  
    let resultStr = result.join('').replace(/^0+/, '') || '0';
    return isNegative ? '-' + resultStr : resultStr;
    
  }

  get displayFormula(): string {
    return this.formula.replace(/\*/g, '×');
  }
  
 
  
  divideStrings(a: string, b: string, precision: number = 8): string {
    if (b === '0') throw new Error('Divide by zero');
  
    const isNegative = a.startsWith('-') !== b.startsWith('-');
    a = a.replace('-', '');
    b = b.replace('-', '');
  
    let result = '';
    let remainder = '';
    let decimalPointAdded = false;
    let decimalCount = 0;
  
    for (let i = 0; i < a.length || (decimalCount < precision && remainder !== '0'); i++) {
      remainder += a[i] || '0';
      remainder = remainder.replace(/^0+/, '') || '0';
  
      let quotient = 0;
      while (this.compareStrings(remainder, b) >= 0) {
        remainder = this.subtractStrings(remainder, b);
        quotient++;
      }
  
      result += quotient.toString();
  
      if (i >= a.length - 1 && !decimalPointAdded) {
        result += '.';
        decimalPointAdded = true;
      }
  
      if (decimalPointAdded) {
        decimalCount++;
      }
  
      remainder += '0';
    }
  
    result = result.replace(/\.?0+$/, '');
    return isNegative && result !== '0' ? '-' + result : result;
  }
  
  compareStrings(a: string, b: string): number {
    a = a.replace(/^0+/, '') || '0';
    b = b.replace(/^0+/, '') || '0';
  
    if (a.length !== b.length) {
      return a.length > b.length ? 1 : -1;
    }
  
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    }
    return 0;
  }
  
  backspace(): void {
    this.deleteLast();
  }
  

}