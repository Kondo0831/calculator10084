import { Component, HostListener, AfterViewInit,ViewChild,ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

type Operator = '×' | '÷' | '+' | '-';
const operators = ['+', '-', '*', '/'];

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

  //element:フォントを調整したい　最大、最小
  autoResizeFont(element: HTMLElement, maxFontSize = 36, minFontSize = 16) {
   // `isAutoResizeEnabled` が false の場合、処理を中止
   if (!this.isAutoResizeEnabled) return;
    //要素の親を取得
    //親がない場合は処理中断
    const parent = element.parentElement;
    if (!parent) return;
    
   //最初に最大フォントサイズでスタート
    let fontSize = maxFontSize;
   //フォントサイズを設定
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
  isSignToggle = false;  // ±（符号切替）の状態を管理
  lastOperator: string | null = null;
  lastOperand: string | null = null;
  isClear = true; 
  hasCalculated = false;
  isNumberEntered = false;
  isAutoResizeEnabled = true;  // ← クラスに追加
  

  //raw 加工前の式。戻り値は成形された式　string
  buildFormulaDisplay(raw: string): string {
    // 式の見た目だけ調整（0-8 → -8 にする）←これどこで0-8している？
    const simplified = raw.replace(/^0\-/, '-'); 
    //成形した文字列をさらにthisformatDisplay()に渡している
    //formatDisplayは数字の桁区切りや表示調整を行う
    return this.formatDisplay(simplified);
  }
  
  // ==========================
  // 初期フォーカス制御
  // ==========================
  //これがあるとキーボード入力が使えるようになる
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
     //押されたキーを取得
    const key = event.key;
    //キーをぼたんの値に変換//
    const buttonKey = this.mapKeyToButton(key);
    //ボタンの値がない場合は処理中断
    if (!buttonKey) return;
    //DeleteキーでCEの動作を行う
    if (key === 'Delete') {
      this.clearEntry(); 
      return;
    }
  
    this.handleButtonAction(buttonKey); // それ以外は共通の処理を呼び出し
  }
 //ボタンを押したときの処理
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
    //ボタンを押したときのハイライト
    this.highlightKey(key); 
    //バイブレーション ←いる？
    if (navigator.vibrate) navigator.vibrate(10);
    //ボタンを押したときの処理
    const action = this.mapButtonToAction(key);
    action();
  }
  
  
