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

  autoResizeFont(element: HTMLElement, maxFontSize = 36, minFontSize = 16) {
    const parent = element.parentElement;
    if (!parent) return;
  
    let fontSize = maxFontSize;
    element.style.fontSize = fontSize + 'px';
  
    while (element.scrollWidth > parent.clientWidth && fontSize > minFontSize) {
      fontSize--;
      element.style.fontSize = fontSize + 'px';
    }
  }

 isNumberEntered = false; // Track if a number has been entered 
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
  // 数字が入力されていない場合は処理しない
  if (this.rawDisplay === '0' || this.rawDisplay === '') {
    return;
  }

  const match = this.rawDisplay.match(/(\d+(\.\d+)?%?|\.\d+)$/); // 数字を抽出
  if (!match) return;

  const lastNumber = match[0]; // 最後の数字を取得
  const idx = this.rawDisplay.lastIndexOf(lastNumber); // 数字の位置を取得

  let parsed = parseFloat(lastNumber);

  if (lastNumber.endsWith('%')) {
    // パーセントを数値に変換（90% -> 0.9）
    parsed = parsed / 100;
  }

  if (isNaN(parsed) || parsed < 0) {
    this.display = 'Error';
    this.rawDisplay = '0';
    this.formula = '';
    this.showFormula = false;
    return;
  }

  // √を付ける
  this.rawDisplay = this.rawDisplay.slice(0, idx) + `√${lastNumber}`;

  // √の計算
  const sqrtResult = Math.sqrt(parsed);
  const sqrtStr = this.roundTo8Decimals(sqrtResult.toString());

  this.display = sqrtStr;
  this.formula = this.rawDisplay + ' =';
  this.showFormula = true;

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

    this.isAutoResizeEnabled = true; // 入力開始時にフォント調整を再有効化
    if (/[0-9.]/.test(value) && this.rawDisplay.endsWith(')')) return;
    if (/[0-9]/.test(value) && this.rawDisplay.endsWith('%')) return;
  
    if (this.justCalculated && /[0-9.]/.test(value)) {
      this.rawDisplay = '';
      this.display = '';
      this.justCalculated = false;
    }
  
    if (this.rawDisplay === '0' && value !== '.' && !operators.includes(value)) {
      this.rawDisplay = '';
    }
  
    // 小数点は1個まで
    if (value === '.' && /\.\d*$/.test(this.rawDisplay)) return;
  
    // 🔽🔽🔽 ここから桁数制限を適用 🔽🔽🔽
    const match = this.rawDisplay.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
    const currentBlock = match ? match[1] : '';
    const [intPart = '', decimalPart = ''] = currentBlock.split('.');
    const isDecimal = currentBlock.includes('.');
    const cleanInt = intPart.replace(/^[-]?0+(?!$)/, '');
    const totalDigits = cleanInt.length + decimalPart.length;
  
    if (/[0-9]/.test(value)) {
      if (!isDecimal && cleanInt.length >= 10) return;         // 整数部10桁まで
      if (isDecimal && decimalPart.length >= 8) return;        // 小数部8桁まで
      if (totalDigits >= 18) return;                           // 合計で18桁まで
    }
    // 🔼🔼🔼 ここまで桁制限 🔼🔼🔼
  
    // 演算子の連続を防ぐ
    if (operators.includes(value)) {
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar)) {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        return this.updateFormattedDisplays();
      }
    }
  
    this.rawDisplay += value;
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

  isAutoResizeEnabled = true;  // ← クラスに追加
  updateFormattedDisplays() {
    if (this.resultTextRef) {
      const resultEl = this.resultTextRef.nativeElement;
      
      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(resultEl);
      } else {
        resultEl.style.fontSize = ''; // まず空にしてリセット
        void resultEl.offsetWidth;    // ← reflow させてから再設定
        resultEl.style.fontSize = '36px'; // 固定サイズ
      }
    }
    this.display = this.formatDisplay(this.rawDisplay);
  this.formula = this.buildFormulaDisplay(this.rawDisplay); // ← expression 表示用
  this.showFormula = true;

  setTimeout(() => {
    if (this.resultTextRef) {
      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(this.resultTextRef.nativeElement);
      } else {
        this.resultTextRef.nativeElement.style.fontSize = '36px'; // ← 固定サイズに戻す
      }
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
    this.isAutoResizeEnabled = false; // 結果表示は固定サイズ
    try {
      this.justCalculated = true;
      const lastChar = this.rawDisplay.slice(-1);
      const operators = ['+', '-', '*', '/'];
  
      if (operators.includes(lastChar)) {
        const beforeOp = this.rawDisplay.slice(0, -1);
        const lastNumMatch = beforeOp.match(/(√?-?\d+(\.\d+)?)(?!.*\d)/);
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
  
        this.updateFormattedDisplays(); // ✅ 必ず呼ぶ！
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
  
        this.updateFormattedDisplays(); // ✅ 忘れずに！
        return;
      }
  
      let expression = this.rawDisplay;
      expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        return `Math.sqrt(${num})`;
      });
      expression = expression.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
  
      const result = this.evaluateExpression(expression);
      const formatted = this.formatNumber(result);
  
      this.display = formatted;
      this.formula = this.formatDisplay(this.rawDisplay) + ' =';
      this.rawDisplay = result;
      this.showFormula = true;
  
      this.updateFormattedDisplays(); // ✅ 最後にもちゃんと！
    } catch (e) {
      this.display = 'Error';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
      this.updateFormattedDisplays();
    }
  }
  
  evaluateExpression(expr: string): string {
     // Handle percent conversion
  // パーセント記号を分母に100を付け加えて処理する
  expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Handle square root (√) conversion
  // √の後の数値にMath.sqrt()を適用する
  expr = expr.replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)');

  // Split the expression into tokens and evaluate
  const result = Function(`'use strict'; return (${expr})`)();

  // 結果を小数点以下8桁まで四捨五入して返す
  return this.roundTo8Decimals(result.toString());
}

