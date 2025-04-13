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

  autoResizeFont(element: HTMLElement, maxFontSize = 36, minFontSize = 19) {
    const parent = element.parentElement;
    if (!parent) return;
  
    let fontSize = maxFontSize;
    element.style.fontSize = fontSize + 'px';
  
    while (element.scrollWidth > parent.clientWidth && fontSize > minFontSize) {
      fontSize--;
      element.style.fontSize = fontSize + 'px';
    }
  }
  // M+ : 現在の表示値をメモリに加算
memoryAdd() {
  const current = parseFloat(this.rawDisplay);
  if (!isNaN(current)) {
    this.memoryValue += current;
  }
}

// M- : 現在の表示値をメモリから減算
memorySubtract() {
  const current = parseFloat(this.rawDisplay);
  if (!isNaN(current)) {
    this.memoryValue -= current;
  }
}

// MR : メモリの値を表示に反映
memoryRecall() {
  this.rawDisplay = this.memoryValue.toString();
  this.updateFormattedDisplays();
}

// MC : メモリをクリア
memoryClear() {
  this.memoryValue = 0;
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
  memoryValue: number = 0;  // メモリに保持する値
  sqrtActive: boolean = false;  // √が押された後かどうかのフラグ

  buildFormulaDisplay(raw: string): string {
    // 式の見た目だけ調整（0-8 → -8 にする）
    const simplified = raw.replace(/^0\-/, '-'); 
    return this.formatDisplay(simplified);
  }
  
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
      if (this.justCalculated) {
        // 「＝」ボタンを押した後の「CE」→ 完全リセット
        this.clearDisplay();  
      } else {
        // 通常の「CE」→ 現在の入力を削除
        this.clearEntry();  
      }
      return;
    }
  
    if (key === 'C') {
      this.clearDisplay();  // 「C」ボタンで完全なリセット
      return;
    }
  
    this.isClear = false;  // 「C」や「CE」以外の場合の処理
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
      'M+': () => this.memoryAdd(),
      'M-': () => this.memorySubtract(),
      'MR': () => this.memoryRecall(),
      'MC': () => this.memoryClear(),
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
    this.rawDisplay = '0'; // 計算結果の表示を初期化
    this.display = '0'; // 表示内容も初期化
    this.formula = ''; // 式の履歴もクリア
    this.showFormula = false; // 式表示を無効化
    this.lastOperator = null; // 最後の演算子もクリア
    this.lastOperand = null; // 最後のオペランドもクリア
    this.memoryValue = 0; // メモリもクリア
    this.justCalculated = false; // 計算後のフラグもリセット
    this.isClear = false;  // クリアフラグをリセット
    this.resetHistory(); // 計算履歴をリセットするメソッド

  this.updateFormattedDisplays();  // 表示更新
  }

  resetHistory() {
    this.lastOperator = null;
    this.lastOperand = null;
  }

  clearEntry() {
    if (this.justCalculated) {
      // ＝の後でCEが押された場合、完全にリセットする
      this.clearDisplay();  // Cボタンの動作に合わせる
    } else {
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
}
// ==========================
// √ 計算処理
// ==========================
inputSquareRoot() {
  const match = this.rawDisplay.match(/(\d+(\.\d+)?%?|\.\d+)$/); // Match the last number or fractional part
  if (!match) return;

  const lastNumber = match[0]; // The last number in the raw display
  const idx = this.rawDisplay.lastIndexOf(lastNumber); // Position of the number

  const parsed = parseFloat(lastNumber);
  if (isNaN(parsed) || parsed < 0) {
    this.display = 'Error';
    this.rawDisplay = '0';
    this.formula = '';
    this.showFormula = false;
    return;
  }

  // Replace the number with √x
  this.rawDisplay = this.rawDisplay.slice(0, idx) + `√${lastNumber}`;

  // Calculate the square root
  const sqrtResult = Math.sqrt(parsed);
  const sqrtStr = this.roundTo8Decimals(sqrtResult.toString());

  // Update displays
  this.display = sqrtStr;
  this.formula = this.rawDisplay + ' =';  // Show the expression with √
  this.showFormula = true;  // Show the formula

  // Update formatted displays
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
      // '0' の場合、'0'を削除して新しい値を追加
      this.rawDisplay = '';
    }
  
    if (value === '-' && this.rawDisplay === '0') {
      // もし '- ' が押されていて、表示が '0' の場合には '-'
      this.rawDisplay = '-';
      return this.updateFormattedDisplays();
    }

    if (value === '-' && /√[\d.]+$/.test(this.rawDisplay)) {
      const match = this.rawDisplay.match(/√[\d.]+$/);
      if (match) {
        const sqrtExpr = match[0];
        const idx = this.rawDisplay.lastIndexOf(sqrtExpr);
        this.rawDisplay =
          this.rawDisplay.slice(0, idx) + '-'+ sqrtExpr;
        return this.updateFormattedDisplays();
      }
    }
  
    this.isClear = false;
  
    // 数字や小数点の場合
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
  this.formula = this.buildFormulaDisplay(this.rawDisplay); // ← expression 表示用
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
      this.justCalculated = true;
      const lastChar = this.rawDisplay.slice(-1);
      const operators = ['+', '-', '*', '/'];
  
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
        this.showFormula = true;
        return;
      }
  
      if (this.justCalculated && this.lastOperator && this.lastOperand) {
        const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
        const result = this.evaluateExpression(repeatedExpr);
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay = result;
        this.showFormula = true;
        return;
      }
  
      let expression = this.rawDisplay;
  
      // √ の処理：√x を Math.sqrt(x) に変換
      expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        return `Math.sqrt(${num})`;
      });
  
      // パーセントを除算に変換（例: 50% → (50/100)）
      expression = expression.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
  
      const result = this.evaluateExpression(expression);
      const formatted = this.formatNumber(result);
  
      this.display = formatted;
      this.formula = this.formatDisplay(this.rawDisplay) + ' =';
      this.rawDisplay = result;
      this.showFormula = true;
    } catch (e) {
      this.display = 'Error';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
    }
  }
  
    
  evaluateExpression(expr: string): string {
    // Replace the √ with Math.sqrt for calculation
  expr = expr.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
    return `Math.sqrt(${num})`;
  });

  // Handle percent conversion
  expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Split the expression into tokens and evaluate
  const result = Function(`'use strict'; return (${expr})`)();
  return this.roundTo8Decimals(result.toString());
}

  // ==========================
  // ± / % 入力
  // ==========================
  inputPlusMinus() {
    // 現在表示されている rawDisplay が 0 または 空の場合は、何もせず終了
    if (this.rawDisplay === '0' || this.rawDisplay === '') {
      this.rawDisplay = '0';  // もし何も表示されていなければ、0を設定
      this.updateFormattedDisplays();
      return;
    }
  
    // 最後の入力が演算子の場合、「-」を入力する
    const lastChar = this.rawDisplay.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
      this.rawDisplay += '-';
      this.updateFormattedDisplays();
      return;
    }
  
    // 数字部分を抽出して符号反転処理を行う
    const match = this.rawDisplay.match(/(-?\d*\.?\d+%?)(?!.*\d)/);
    if (!match) return;  // 数字が見つからなければ終了
  
    const number = match[1];
    const index = this.rawDisplay.lastIndexOf(number);
  
    // 符号を反転させる処理
    const stripped = number.replace(/^[-]+/, '');
    const toggled = number.startsWith('-') ? stripped : '-' + stripped;
  
    // rawDisplayに新しい値をセットして更新
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