//ボタンを押したときのハイライト（見た目）
  highlightKey(key: string) {
    //押されたキーに対応する＜button＞要素を取得
    const btn = document.querySelector(`button[data-key="${key}"]`) as HTMLElement;
    //ボタンがある場合はハイライトを追加
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
      case '-': return '−';  // 演算の '-' を返す
      
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
      '±': () => this.inputPlusMinus(value),
      '←': () => this.backspace(),
      'C': () => this.clearDisplay(),
      'CE': () => this.clearEntry(), // CEボタンを追加
      '√': () => this.inputSquareRoot(), // 追加された処理
      
    };
    // デフォルトは appendValue
    return actions[value] || (() => this.appendValue(value));
  }

 

  clearDisplay() {
    // 全ての入力をクリア
    this.rawDisplay = '0'; // 計算結果の表示を初期化
    this.display = '0'; // 表示内容も初期化
    this.formula = ''; // 式の履歴もクリア
    this.showFormula = false; // 式表示を無効化
    this.lastOperator = null; // 最後の演算子もクリア
    this.lastOperand = null; // 最後のオペランドもクリア
    this.justCalculated = false; // 計算後のフラグもリセット
    this.isClear = false;  // クリアフラグをリセット
    this.resetHistory(); // 計算履歴をリセットするメソッド
  　this.updateFormattedDisplays();  // 表示更新

  }

  resetHistory() {
    //最後の演算子をクリア
    this.lastOperator = null;
    //最後の数字をクリア
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
// √ 計算処理
// ==========================
inputSquareRoot() {
  if (this.rawDisplay === '0' || this.rawDisplay === '') return;

  const match = this.rawDisplay.match(/(√-?\d+(\.\d+)?%?|√\.\d+|-?\d+(\.\d+)?%?|\.\d+)$/);
  if (!match) return;

  const matchedText = match[0];
  const idx = this.rawDisplay.lastIndexOf(matchedText);

  // すでに√がついている場合、外して計算する
  if (matchedText.startsWith('√')) {
    const withoutSqrt = matchedText.replace(/^√/, '');
    let parsed = parseFloat(withoutSqrt);
    if (withoutSqrt.endsWith('%')) {
      parsed = parseFloat(withoutSqrt) / 100;
    }

    const result = Math.sqrt(parsed);

    // √の中がマイナスだった場合エラー
    if (isNaN(result)) {
      this.display = '無効な計算です';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
      return;
    }

    this.rawDisplay = this.rawDisplay.slice(0, idx) + withoutSqrt;
    this.display = this.roundTo8Decimals(result.toString());
    this.formula = this.rawDisplay + ' =';
    this.showFormula = true;
    this.updateFormattedDisplays();
    return;
  }

  // 新たに√をつける
  let parsed = parseFloat(matchedText);
  if (matchedText.endsWith('%')) {
    parsed = parsed / 100;
  }

  // 数字の前にマイナスがある場合はOK
  if (this.rawDisplay.includes('-') && !this.rawDisplay.startsWith('-√')) {
    // -98のようなケース、√をつけてもOK
    if (this.rawDisplay.includes('-') && matchedText.startsWith('-')) {
      this.rawDisplay = this.rawDisplay.slice(0, idx) + `√${matchedText}`;
      const sqrtResult = Math.sqrt(parsed);
      this.display = this.roundTo8Decimals(sqrtResult.toString());
      this.formula = this.rawDisplay + ' =';
      this.showFormula = true;
      this.updateFormattedDisplays();
      return;
    }
  }

  // √の中がマイナスだったら即エラー
  if (parsed < 0) {
    this.display = 'Error';
    this.rawDisplay = '0';
    this.formula = '';
    this.showFormula = false;
    return;
  }

  // 普通の計算処理
  this.rawDisplay = this.rawDisplay.slice(0, idx) + `√${matchedText}`;
  const sqrtResult = Math.sqrt(parsed);
  this.display = this.roundTo8Decimals(sqrtResult.toString());
  this.formula = this.rawDisplay + ' =';
  this.showFormula = true;
  this.updateFormattedDisplays();
}
  appendValue(value: string) {

    const operators = ['+', '−', '*', '/'];
  

   //フォントサイズを調整する
    this.isAutoResizeEnabled = true; // 入力開始時にフォント調整を再有効化
    //数字や小数点が入力されていて、かつ括弧が閉じられている場合は処理中断
    if (/[0-9.]/.test(value) && this.rawDisplay.endsWith(')')) return;
    //数字が入力されていて、かつパーセントが入力されている場合は処理中断
    if (/[0-9]/.test(value) && this.rawDisplay.endsWith('%')){      //←😊解決　
     // パーセントの後に数字が続く場合は演算を実行する
     this.rawDisplay += value;
     this.updateFormattedDisplays();  // 演算を実行
     return;
   }
  // ✅ justCalculated の処理はここでまとめて行う
　　if (this.justCalculated) {
  　　　this.justCalculated = false;

    // ✅ justCalculated の直後に小数点が来たら → 0. に
    
      if (value === '.') {
        this.rawDisplay = '0.';  // ✅ 小数点始まりを 0. に
        this.display = '0.';
        this.justCalculated = false;
        this.updateFormattedDisplays(); // 表示更新も忘れずに
        return;
      }
  
      if (/[0-9]/.test(value)) {
        this.rawDisplay = '';
        this.display = '';
        this.justCalculated = false;
      }

    }



  // ✅ justCalculated の直後に演算子が来たら → 計算結果を使って続ける（ここを追加）
    if (this.justCalculated && operators.includes(value)) {
        this.justCalculated = false; // 続けて入力するためフラグオフ
    }
    //0が入力されていて、かつ小数点でない場合は空にする
    if (this.rawDisplay === '0' && value !== '.' && !operators.includes(value)) {
      this.rawDisplay = '';
    }
  
    // 小数点は1個まで
    if (value === '.' && /\.\d*$/.test(this.rawDisplay)) return;

  
    // 🔽🔽🔽 ここから桁数制限を適用 🔽🔽🔽
    const match = this.rawDisplay.match(/(?:^|[+\−*/])(-?\d*\.?\d*)$/);
    const currentBlock = match ? match[1] : '';
    const [intPart = '', decimalPart = ''] = currentBlock.split('.');
    const isDecimal = currentBlock.includes('.');
    const cleanInt = intPart.replace(/^[−]?0+(?!$)/, '');
    const totalDigits = cleanInt.length + decimalPart.length;
// 🔸演算子の直後かどうかを判定
const lastChar = this.rawDisplay.slice(-1);
const isAfterOperator = ['+', '−', '*', '/'].includes(this.rawDisplay.slice(-2, -1)) &&
                        /[0-9]/.test(value);


    if (/[0-9]/.test(value)) {
      if (!isDecimal && cleanInt.length >= 10) return;         // 整数部10桁まで
      if (isDecimal && decimalPart.length >= 8) return;        // 小数部8桁まで
      if (totalDigits >= 18) return;                           // 合計で18桁まで
    
  // 🔸演算子の直後でも、10桁制限を厳密に守る
  if (isAfterOperator && cleanInt.length >= 10) return;


}

    // 🔼🔼🔼 ここまで桁制限 🔼🔼🔼
   //🔥％は数字のあとだけ//
   if (value === '%') {
    const lastChar = this.rawDisplay.slice(-1);
  
    // % は直前が数字または ) のときのみ有効
    if (!/[0-9)]/.test(lastChar)) {
      return;
    }
  }
  
    // 💛演算子の連続を防ぐ💛
    if (operators.includes(value)) {
      const lastChar = this.rawDisplay.slice(-1); // 最後の文字を取得
      const lastTwoChars = this.rawDisplay.slice(-2); // 最後から2番目と最後の文字を取得
    
      // 直前が演算子で、今回も演算子 → 演算子を切り替え
      if (operators.includes(lastChar)) {
        // 演算子を置き換える（最後の演算子を新しい演算子に変更）
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        return this.updateFormattedDisplays(); // 表示を更新
      }
    
      // 演算子の連続を防ぐ（例えば、"++" や "--" は無効）
      if (lastTwoChars === '--' || lastTwoChars === '++' || lastTwoChars === '**' || lastTwoChars === '//') {
        return; // 何もしない
      }
    
      // 演算子の重複を防ぐ
      if (operators.includes(lastChar) && operators.includes(lastTwoChars.charAt(0))) {
        return; // 連続する演算子が2つ以上は入力できない
      }
   
      // 数字の後に演算子が来た場合
      this.rawDisplay += value;
      return this.updateFormattedDisplays();
    }
  
    // 通常の値の追加
    this.rawDisplay += value;
    this.isClear = false;
    this.updateFormattedDisplays();
  }

  backspace() {
    // パターン: 演算子（+, -, *, /）のあとに「マイナス付き数」が来てるとき（例: 98--76）
    const match = this.rawDisplay.match(/(.+[\+\−\*\/])(-\d+(\.\d+)?)$/);
  
    if (match) {
      // 「-数値」ごと削除（--76 の部分）
      this.rawDisplay = match[1]; // 98- だけ残す
    } else {
      // 通常の1文字削除
      this.rawDisplay = this.rawDisplay.slice(0, -1);
    }
  
    // 空や不完全な状態になったら初期化
    if (!this.rawDisplay || this.rawDisplay === '-' || this.rawDisplay === '√-' || this.rawDisplay === '√') {
      this.rawDisplay = '0';
    }
  
    this.updateFormattedDisplays();
    this.formula = ''; // 式表示は消す
  }



  // ==========================
  // 表示更新・整形
  // ==========================

  

