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

  //element:フォントを調整したい　最大、最小
  autoResizeFont(element: HTMLElement, maxFontSize = 36, minFontSize = 16) {
  
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
　　　
  //保留
 　　isNumberEntered = false; 

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
  isClear = true; 

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

  clearLastInput() {//CEボタンの処理
     //rawdisplayが一文字以下（１つだけや空の場合）または０のとき削除すべきものがないので「０」のまま
  if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
    this.rawDisplay = '0';
    //rawdisplayが0や１文字以上の数字ではない場合、最後の１文字を削除
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
    const match = this.rawDisplay.match(/(.*?)(-?\d+(\.\d+)?%?)$/); //😊-も消えた！
  
    if (match) {
      const [, before, last] = match;
      // 前半が空で、後半がマイナスの場合は0にする
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


  //onBackOrClear() {
  //   if (this.rawDisplay.length <= 1 || this.rawDisplay === '0') {
  //     this.clearDisplay();
  //   } else {
  //     this.backspace();
  //   }
  // }

  // ==========================
  // 入力処理
  // ==========================
  handleInvertSign(lastChar: string, value: string): boolean {
    // 符号の反転（+ -9, * -9, / -9）だけは許容
    if (value === '-' && ['+', '*', '/'].includes(lastChar)) {
      this.rawDisplay += value;
      return true;
    }
  
    return false;
  }


  appendValue(value: string) {
    const operators = ['+', '-', '*', '/'];

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
  
    // 💛演算子の連続を防ぐ💛
    if (operators.includes(value)) {
      const lastChar = this.rawDisplay.slice(-1);　　　//🔥8÷→-したら8÷-になる
 

      // 直前が演算子で、今が演算子 → 符号の反転（符号付き数値）を許容
      if (operators.includes(lastChar)) {
    
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        return this.updateFormattedDisplays();
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
    this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
    this.updateFormattedDisplays();
    // アニメーション
   
  }

  // ==========================
  // 表示更新・整形
  // ==========================

  isAutoResizeEnabled = true;  // ← クラスに追加

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
  　　this.formula = this.buildFormulaDisplay(this.rawDisplay); 
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
    //マイナスの数値やパーセントを見やすい形に整える
    return value.replace(/-?\d+(\.\d+)?%?/g, (num) => {
      //パーセントの場合はパーセントを除いた数値を整形
      const isPercent = num.endsWith('%');
      const numberPart = isPercent ? num.slice(0, -1) : num;
      //整数と少数に分ける
      const [intPart, decimalPart] = numberPart.split('.');
      //整数を整形（3桁ごとにカンマを入れる）
      const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
      //少数がある場合は少数を整形
      const final = decimalPart ? `${formatted}.${decimalPart}` : formatted;
      //パーセントの場合はパーセントをつける
      return isPercent ? `${final}%` : final;
      //*と/を×と÷に変換
    }).replace(/\*/g, '×').replace(/\//g, '÷');
  }

  formatNumber(value: string): string {
    //小数点以下8桁まで整形
    const [intPart, decimal] = value.split('.');
    //整数を整形（3桁ごとにカンマを入れる）
    const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
    //少数がある場合は少数を整形
    if (decimal) {
      const trimmed = decimal.slice(0, 8).replace(/0+$/, '');
      return trimmed ? `${formatted}.${trimmed}` : formatted;
    }
    return formatted;
  }

  // ==========================
  // 計算処理
  // ==========================
  //計算結果を表示する
  calculateResult() {
    // 結果表示は固定サイズ
    this.isAutoResizeEnabled = false; 
    try {
      //計算後に数字が入力された場合は表示をクリア
      this.justCalculated = true;
      //最後の文字を取得
      const lastChar = this.rawDisplay.slice(-1);
      //演算子を取得
      const operators = ['+', '-', '*', '/'];




      //文字の最後が演算子の場合    
      if (operators.includes(lastChar)) {
        //演算子の前の文字を取得
        const beforeOp = this.rawDisplay.slice(0, -1);
        //演算子の前の数字を取得
        const lastNumMatch = beforeOp.match(/(√?-?\d+(\.\d+)?)(?!.*\d)/);
        //演算子の前の数字を取得
        const lastNumber = lastNumMatch ? lastNumMatch[0] : '0';
        //演算子と数字を取得　5＋＝5＋5
        this.lastOperator = lastChar;
        this.lastOperand = lastNumber;

        //演算子と数字を結合
        const repeatedExpr = beforeOp + lastChar + lastNumber;
        const result = this.evaluateExpression(repeatedExpr);
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';
        this.rawDisplay = result;
        this.showFormula = true;
  
    
        return;
      }
  
      //連続の＝に対応
      if (this.justCalculated && this.lastOperator && this.lastOperand) {
        const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
        const result = this.evaluateExpression(repeatedExpr);
        const formatted = this.formatNumber(result);
  
        this.display = formatted;
        this.formula = this.formatDisplay(repeatedExpr) + ' =';//🔥連続の時expressionに式は残したい
        this.rawDisplay = result;
        this.showFormula = true;
  
       
        return;
      }

     //🔥追加 パーセントが入力されている場合、数値を 100 で割ってから計算する
     if (this.rawDisplay.includes('%')) {
      // 剰余演算の場合（例: 98%7）
      if (/[0-9]%[0-9]/.test(this.rawDisplay)) {
        let expression = this.rawDisplay.replace(/(\d+(\.\d+)?)%(\d+)/g, (match, p1, p2, p3) => {
          // 剰余演算を行うために % を演算子に置き換える
          return `${parseFloat(p1)} % ${parseFloat(p3)}`;
        });
  

  // 計算を行う
  const result = this.evaluateExpression(expression);
  const formatted = this.formatNumber(result);

  // 結果を表示
  this.display = formatted;
  this.formula = this.formatDisplay(expression) + ' =';
  this.rawDisplay = result;
  this.showFormula = true;

  return;
}

 // パーセント演算（例: 10% → 0.1）として処理する場合
 let expression = this.rawDisplay.replace(/(\d+(\.\d+)?)%/g, (match, p1) => {
  // パーセントを数値として処理（0.1 のように）
  return (parseFloat(p1) / 100).toString();
});

// 計算を行う
const result = this.evaluateExpression(expression);
const formatted = this.formatNumber(result);

// 結果を表示
this.display = formatted;
this.formula = this.formatDisplay(expression) + ' =';
this.rawDisplay = result;
this.showFormula = true;

return;
}

  　　　//🔥追加

      let expression = this.rawDisplay;
     // ↓ ↓ ここで `%` を変換（だけ）する。今すぐ計算はしない！
      expression = expression.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
     //√の場合はMath.sqrt()を適用
      expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        return `Math.sqrt(${num})`;
      });
      

  
      const result = this.evaluateExpression(expression);
      const formatted = this.formatNumber(result);
  
      this.display = formatted;
      this.formula = this.formatDisplay(this.rawDisplay) + ' =';
      this.rawDisplay = result;
      this.showFormula = true;
  
      
    
    //エラーが発生した場合はエラー表示
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
  // √ の符号反転に対応 複数の場合は最後だけ  
  const sqrtMatches = Array.from(this.rawDisplay.matchAll(/(-?)√(\d+(\.\d+)?)/g));
  //√がある場合は最後の√の符号を反転    
  if (sqrtMatches.length > 0) {
    const lastMatch = sqrtMatches[sqrtMatches.length - 1];
    const fullExpr = lastMatch[0];
    const matchIndex = lastMatch.index!;
　//√の前につけたり外したり
    const toggled = fullExpr.startsWith('-√') 
      ? fullExpr.replace('-√', '√') 
      : fullExpr.replace('√', '-√');

    this.rawDisplay =
      this.rawDisplay.slice(0, matchIndex) +
      toggled +
      this.rawDisplay.slice(matchIndex + fullExpr.length);
    return;
  }

  // 最後の数値（括弧なし）を抽出
  const match = Array.from(this.rawDisplay.matchAll(/(-?\d*\.?\d+)(?!.*\d)/g)).pop();
  if (!match) return;

  const number = match[1];
  if (number === '0') return;

  const index = match.index!;
  let transformed;
 //マイナスの場合はマイナスを外す
  if (number.startsWith('-')) {
    transformed = number.slice(1);  // -9 → 9
  } else {
    transformed = `-${number}`;     // 9 → -9
  }

  this.rawDisplay =
    this.rawDisplay.slice(0, index) +
    transformed +
    this.rawDisplay.slice(index + number.length);
}
inputPlusMinus() {
  const lastChar = this.rawDisplay.charAt(this.rawDisplay.length - 1);

  // 数字の後にのみ反応する
  if (!/\d/.test(lastChar)) return;

  
  // 最後の数値を見つける
  const match = this.rawDisplay.match(/(-?\d+(\.\d+)?)(?!.*\d)/);
  if (!match) return;  // matchがなかったら何もせず終了

  const number = match[1];
  const index = this.rawDisplay.lastIndexOf(number);

   // 🔥追加🔒 0 または 先頭が 0 の数字は無視（例: "0123" や "0007"）
   if (number === "0" ||/^0\d+$/.test(number)) return;

  // 符号を反転する
  const newNumber = number.startsWith('-') ? number.slice(1) : '-' + number;

  // 反転後の文字列を構築
  this.rawDisplay =
    this.rawDisplay.slice(0, index) + newNumber + this.rawDisplay.slice(index + number.length);

  this.updateFormattedDisplays();  // 表示を更新
}

  inputPercent() {
    //パーセントが入力されている場合は処理中断
    if (this.rawDisplay.endsWith('%')) return;
    //数字が入力されている場合はパーセントをつける  
    const match = this.rawDisplay.match(/(\d+(\.\d+)?)(?!.*\d)/);
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

  // ==========================
  // 補助関数
  // ==========================
  applyOperation(a: string, op: string, b: string): string {
    //数字を取得
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    let result: number;
   //演算子によって計算を行う

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


