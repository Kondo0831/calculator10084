import { Component, HostListener, AfterViewInit } from '@angular/core';
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
  // ==========================
  // 状態管理
  // ==========================
  display = '0';
  rawDisplay = '0';
  formula = '';
  showFormula = false;
  maxDigits = 10;
  justCalculated = false;
  lastOperator: string | null = null;
  lastOperand: string | null = null;

  // ==========================
  // 初期フォーカス制御
  // ==========================
  ngAfterViewInit() {
    const el = document.querySelector('.calculator') as HTMLElement;
    el?.focus();
  }

  focusBack(event: Event) {
    (event.currentTarget as HTMLElement).focus();
  }

  // ==========================
  // キーボード操作
  // ==========================
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) : void {
    const key = event.key;
    const buttonKey = this.mapKeyToButton(key);
    if (!buttonKey) return;
  
    this.handleButtonAction(buttonKey); // 共通の処理を呼び出し
  }

  onButtonClick(value: string) : void {
    this.handleButtonAction(value); // 共通の処理を呼び出し
  }

  handleButtonAction(key: string): void {
  
    this.highlightKey(key);
    if (navigator.vibrate) navigator.vibrate(10);
    const action = this.mapButtonToAction(key);
    action();
  }

  highlightKey(key: string) {
    const btn = document.querySelector(`button[data-key="${key}"]`) as HTMLElement;
    if (btn) {
      btn.classList.add('pressed');

      setTimeout(() =>{  
      btn.classList.remove('pressed');
    }, 100);
    }
  }

  mapKeyToButton(key: string): string {
    switch (key) {
      case 'Enter': return '=';
      case 'Backspace': return '←'; // ←に合わせる（ボタンが⌫の場合は '⌫' に）
      case 'c':
      case 'C': return 'C';
      case '*': return '*';
      case '/': return '/';
      case '+': return '+';
      case '-': return '-';
      case '.': return '.';
      case '%': return '%';
      case 'F9': return '±';
      default: return /^[0-9]$/.test(key) ? key : '';
    }
  }

  mapButtonToAction(value: string): () => void {
    const actions: { [key: string]: () => void } = {
      '=': () => this.calculateResult(),
      '%': () => this.inputPercent(),
      '±': () => this.inputPlusMinus(),
      '←': () => this.backspace(),
      'C': () => this.clearDisplay(),
    };
  
    // デフォルトは appendValue
    return actions[value] || (() => this.appendValue(value));
  }

  



  


  onBackOrClear() {
    if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
      this.clearDisplay();
    } else {
      this.backspace();
    }
  }

  // ==========================
  // 入力処理
  // ==========================
  appendValue(value: string) {
    const operators = ['+', '-', '*', '/'];

    if (this.justCalculated && /[0-9.]/.test(value)) {
      this.rawDisplay = '';
      this.display = '';
      this.justCalculated = false;
    }

    if (this.rawDisplay === '0' && value !== '.' && !operators.includes(value)) {
      this.rawDisplay = '';
    }

    if (value === '-' && this.rawDisplay === '0') {
      this.rawDisplay = '-';
      return this.updateFormattedDisplays();
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
      this.justCalculated = false;
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar)) {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
      } else {
        this.rawDisplay += value;
      }
    }

    this.updateFormattedDisplays();
  }

  backspace() {
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.updateFormattedDisplays();
    // アニメーション
   
  }

  clearDisplay() {
    this.rawDisplay = '0';
    this.display = '0';
    this.formula = '';
    this.showFormula = false;
    this.lastOperator = null;
    this.lastOperand = null;
    
  }

  // ==========================
  // 表示更新・整形
  // ==========================
  updateFormattedDisplays() {
    this.display = this.formatDisplay(this.rawDisplay);
    this.formula = this.display;
    this.showFormula = true;
  }

  formatDisplay(value: string): string {
    return value.replace(/-?\d+(\.\d+)?%?/g, (num) => {
      const isPercent = num.endsWith('%');
      const numberPart = isPercent ? num.slice(0, -1) : num;
      const [intPart, decimalPart] = numberPart.split('.');
      const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
      const final = decimalPart ? `${formatted}.${decimalPart}` : formatted;
      return isPercent ? `${final}%` : final;
    }).replace(/\*/g, '×').replace(/\//g, '÷');
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

  // ==========================
  // 計算処理
  // ==========================
  calculateResult() {
    try {

      // ===== 繰り返し演算のチェック =====
    if (this.justCalculated && this.lastOperator && this.lastOperand) {
      const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
      const result = this.evaluateExpression(repeatedExpr);
      const formatted = this.formatNumber(result);

      if (formatted === 'Overflow') {
        this.display = 'Overflow';
        this.rawDisplay = '0';
        this.formula = '';
        this.showFormula = false;
      } else {
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.showFormula = true;
        this.rawDisplay = result;
        this.justCalculated = true;
      }

      return;
    }

      const result = this.evaluateExpression(this.rawDisplay);
      const formatted = this.formatNumber(result);
      

      if (formatted === 'Overflow') {
        this.display = 'Overflow';
        this.rawDisplay = '0';
        this.formula = '';
        this.showFormula = false;
      } else {
      // 🧠 直前の演算子と右辺を保存（繰り返しのため）
      const match = this.rawDisplay.match(/([+\-*/])([^\+\-\*/]+)$/);
       this.lastOperator = match ? match[1] : null;
       this.lastOperand = match ? match[2] : null;

        this.display = formatted;
        this.formula = this.formatDisplay(this.rawDisplay) + ' =';
        this.showFormula = true;
        this.rawDisplay = result;
        this.justCalculated = true;
      }
    } catch {
      this.display = 'Error';
      this.rawDisplay = '0';
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

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].endsWith('%')) {
        const number = tokens[i].slice(0, -1);
        tokens[i] = `(${number}/100)`;
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      if (
        tokens[i] === '-' &&
        (i === 0 || ['+', '-', '*', '/', '('].includes(tokens[i - 1]))
      ) {
        tokens[i + 1] = '-' + tokens[i + 1];
        tokens.splice(i, 1);
      }
    }

    const finalExpr = tokens.join('');
    const result = Function(`'use strict'; return (${finalExpr})`)();
    return this.roundTo8Decimals(result.toString());
  }

  // ==========================
  // ± / % 入力
  // ==========================
  inputPlusMinus() {
    if (this.rawDisplay === '0' || this.rawDisplay === '') {
      this.rawDisplay = '-';
      this.updateFormattedDisplays();
      return;
    }
  
    // 最後の数値部分をマッチ（符号や % 含む）
    const match = this.rawDisplay.match(/(\-?\d*\.?\d+%?|\-?\d+%?)(?!.*\d)/);
    if (!match) return;
  
    const number = match[1];
    const index = this.rawDisplay.lastIndexOf(number);
  
    // マイナス符号をリセットしてから反転
    const stripped = number.replace(/^[-]+/, '');
    const toggled = number.startsWith('-') ? stripped : '-' + stripped;
  
    this.rawDisplay = this.rawDisplay.slice(0, index) + toggled + this.rawDisplay.slice(index + number.length);
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

  // ==========================
  // 補助関数
  // ==========================
  applyOperation(a: string, op: string, b: string): string {
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
}