　//rawdisplay（入力内容）をもとに、画面の表示を更新し、フォントサイズも変更
  updateFormattedDisplays() {
    //結果表示のフォントサイズを調整
    if (this.resultTextRef) {
      const resultEl = this.resultTextRef.nativeElement;
    //文字数に応じて自動でフォントサイズを調整
      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(resultEl);
      } else {
        resultEl.style.fontSize = ''; // まず空にしてリセット
        void resultEl.offsetWidth;    // ← reflow させてから再設定
        resultEl.style.fontSize = '32px'; // 固定サイズ
      }
    }
    //表示内容を更新
   this.display = this.formatDisplay(this.rawDisplay);
   //expression表示のフォントサイズを調整
  this.formula = '';
  //数式を表示するフラグ
  this.showFormula = true;

  //一応？
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

　//計算式を見やすい形に整える
  formatDisplay(value: string): string {
  // - を一時的にプレースホルダに置換（符号と演算子を区別するため）
  let temp = value.replace(/-/g, '−');

  // 数値やパーセントを整形（数値部分の - は __MINUS__ のまま）
  temp = temp.replace(/−?\d+(\.\d+)?%?/g, (num) => {
    const isPercent = num.endsWith('%');
    const numberPart = isPercent ? num.slice(0, -1) : num;
    const rawNumber = numberPart.replace('−', '-');
    const [intPart, decimalPart] = rawNumber.split('.');
    const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
    const final = decimalPart ? `${formatted}.${decimalPart}` : formatted;
    return isPercent ? `${final}%` : final;
  });

  // __MINUS__（残ってる演算子用）を全角マイナスに
  temp = temp.replace(/−/g, '-');

  // × と ÷ に変換
  return temp.replace(/\*/g, '×').replace(/\//g, '÷');
}
  

  formatNumber(value: string): string {
    const rounded = this.roundTo8Decimals(value); // ← ここで丸め
    const [intPart, decimal] = rounded.split('.');
    const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
    return decimal ? `${formatted}.${decimal}` : formatted;
  }

  // ==========================
  // 計算処理
  // ==========================
  //計算結果を表示する
  calculateResult() {
    
    this.isAutoResizeEnabled = false;

   
  
    try {
      this.justCalculated = true;
  
      // 演算子文字を正規化（この段階で−を-に変換しておく）
      this.rawDisplay = this.rawDisplay.replace(/−/g, '-');
  
      const lastChar = this.rawDisplay.slice(-1);
      const operators = ['+', '-', '*', '/']; // ← 全部半角に統一
  
      let expression = this.rawDisplay;

     
  
      // 演算子が最後にある場合の繰り返し計算処理
      if (operators.includes(lastChar)) {
        const beforeOp = this.rawDisplay.slice(0, -1);
        const lastNumMatch = beforeOp.match(/(√?-?\d+(\.\d+)?)(?!.*\d)/); // ← - に変更
        const lastNumber = lastNumMatch ? lastNumMatch[0] : '0';
  
        this.lastOperator = lastChar;
        this.lastOperand = lastNumber;
  
        const repeatedExpr = beforeOp + lastChar + lastNumber;
        const result = this.evaluateExpression(this.replacePercent(repeatedExpr));
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay =  this.roundTo8Decimals(result);
        this.showFormula = true;
        return;
      }

      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(document.getElementById('your-element-id')!); // 自動調整が有効な場合だけ
      }
  
      // 連続計算対応（＝連打）
      if (this.justCalculated && this.lastOperator && this.lastOperand) {
        const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
        const result = this.evaluateExpression(this.replacePercent(repeatedExpr));
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay = this.roundTo8Decimals(result);
        this.showFormula = true;
        return;
      }
      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(document.getElementById('your-element-id')!); // 自動調整が有効な場合だけ
      }

  
      // パーセント変換
      expression = this.replacePercent(expression);
  
      // √の処理
      expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        return `Math.sqrt(${num})`;
      });
  
      const result = this.evaluateExpression(expression);
      const formatted = this.formatNumber(result);

   
  
      this.display = formatted;
      this.formula = this.formatDisplay(this.rawDisplay) + ' =';
      this.rawDisplay = this.roundTo8Decimals(result);
      this.showFormula = true;

      if (this.isAutoResizeEnabled) {
        this.autoResizeFont(document.getElementById('your-element-id')!); // 自動調整が有効な場合だけ
      }
  
    } catch (e) {
      this.display = 'Error';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
      this.updateFormattedDisplays();
    }
  } 

  evaluateExpression(expression: string): string {
    try {
      // √の処理
      const replaced = expression.replace(/√(\d+(\.\d+)?)/g, (_: string, num: string) => {
        return Math.sqrt(parseFloat(num)).toString();
      });
  
      // 不正な "--" → "+" に変換
      const safeExpression = replaced.replace(/--/g, '+');
  
      // 計算を実行
      const rawResult = Function(`'use strict'; return (${safeExpression})`)();


  // 結果がNaNまたはInfinityの場合、エラーを返す
    if (typeof rawResult !== 'number' || isNaN(rawResult) || !isFinite(rawResult)) {
      return 'Error';
    }

    const [intPart, decPart = ''] = rawResult.toString().split('.');

    // 🔥 整数部が11桁を超えていたら Error を返す
    if (intPart.replace('-', '').length > 10) {
      return 'Error'; // ←桁数超え
    }

    return rawResult.toString();
  } catch (e) {
    return 'Error';
  }
}

   
    
     
  

  inputPlusMinus(value: string = '-') {
    const lastChar = this.rawDisplay.charAt(this.rawDisplay.length - 1);

    if (/\d/.test(lastChar) || lastChar === '%' || lastChar === '.' || lastChar === '√') {
      // √や通常数値にマッチ（最後の数値や√付き数値）
      const match = this.rawDisplay.match(/(-*√?-?\d+(\.\d+)?%?|\.\d+)(?!.*\d)/);
      if (!match) return;
  
      const term = match[0];
      const index = this.rawDisplay.lastIndexOf(term);
  
      // 0 または 0始まりの整数（ただし 0. はOK）は無視
      if (term === "0" || (/^0\d+$/.test(term) && !term.includes('.'))) return;
  
      // -が複数あっても先頭の符号をトグル（-√25 → √25、√25 → -√25）
      const isNegative = term.startsWith('-');
      const cleanTerm = term.replace(/^[-]+/, ''); // 先頭の - をすべて除去
  
      const toggledTerm = isNegative ? cleanTerm : '-' + cleanTerm;
  
      this.rawDisplay = this.rawDisplay.slice(0, index) + toggledTerm + this.rawDisplay.slice(index + term.length);
      this.updateFormattedDisplays();
      return;
    }
  
    // 最後が演算子だった場合（+ - * /）
    if (/[+\-*/]/.test(lastChar)) {
      const secondLastChar = this.rawDisplay.charAt(this.rawDisplay.length - 2);
  
      if (secondLastChar === ' ') {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        this.updateFormattedDisplays();
      }
    }
    






  }

    inputPercent() {
      //パーセントが入力されている場合は処理中断
      if (this.rawDisplay.endsWith('%')) return;

      // √の後には%を付けない
      if (this.rawDisplay.endsWith('√')) return;

      // 数値の直後でなければ % をつけない（例: "+%" はNG）
      const lastChar = this.rawDisplay.slice(-1);
      if (!/[0-9)]/.test(lastChar)) return;
      //数字が入力されている場合はパーセントをつける  
      const match = this.rawDisplay.match(/−?\d+(\.\d+)?(?!.*\d)/);
      if (!match) return;
      //数字を取得
      const lastNumber = match[0];
      //数字の位置を取得
      const idx = this.rawDisplay.lastIndexOf(lastNumber);
      //パーセントをつける
      const withPercent = lastNumber + '%';
      //数字の位置を取得
      this.rawDisplay =
        this.rawDisplay.slice(0, idx) + withPercent + this.rawDisplay.slice(idx + lastNumber.length);
      this.updateFormattedDisplays();

      
    }
    replacePercent(expression: string): string {
   // パーセントがついた数値同士を取り扱えるように変換
   expression = expression.replace(/(−?\d+(\.\d+)?)%/g, (match, p1) => {
    // パーセント演算を割り算に変換（例えば、10% → 0.1）
    return `(${p1} / 100)`;
  });

  // `−`（マイナス）の直後に `%` が続く場合の処理も調整
  expression = expression.replace(/(\d+(\.\d+)?)%(\d+(\.\d+)?)/g, (match, p1, _, p3) => {
    // パーセント同士の演算に変換
    return `(${p1} / 100) - (${p3} / 100)`; // 9%-6% を (9/100) - (6/100) に変換
  });

  return expression;
}
     


    // ==========================
    // 補助関数
    // ==========================
    //applyOperation(a: string, op: string, b: string): string {
      //数字を取得
     // const numA = parseFloat(a);
     //  const numB = parseFloat(b);
      //let result: number;
     //演算子によって計算を行う

     // switch (op) {
     //   case '+': result = numA + numB; break;
     //   case '-': result = numA - numB; break;
     //   case '*': result = numA * numB; break;
     //   case '/': if (numB === 0) throw new Error('Divide by zero'); result = numA / numB; break;
     //   default: throw new Error('Unknown operator');
     // }

     // 
     // return result.toFixed(8).replace(/\.?0+$/, '');
    //}
  
    roundTo8Decimals(value: string): string {
      const num = Number(value);
      if (isNaN(num)) throw new Error('Invalid number');
      return num.toFixed(8).replace(/\.?0+$/, '');
    }
  }
