import { Component, HostListener, AfterViewInit,ViewChild,ElementRef } from '@angular/core';
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
  @ViewChild('resultText') resultTextRef!: ElementRef;
  @ViewChild('expressionText') expressionTextRef!: ElementRef
  @ViewChild('someElement') someElementRef!: ElementRef;

  autoResizeFont(element: HTMLElement, maxFontSize = 36, minFontSize = 14) {
    const parent = element.parentElement;
    if (!parent) return;
  
    let fontSize = maxFontSize;
    element.style.fontSize = fontSize + 'px';
  
    while (element.scrollWidth > parent.clientWidth && fontSize > minFontSize) {
      fontSize--;
      element.style.fontSize = fontSize + 'px';
    }
  }
  
  removeFocus() {
    this.someElementRef.nativeElement.blur();
  }

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
  isClear = true; // C/CEの切り替え用フラグ

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
    if (key === 'Delete') {
      this.clearEntry();  // DeleteキーでCEの動作を行う
      return;
    }
  
    this.handleButtonAction(buttonKey); // 共通の処理を呼び出し
  }

  onButtonClick(value: string) : void {
    this.handleButtonAction(value); // 共通の処理を呼び出し
  }

  handleButtonAction(key: string): void {
    if (key === 'CE') {
      this.isClear = true; // CEボタンを押したときは全消しフラグをtrueに
    } else if (key === 'C') {
      this.isClear = false; // Cボタンを押したときは入力クリアに
    }
  
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
      case 'Delete': return 'CE'; // DeleteでCEに対応
      case 'c':
      case 'C': return 'C';
      case '*': return '*';
      case '/': return '/';
      case '+': return '+';
      case '-': return '-';
      case '.': return '.';
      case '%': return '%';
      case 'F9': return '±';
      case 'r': return '√';
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
      'CE': () => this.clearEntry(), // CEボタンを追加
      '√': () => this.inputSquareRoot(), // 追加された処理
    };
  
    // デフォルトは appendValue
    return actions[value] || (() => this.appendValue(value));
  }

  clearLastInput() {
     // 最後の入力を削除（CEボタン）
  if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
    this.rawDisplay = '0';
  } else {
    this.rawDisplay = this.rawDisplay.slice(0, -1);
  }
  this.updateFormattedDisplays();
   
  }

  clearDisplay() {
    // 全ての入力をクリア
    this.rawDisplay = '0';
    this.display = '0';
    this.formula = '';
    this.showFormula = false;
    this.lastOperator = null;
    this.lastOperand = null;
   
  }

  clearEntry() {
    const match = this.rawDisplay.match(/(.*?)([\d.]+%?)$/);
  
    if (match) {
      const [, before, last] = match;
      // 式の先頭にマイナスがある場合に対処
      if (before === '' && last.startsWith('-')) {
        this.rawDisplay = '0';
      } else {
        this.rawDisplay = before || '0';
      }
    } else {
      this.rawDisplay = '0';
    }
  
    this.updateFormattedDisplays();
  }
  
// ==========================
// √ 計算処理
// ==========================
inputSquareRoot() {
  const match = this.rawDisplay.match(/(\d+(\.\d+)?%?|\.\d+)$/);
  if (!match) return;

  const lastNumber = match[0];
  const idx = this.rawDisplay.lastIndexOf(lastNumber);
  const parsed = parseFloat(lastNumber);

  if (isNaN(parsed) || parsed < 0) {
    this.display = 'Error';
    this.rawDisplay = '0';
    this.formula = '';
    this.showFormula = false;
    return;
  }

  const sqrtResult = Math.sqrt(parsed);
  const sqrtStr = this.roundTo8Decimals(sqrtResult.toString());

  // 数式内で√数を直接置き換える
  this.rawDisplay =
    this.rawDisplay.slice(0, idx) + sqrtStr + this.rawDisplay.slice(idx + lastNumber.length);

  this.updateFormattedDisplays();
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

    if (/[0-9]/.test(value) && this.rawDisplay.endsWith('%')) return;
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
    this.isClear = false;
  

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
    this.isClear = false;
    this.updateFormattedDisplays();
  }

  backspace() {
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.updateFormattedDisplays();
    // アニメーション
   
  }

  // ==========================
  // 表示更新・整形
  // ==========================
  updateFormattedDisplays() {
    this.display = this.formatDisplay(this.rawDisplay);
    this.formula = this.display;
    this.showFormula = true;
  
    setTimeout(() => {
      if (this.resultTextRef) {
        this.autoResizeFont(this.resultTextRef.nativeElement);
      }
      if (this.expressionTextRef) {
        this.autoResizeFont(this.expressionTextRef.nativeElement, 20, 10);
      }
    });
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
      const lastChar = this.rawDisplay.slice(-1);
      const operators = ['+', '-', '*', '/'];
  
      // ----- 演算子で終わってるとき → 直前の数値で演算 -----
      if (operators.includes(lastChar)) {
        const beforeOp = this.rawDisplay.slice(0, -1);
        const lastNumMatch = beforeOp.match(/(\d+(\.\d+)?)(?!.*\d)/);
        const lastNumber = lastNumMatch ? lastNumMatch[0] : '0';
  
        this.lastOperator = lastChar;
        this.lastOperand = lastNumber;
  
        const repeatedExpr = beforeOp + lastChar + lastNumber;
        const result = this.evaluateExpression(repeatedExpr);
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay = result;
        this.justCalculated = true;
        this.showFormula = true;
        return;
      }
  
      // ----- 通常の繰り返し演算（前回の operator/operand 使用） -----
      if (this.justCalculated && this.lastOperator && this.lastOperand) {
        const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
        const result = this.evaluateExpression(repeatedExpr);
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay = result;
        this.justCalculated = true;
        this.showFormula = true;
        return;
      }
  
      // ----- 通常計算 -----
      const result = this.evaluateExpression(this.rawDisplay);
      const formatted = this.formatNumber(result);
  
      // 最後の演算子とオペランドを記憶
      const match = this.rawDisplay.match(/([+\-*/])([^\+\-\*/]+)$/);
      this.lastOperator = match ? match[1] : null;
      this.lastOperand = match ? match[2] : null;
  
      this.display = formatted;
      this.formula = this.formatDisplay(this.rawDisplay) + ' =';
      this.rawDisplay = result;
      this.justCalculated = true;
      this.showFormula = true;
  
      if (this.resultTextRef) {
        this.resultTextRef.nativeElement.style.fontSize = '32px';
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

