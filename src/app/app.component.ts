import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  display = '0';
  rawDisplay = '0';
  formula = '';
  showFormula = false;
  maxDigits = 10;
  justCalculated = false;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    if (key === 'Enter' || key === '=') return this.calculateResult();
    if (key === 'Backspace') return this.backspace();
    if (key === '.') return this.appendValue('.');
    if (key === '%') return this.onButtonClick('%');
    if (key === 'c' || key === 'C') return this.clearDisplay(); // ← 追加
    if (/^[0-9]$/.test(key)) return this.appendValue(key);

    const ops: { [key: string]: string } = { '+': '+', '-': '-', '*': '*', '/': '/' };
    if (key in ops) return this.appendValue(ops[key]);
  }

  onButtonClick(value: string) {
    switch (value) {
      case '=': return this.calculateResult();
      case '%': return this.inputPercent();
      case '±': return this.toggleSign();
      default: return this.appendValue(value);
    }
  }

  onBackOrClear() {
    if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
      this.clearDisplay();
    } else {
      this.backspace();
    }
  }

  clearDisplay() {
    this.rawDisplay = '0';
    this.display = '0';
    this.formula = '';
    this.showFormula = false;
  }

  backspace() {
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.updateFormattedDisplays();
  }

  appendValue(value: string) {
    const operators = ['+', '-', '*', '/'];

    // 計算直後に数字または小数点を入力した場合は初期化
    if (this.justCalculated && /[0-9.]/.test(value)) {
      this.rawDisplay = '';
      this.display = '';
      this.justCalculated = false;
    }
  
    if (this.rawDisplay === '0' && value !== '.' && !operators.includes(value)) {
      this.rawDisplay = '';
    }
  
    if (/[0-9.]/.test(value)) {
      const match = this.rawDisplay.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
      const currentBlock = match ? match[1] : '';
      const [intPart = '', decimalPart = ''] = currentBlock.split('.');
      const isDecimal = currentBlock.includes('.');
      const cleanInt = intPart.replace(/^[-]?0+(?!$)/, '');
      const totalDigits = cleanInt.length + decimalPart.length;
  
      if (value === '.' && isDecimal) return;
      if (/[0-9]/.test(value)) {
        if (!isDecimal && cleanInt.length >= 10) return;
        if (isDecimal && decimalPart.length >= 8) return;
        if (totalDigits >= 18) return;
      }
      if (value === '.' && !isDecimal && cleanInt.length <= 10) {
        this.rawDisplay += value;
        return this.updateFormattedDisplays();
      }
  
      this.rawDisplay += value;
    } else if (operators.includes(value)) {
      this.justCalculated = false;  // 演算子入力ではリセットしない
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar)) {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
      } else {
        this.rawDisplay += value;
      }
    }
  
    this.updateFormattedDisplays();
  }

  
  updateFormattedDisplays() {
    this.display = this.formatDisplay(this.rawDisplay);
    this.formula = this.display;
    this.showFormula = true;
  }

  calculateResult() {
    try {
      const result = this.evaluateExpression(this.rawDisplay);
      const formatted = this.formatNumber(result);
      if (formatted === 'Overflow') {
        this.display = 'Overflow';
        this.rawDisplay = '0';  // ← display は変更しない
        this.formula = '';
        this.showFormula = false;
      } else {
        this.display = formatted;
        this.formula = this.formatDisplay(this.rawDisplay) + ' =';
        this.showFormula = true;
        this.rawDisplay = result;
        this.justCalculated = true;
      }
    } catch {
      this.display = 'Error';
      this.rawDisplay = '0';  // ← これも clearDisplay の代わりに個別に
      this.formula = '';
      this.showFormula = false;
     
    }
  }

  evaluateExpression(expr: string): string {
    const tokens: string[] = [];
    const regex = /[+\-*/()]|\d+(?:\.\d+)?%?|\.\d+/g;
    let match;
    while ((match = regex.exec(expr)) !== null) {
      tokens.push(match[0]);
    }
  
    // % を (数値/100) に変換
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].endsWith('%')) {
        const number = tokens[i].slice(0, -1);
        tokens[i] = `(${number}/100)`;
      }
    }
  
    // 単項マイナス処理
    for (let i = 0; i < tokens.length; i++) {
      if (
        tokens[i] === '-' &&
        (i === 0 || ['+', '-', '*', '/', '('].includes(tokens[i - 1]))
      ) {
        tokens[i + 1] = '-' + tokens[i + 1];
        tokens.splice(i, 1);
      }
    }
  
    // 式再構成して評価
    const finalExpr = tokens.join('');
    const result = Function(`'use strict'; return (${finalExpr})`)();
    return this.roundTo8Decimals(result.toString());
  }
   

  applyOperation(a: string, op: string, b: string): string {
    const isDecimal = a.includes('.') || b.includes('.');
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

  formatDisplay(value: string): string {
    return value.replace(/-?\d+(\.\d+)?%?/g, (num) => {
      const isPercent = num.endsWith('%');
      const numberPart = isPercent ? num.slice(0, -1) : num;
      const [intPart, decimalPart] = numberPart.split('.');
      const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
      const finalNumber = decimalPart ? `${formatted}.${decimalPart}` : formatted;
      return isPercent ? `${finalNumber}%` : finalNumber;
    }).replace(/\*/g, '×').replace(/\//g, '÷');
  }

  toggleSign() {
    const match = this.rawDisplay.match(/(\d+(\.\d+)?)(?!.*\d)/);
    if (!match) return;

    const lastNumber = match[0];
    const idx = this.rawDisplay.lastIndexOf(lastNumber);
    const toggled = lastNumber.startsWith('-') ? lastNumber.slice(1) : '-' + lastNumber;

    this.rawDisplay = this.rawDisplay.slice(0, idx) + toggled + this.rawDisplay.slice(idx + lastNumber.length);
    this.updateFormattedDisplays();
  }

  inputPercent() {
    if (this.rawDisplay.endsWith('%')) return;
  
    const match = this.rawDisplay.match(/(\d+(\.\d+)?)(?!.*\d)/);
    if (!match) return;
  
    const lastNumber = match[0];
    const idx = this.rawDisplay.lastIndexOf(lastNumber);
    const withPercent = lastNumber + '%';
  
    this.rawDisplay =
      this.rawDisplay.slice(0, idx) + withPercent + this.rawDisplay.slice(idx + lastNumber.length);
  
    this.updateFormattedDisplays();
}
}