invertSign() {
  // √ の符号反転に対応
  const sqrtMatches = Array.from(this.rawDisplay.matchAll(/(-?)√(\d+(\.\d+)?)/g));
  if (sqrtMatches.length > 0) {
    const lastMatch = sqrtMatches[sqrtMatches.length - 1];
    const fullExpr = lastMatch[0];
    const matchIndex = lastMatch.index!;

    const toggled = fullExpr.startsWith('-√') 
      ? fullExpr.replace('-√', '√') 
      : fullExpr.replace('√', '-√');

    this.rawDisplay =
      this.rawDisplay.slice(0, matchIndex) +
      toggled +
      this.rawDisplay.slice(matchIndex + fullExpr.length);
    return;
  }

  // 最後の数値または括弧付き数値を抽出
  const match = Array.from(this.rawDisplay.matchAll(/(\(?-?\d*\.?\d+\)?)(?!.*\d)/g)).pop();
  if (!match) return;

  const number = match[1];
  if (number === '0') return;

  const index = match.index!;
  let transformed;

  // トグル：括弧付き→外す、マイナス→括弧付け、普通→マイナス付け
  if (number.startsWith('(-') && number.endsWith(')')) {
    transformed = number.slice(2, -1);  // (-8) → 8
  } else if (number.startsWith('-')) {
    transformed = `(${number})`;       // -8 → (-8)
  } else if (number.startsWith('(') && number.endsWith(')')) {
    transformed = number.slice(1, -1); // (8) → 8
  } else {
    transformed = `(-${number})`;      // 8 → (-8)
  }

  this.rawDisplay =
    this.rawDisplay.slice(0, index) +
    transformed +
    this.rawDisplay.slice(index + number.length);
}

inputPlusMinus() {
  const lastChar = this.rawDisplay.charAt(this.rawDisplay.length - 1);

  // 数字や√の後にのみ反応
  if (/\d/.test(lastChar) || lastChar === '√') {
    this.invertSign();  // 符号反転を行う
  }

  // 特定の状態の場合（±を押した後など）再度反応しないようにする
  const lastTwoChars = this.rawDisplay.slice(this.rawDisplay.length - 2);
  if (lastTwoChars === "±") return;

  this.updateFormattedDisplays();  // 表示更新
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


