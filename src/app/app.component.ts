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

  private round8(value: number): number {
    return parseFloat(value.toFixed(8));
  }

  // ==========================
  // 状態管理
  // ==========================
  display = '0';
  rawDisplay = '0';
  formula = '';
  evaluated = '';  // Add the evaluated property
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
  isError: boolean = false;
  isResultDisplayed = false;
  justOperatorInput = false;
  awaitingNextNumber = false;
  private operatorPressed = false;
 justEnteredOperator = true;
 justClearedEntry = false; // クラスプロパティとして追加
isFromPercent = false;
isFromRoot = false;


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
    // 最初に画面ができたとき、フォーカスを強制的にどこかに当てる
    document.body.focus(); // または this.renderer.selectRootElement('#main').focus();
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
      '←': () => this.backspace(),
      'C': () => this.clearDisplay(),
      'CE': () => this.clearEntry(), // CEボタンを追加
      
      
    };
    // デフォルトは appendValue
    return actions[value] || (() => this.appendValue(value));
  }  //element:フォントを調整したい　最大、最小
  
  

  backspace() {
    
 
    // 計算直後ならすべてクリア（数値入力と同じ動きに合わせる）
    if (this.justCalculated) {
      this.rawDisplay = '0';
      this.display = '0';
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.updateFormattedDisplays();
      return;
    }

    // √や%の結果だったら、直前の値だけを削除（CE動作）
if (this.isFromRoot || this.isFromPercent) {
  const match = this.rawDisplay.match(/(√?-?\d+(\.\d+)?%?|√?\.\d+|\d+(\.\d+)?%?)$/);
  if (match) {
    const idx = this.rawDisplay.lastIndexOf(match[0]);
    this.rawDisplay = this.rawDisplay.slice(0, idx);
    this.display = '0';
    this.updateFormattedDisplays();
  }
  this.isFromRoot = false;
  this.isFromPercent = false;
  return;
}

  
    // 🔸式入力前（＝を押してない状態）なら display を削るだけ
    if (!this.showFormula) {
      // 演算子が入力された直後はBackspaceを無反応にする
      if (/[+\−\*\/]$/.test(this.rawDisplay)) {
        return; // 末尾が演算子の場合、Backspaceを無効化
      }
  
      // カンマを一時的に削除
      let displayWithoutCommas = this.display.replace(/,/g, '');
  
      // 一桁の負の数（例えば"-8"）の場合はBackspace無効にする
      if (displayWithoutCommas.length === 2 && displayWithoutCommas.startsWith('-')) {
        this.display = '0';
      } else if (displayWithoutCommas.length > 1) {
        // 末尾1文字を削除
        displayWithoutCommas = displayWithoutCommas.slice(0, -1);
      } else {
        displayWithoutCommas = '0';
      }
  
      // rawDisplay も同期しておく（末尾から同じ桁数だけ削る）
      if (this.rawDisplay.length === 2 && this.rawDisplay.startsWith('-') && this.rawDisplay.length === displayWithoutCommas.length) {
        // 一桁の負の数（例えば"-8"）の場合は rawDisplay を削除しない
        this.rawDisplay = this.rawDisplay;
      } else {
        this.rawDisplay = this.rawDisplay.slice(0, -1) || '0';
      }
  
      // カンマを再度挿入
      this.display = this.formatNumber(displayWithoutCommas); // formatNumberはカンマを挿入する関数
  
      this.updateFormattedDisplays();
      return;
    }
  
    // 🔹ここから下は「＝を押したあと or 演算式がある場合」の処理
    // 演算子が末尾にある場合、Backspaceを無効化する
    if (/[+\−\*\/]$/.test(this.rawDisplay)) {
      return; // 末尾が演算子の場合、Backspaceを無効化
    }
  
    const signAndDigitMatch = this.rawDisplay.match(/(.+[\+\−\*\/])(√?-?\d)$/);
    if (signAndDigitMatch) {
      const toDelete = signAndDigitMatch[2];
      if (toDelete.length === 2 && toDelete.startsWith('-')) {
        // 例: "+-9" → "+" の処理
        this.rawDisplay = signAndDigitMatch[1];
      } else {
        // 末尾の数字だけ削除
        const shortened = toDelete.slice(0, -1);
        this.rawDisplay = signAndDigitMatch[1] + (shortened || '0');
      }
    } else {
      // 通常の1文字削除
      this.rawDisplay = this.rawDisplay.slice(0, -1);
    }
  
    // 空や不完全な状態の補正
    if (!this.rawDisplay || this.rawDisplay === '-' || this.rawDisplay === '√-' || this.rawDisplay === '√') {
      this.rawDisplay = '0';
    }
  
    // 表示更新
    this.display = this.formatDisplay(this.rawDisplay);
    this.formula = ''; // 式はクリア
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

 

  clearEntry() {
    if (this.display === '無効な計算です' || this.display.startsWith('エラー')) {
      this.clearDisplay();
      return;
    }
    
    if (this.justCalculated) {
      this.clearDisplay();
      this.updateFormattedDisplays();
      return;
    }
    
      // CE を押したときに「−」を「-」に変換
    this.rawDisplay = this.rawDisplay.replace(/−/g, '-');

 
    // 「rawDisplay が数字だけ」の場合 → 全体クリア
  if (/^-?\d*\.?\d*$/.test(this.rawDisplay)) {
      this.clearDisplay(); // ←←← ここ！スッキリ
    } else {
      // 最後の数字だけ消す（演算子は残す）
      this.rawDisplay = this.rawDisplay.replace(/([+\-×÷])[^+\-×÷]*$/, '$1');
      this.display = '0';
    }
  }
  

  resetHistory() {
  //最後の演算子をクリア
  this.lastOperator = null;
  //最後の数字をクリア
  this.lastOperand = null;
}


appendValue(value: string) {
 
  
  const operators = ['+', '−', '*', '/'];
   // ×10処理
  // 演算子記号の変換
  const formattedOp = value === '*' ? '×' :
  value === '/' ? '÷' : value;

  

  if (/^[0-9]$/.test(value)) {
    // 表示が11桁エラーだったらリセット
    if (this.display === '11桁以上の計算結果') {
      this.display = '';
      this.rawDisplay = '';
      this.formula = '';
      this.evaluated = '';
    }
  }
  if (value === '%') {
    if (!this.formula) return;

    if (this.rawDisplay.includes('*')) {
      this.rawDisplay = this.rawDisplay.replace('*', '×');
    }
  
    const lastChar = this.rawDisplay.slice(-1);
    if (!/[0-9)]/.test(lastChar)) return;
  
    // 最後の数値（負の数や小数も対応）を取得
    const match = this.rawDisplay.match(/-?\d+(\.\d+)?(?!.*\d)/);
    if (!match) return;
  
    const rawNum = match[0];
    const idx = this.rawDisplay.lastIndexOf(rawNum);
  
    // すでにパーセント化されてる（正負問わず）
    const isPercentApplied = /^-?0\.\d+$/.test(rawNum);
    if (isPercentApplied) return;
  
    const percentValue = (parseFloat(rawNum) / 100).toString();
    this.rawDisplay = this.rawDisplay.slice(0, idx) + percentValue;
  
    this.display = this.formatNumber(percentValue);
    this.formula = this.rawDisplay.slice(0, idx);
    this.isFromPercent = true; // ← 追加！
    this.updateFormattedDisplays();
    return;
  }

    // ⑫ パーセント記号の入力制御（数字の後以外は不可）
  if (value === '%') {
    const lastChar = this.rawDisplay.slice(-1);
    if (!/[0-9)\-]/.test(lastChar) && lastChar !== '%' && lastChar !== '√') return;
  }
  if (value === '%' && /^[0-9.]+$/.test(this.rawDisplay)) {
    // 数字と小数点だけの場合に追加の処理
    // ここでは、演算子を後に入力できるようにします。
    if (/[+\-*/]$/.test(this.rawDisplay)) {
      return;  // 演算子が最後に入力されていた場合は無効化しない
    }
    return;
  }
  // ① エラー状態 → 数字または小数点以外は無視、それ以外はリセット
  if (this.isError) {
    if (!/^\d$/.test(value) && value !== '.') return;
    this.clearDisplay(); 
    this.isError = false;
  }

 if (value === '±') {
  if (!this.display || this.display === '0') return;

  // √が含まれているかを確認
  const match = this.rawDisplay.match(/([+\-×÷])?(-?√?-?\d+(?:\.\d+)?)(%?)$/);
  if (match) {
    const rawNum = match[0];
    const idx = this.rawDisplay.lastIndexOf(rawNum);

    // %があればそのまま後ろに付け直す
    const hasPercent = this.rawDisplay.slice(idx + rawNum.length).startsWith('%');

    if (rawNum.startsWith('√')) {
      // √が含まれている場合
      if (rawNum.startsWith('-√')) {
        // 既に負の√がある場合は、正の√に変更
        this.rawDisplay = this.rawDisplay.slice(0, idx) + rawNum.replace('-√', '√');
      } else {
        // 正の√がある場合は、負の√に変更
        this.rawDisplay = this.rawDisplay.slice(0, idx) + '-' + rawNum;
      }
    } else {
      // √以外の場合の符号切り替え
      const toggled = -parseFloat(rawNum);
      const toggledStr = String(toggled);
      this.rawDisplay = this.rawDisplay.slice(0, idx) + toggledStr + (hasPercent ? '%' : '');
      this.display = this.formatNumber(toggledStr) + (hasPercent ? '%' : '');
    }

    this.updateFormattedDisplays();
  }

  return;
}

  // ③ √の処理
  if (value === '√') {
    if (this.rawDisplay === '0' || this.rawDisplay === '') return;
  
    const match = this.rawDisplay.match(/(-?√-?\d+(\.\d+)?%?|-?√\.\d+|-?\d+(\.\d+)?%?|\.\d+)$/);
    if (!match) return;
  
    const matchedText = match[0];
    const idx = this.rawDisplay.lastIndexOf(matchedText);
  
    if (this.rawDisplay.endsWith('%')) return;
  
    const hasNegativeRoot = matchedText.startsWith('-√');
    const hasRoot = matchedText.startsWith('√') || hasNegativeRoot;
  
    let innerText = matchedText.replace(/^√/, '');  // √を取り除く
  
    let evaluatedInner = this.replacePercent(innerText);
    let parsed = Number(this.evaluateExpression(evaluatedInner));
  
    // 負の数に対してエラーメッセージを表示
    if (parsed < 0) {
      this.display = '無効な計算です';
      this.isError = true;
      this.rawDisplay = this.rawDisplay.slice(0, idx) + matchedText;
      this.formula = this.rawDisplay.slice(0, idx) + '√' + matchedText;
      return;
    }
  
    // √を外す処理
    if (hasRoot) {
      this.rawDisplay = this.rawDisplay.slice(0, idx) + innerText;
      this.display = this.rawDisplay;
      this.showFormula = true;
      this.updateFormattedDisplays();
      return;
    }
  
    // √の式の追加
    const rootExpr = '√' + matchedText;
    const formulaBase = this.rawDisplay.slice(0, idx);
   
  
    let evaluatedRoot = this.evaluateExpression(this.replacePercent(rootExpr));
    const formattedRoot = this.formatNumber(String(evaluatedRoot));  // ← ここで...表示が有効！
  
    this.rawDisplay = formulaBase + evaluatedRoot;
    this.display = formattedRoot;//🔥
    this.isFromRoot = true; // ← 追加！
    this.updateFormattedDisplays();
    return;
  }
  
  // ④ %の処理
  
  // ⑤ フォントサイズ調整再有効化
  this.isAutoResizeEnabled = true;

  // ⑥ 無効な連結入力防止（%)の後ろに数字や.が続くなど）
  if (/[0-9.]/.test(value) && this.rawDisplay.endsWith(')')) return;
  if (/[0-9]/.test(value) && this.rawDisplay.endsWith('%')) return;
  if (this.rawDisplay.endsWith('%') && /^[0-9.√]$/.test(value)) return;
 
  // ⑦ justCalculated処理
  if (this.justCalculated) {
    
    this.justCalculated = false;
    this.formula = '';
    if (value === '.') {
      this.rawDisplay = '0.';  // 小数点処理
      this.display = '0.';  // 小数点処理
      this.updateFormattedDisplays();
      return;
    }
    if (/[0-9]/.test(value)) {
      this.rawDisplay = '';
      this.display = '';
    }
  }

  // ⑧ justCalculated直後に演算子が来た場合は続けて計算可能に
  if (this.justCalculated && operators.includes(value)) {
    this.justCalculated = false;
  }

  // ⑨ 「0」の処理：0のあとに数字が続くときはクリア（例：02 → 2）
  if (this.rawDisplay === '0' && value !== '.' && !operators.includes(value)) {
    this.rawDisplay = '';
  }

  if (value === '.') {
  
    const lastChar = this.rawDisplay.slice(-1);
    const isAfterOperator = ['+', '−', '*', '/', '×', '÷'].includes(lastChar);
  
    const match = this.rawDisplay.match(/(?:^|[+\−*/×÷])(-?\d*\.?\d*)$/);
    const currentBlock = match ? match[1] : '';
  
  
    if (currentBlock.includes('.')) return;
  
    if (!this.rawDisplay || isAfterOperator) {
      this.rawDisplay += '0.';  // 演算子の後や空の状態で「0.」を追加
      this.display = '0.'; // 表示にも「0.」
    } else {
      this.rawDisplay += '.';  // 通常の入力で小数点追加
      this.display += '.'; // 表示にも追加
    }
  
    console.log('✅ 入力後の rawDisplay:', this.rawDisplay);
    console.log('✅ 入力後の display:', this.display);
    this.updateFormattedDisplays();  // 表示更新
    return;
  }
  // ⑪ 桁数制限（整数10、小数8、合計18桁）
  const match = this.rawDisplay.match(/(?:^|[+\−*/])(-?\d*\.?\d*)$/);
  const currentBlock = match ? match[1] : '';
  const [intPart = '', decimalPart = ''] = currentBlock.split('.');
  const isDecimal = currentBlock.includes('.');
  const cleanInt = intPart.replace(/^[−]?0+(?!$)/, '');
  const totalDigits = cleanInt.length + decimalPart.length;
  const isAfterOperator = ['+', '−', '*', '/'].includes(this.rawDisplay.slice(-2, -1)) &&
                          /[0-9]/.test(value);

  if (/[0-9]/.test(value)) {
    if (!isDecimal && cleanInt.length >= 10) return;
    if (isDecimal && decimalPart.length >= 8) return;
    if (totalDigits >= 18) return;
    if (isAfterOperator && cleanInt.length >= 11) return;
  }

  if (operators.includes(value)  || value === '√') {
    console.log('演算子が押された時の rawDisplay:', this.rawDisplay);
    console.log('演算子が押された時の formula:', this.formula);
    const lastChar = this.rawDisplay.slice(-1);
    const lastTwoChars = this.rawDisplay.slice(-2);

    console.log('最後の1文字:', lastChar);
    console.log('最後の2文字:', lastTwoChars);
  
    // 演算子が続く場合の処理
    if (operators.includes(lastChar)) {
      this.rawDisplay = this.rawDisplay.slice(0, -1) + value;

      const formattedOp = value === '*' ? '×' :
                          value === '/' ? '÷' : value;
  
      // formulaも演算子だけを更新（数字部分はそのまま）
      this.formula = this.formula.replace(/[+\−*/÷×√%]$/, '') + formattedOp;
  
      
      return this.updateFormattedDisplays();
    }
    
  
    // 二重演算子や重複する記号を防止
    if (lastTwoChars === '--' || lastTwoChars === '++' || lastTwoChars === '**' || lastTwoChars === '//') {
      return;
    }
  
    if (operators.includes(lastChar) && operators.includes(lastTwoChars.charAt(0))) {
      return;
    }
  
    
  // 演算子や記号の処理（修正後）
try {
  const evaluated = this.evaluateExpression(this.replacePercent(this.rawDisplay));
  if (this.display === '11桁以上の計算結果') {
    return; // 何もしない
  }
  if ((Number(value))) {
    if (this.display === '11桁以上の計算結果') {
    this.display = '';  // 表示をリセット
    this.rawDisplay = ''; // 生の入力もリセット
    this.formula = ''; // 数式もリセット
    this.evaluated = ''; // 評価済み式もリセット
  }
}

// もし計算結果がエラーでなければ
if (evaluated !== 'エラー') {
    
  // 整数部分の桁数チェック（整数部分が11桁以上なら桁エラー）
  const matches = [...evaluated.matchAll(/-?\d+(\.\d+)?/g)];

  if (matches.length > 0) {
    const lastNumStr = matches[matches.length - 1][0]; // 最後の数値
    const integerPart = lastNumStr.split('.')[0].replace('-', ''); // 小数点前、符号なし
    
    if (integerPart.length > 10) { // 整数部分が11桁以上ならエラー
      this.display = '11桁以上の計算結果';
      this.formula = '';
      this.rawDisplay = '';
      return this.updateFormattedDisplays();
    }
  }

  // 評価結果をフォーマット
  const formatted = this.formatNumber(evaluated);
  this.display = formatted;
  this.formula = formatted + formattedOp;
  this.rawDisplay = String(evaluated) + value;

  return this.updateFormattedDisplays();
}
} catch (e) {
  // 万が一評価エラーでも fallback
  this.formula = this.display + formattedOp;
  this.rawDisplay += value;
  this.display = '';
  return this.updateFormattedDisplays();
}
  }
  // 11桁以上の計算結果が表示されている場合に、演算子が押された時の処理

  // 数字や記号（％、√）が押された場合
  if (/[0-9±%√]/.test(value)) {
    // 数字や記号（％、√）が入力されたとき
    if (/[0-9]/.test(value)) {
      const lastChar = this.rawDisplay.slice(-1);
  
      // 演算子直後に数字入力された場合は display を初期化して新しい数値に
      if (operators.includes(lastChar)) {
        this.display = this.formatNumber(value); // 新しい数字（カンマ付き表示）
      } else if (this.display === '0') {
        // 既に「0」が表示されている場合はそのまま新しい数値に
        this.display = this.formatNumber(value);
      } else {
        // 数字を結合して表示を更新
        const newDisplayValue = this.display.replace(/,/g, '') + value; // カンマ除去して結合
        this.display = this.formatNumber(newDisplayValue); // カンマ付き＋丸め対応で再表示
      }
      this.rawDisplay += value; // rawDisplayにも値を追加
    }
    
    


// '%'が入力された場合の処理
if (value === '%') {
  // -や演算子含む式から、直前の数値（小数含む）を取り出す
  const match = this.rawDisplay.match(/(-?\d+(\.\d+)?)(?!.*\d)/);
  if (match) {
    const rawNum = match[0];
    const idx = this.rawDisplay.lastIndexOf(rawNum);

    // 数値を 1/100 に変換
    const percentValue = (parseFloat(rawNum) / 100).toString();

    // rawDisplay の数値部分を置換
    this.rawDisplay = this.rawDisplay.slice(0, idx) + percentValue;

      // もし直前の演算子が * だった場合に × に変更
   

    // display を更新（置換した数値だけを表示）
    this.display = this.formatNumber(percentValue);

    // formula を更新（演算子など含めた全体）
    this.formula = this.rawDisplay.slice(0, idx); // 演算子を残すのみ

    this.updateFormattedDisplays();
  }
}
  }
}

  normalizeTrailingDots(expr: string): string {
    return expr
    // 末尾が `.` で終わる数字に `.0` を補う（例：9. → 9.0）
    .replace(/(\d+)\.(?!\d)/g, '$1.0')
    // `.` から始まる数字を `0.` に補正（例：+.5 → +0.5、*.3 → *0.3）
    .replace(/(^|[+\-*/\(])\.([0-9])/g, '$10.$2');
}


　//rawdisplay（入力内容）をもとに、画面の表示を更新し、フォントサイズも変更
updateFormattedDisplays() {
  // 結果表示のフォントサイズを固定（自動リサイズなし）
  if (this.resultTextRef) {
    const resultEl = this.resultTextRef.nativeElement;
    resultEl.style.fontSize = '';
    void resultEl.offsetWidth;
    resultEl.style.fontSize = '32px'; // 固定サイズ
  }

  // もし display が空なら、次の入力を待つ状態として表示をクリア
  if (this.display === '') {
    this.display = ''; // 空に設定（※実際には何も表示しない状態）
  }
}

  // エラー状態の場合は display を更新しない
  //if (this.display !== '無効な計算です') {
  //  this.display = this.formatDisplay(this.rawDisplay);
  //}


  // 式の表示に関しては、エラー時にも残したいかどうかで分岐
  //if (this.display !== '無効な計算です') {
  //  this.showFormula = true;
  //}

  // this.formula をここで '' にするのは避けた方がいいかも
  // ※ catch の中で消すなら OK、ここでは常にクリアしない
  
  //一応？

　//計算式を見やすい形に整える
formatDisplay(value: string): string {
  // - を一時的にプレースホルダに置換（符号と演算子を区別するため）
  let temp = value.replace(/-/g, '−');

  // 数値やパーセントを整形（数値部分の - は __MINUS__ のまま）
  temp = temp.replace(/−?\d+(\.\d+)?%?/g, (num) => {
    const isPercent = num.endsWith('%');
    const numberPart = isPercent ? num.slice(0, -1) : num;

    // ここで formatNumber を呼び出して、整形した数値を取得
    const formattedNumber = this.formatNumber(numberPart); // ここで formatNumber 呼び出し

    return isPercent ? `${formattedNumber}%` : formattedNumber;
  });

  // __MINUS__（残ってる演算子用）を全角マイナスに
  temp = temp.replace(/−/g, '-');

  // × と ÷ に変換
  return temp.replace(/\*/g, '×').replace(/\//g, '÷');
}
  
// 数値を整形（小数点以下8桁まで表示）　number型は直接いく。文字列を渡す場合、number型に直してから渡す


calculateResult(): void {
  this.isResultDisplayed = true;

  


  // 無効な条件（再計算不要、エラー状態など）
  if (
    (this.justCalculated && !this.lastOperator) ||
    this.display.includes('エラー') ||
    this.display === '無効な計算です' ||
    this.display === '11桁以上の計算結果'
  ) return;

  this.justCalculated = true;
  const prevExpression = this.formatDisplay(this.normalizeTrailingDots(this.rawDisplay)) + ' =';

  try {



    this.rawDisplay = this.rawDisplay.replace(/−/g, '-');
    const lastChar = this.rawDisplay.slice(-1);
    const operators = ['+', '-', '*', '/'];
    let expression = this.rawDisplay;

    // ===== 演算子で終わっている場合の繰り返し計算 =====
    if (operators.includes(lastChar)) {
      const beforeOp = this.rawDisplay.slice(0, -1);
      const lastNumMatch = beforeOp.match(/(√?-?\d+(?:\.\d+)?%?)(?!.*\d)/);
      const lastNumber = lastNumMatch ? lastNumMatch[0] : '0';

      this.lastOperator = lastChar;
      this.lastOperand = lastNumber;

      const repeatedExpr = beforeOp + lastChar + lastNumber;
      const result = this.evaluateExpression(this.replacePercent(repeatedExpr));
      console.log('📥 Raw result before formatting (repeatedExpr):', result);
      const formatted = this.formatNumber(result);
      console.log('📤 Formatted result (repeatedExpr):', formatted);
       // 🔥ログを追加して確認
       console.log('Result after formatNumber (repeatedExpr):', formatted);

      

      if (this.isOverDigitLimit(formatted)) {
        this.handleDigitOverflow(prevExpression);
        return;
      }

      this.display = formatted;
      this.formula = this.formatDisplay(this.normalizeTrailingDots(repeatedExpr)) + ' =';
      this.rawDisplay = String(result);
      this.showFormula = true;
      return;
    }

    // ===== 「＝」連打の繰り返し計算 =====
    if (this.justCalculated && this.lastOperator && this.lastOperand) {
      const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
      const result = this.evaluateExpression(this.replacePercent(repeatedExpr));
      console.log('📥 Raw result before formatting (repeatedExpr):', result);
      const formatted = this.formatNumber(result);
      console.log('📤 Formatted result (repeatedExpr):', formatted);
      // 🔥ログを追加して確認
      console.log('Result after formatNumber (repeatedExpr):', formatted);

      if (this.isOverDigitLimit(formatted)) {
        this.handleDigitOverflow(prevExpression);
        return;
      }

      this.display = formatted;
      this.formula = this.formatDisplay(this.normalizeTrailingDots(repeatedExpr)) + ' =';
      this.rawDisplay = String(result);
      this.showFormula = true;
      return;
    }

    // ===== パーセント・平方根の処理 =====
    expression = this.replacePercent(expression);
    expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => `Math.sqrt(${num})`);
    const evalExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');

    // ===== 表示用の数式（customFormula）の生成 =====
    let customFormula = this.formatDisplay(this.normalizeTrailingDots(this.rawDisplay)) + ' =';

    const lastOp = this.extractLastOperation(this.rawDisplay);
    if (lastOp) {
      const { before, op, after } = lastOp;
      const evaluatedBefore = this.evaluateExpression(
        this.replacePercent(before)
          .replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
            console.log("Handling square root:", num);
            const rawSqrt = Math.sqrt(parseFloat(num));
            return rawSqrt.toString();
          })
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
      );

      if (evaluatedBefore !== 'エラー') {
        customFormula = `${this.formatNumber(evaluatedBefore)} ${op} ${this.formatDisplay(after)} =`;
      }
    }

    // ===== ゼロ除算チェック =====
    if (evalExpression.includes('/0')) {
      throw new Error('無効な計算です');
    }

    const result = this.evaluateExpression(evalExpression);
    //🔥
    console.log('Result after evaluateExpression:', result);
    const formatted = this.formatNumber(result);


     // 🔥ログを追加して確認
     console.log('Result after formatNumber (final):', formatted);


    if (this.isOverDigitLimit(formatted)) {
      this.handleDigitOverflow(prevExpression);
      return;
    }

    // ===== 結果と式の表示 =====
    this.display = formatted;
    this.formula = customFormula.replace(/\*/g, '×').replace(/\//g, '÷');
    this.rawDisplay = String(result);
    this.showFormula = true;

  } catch (e) {
    this.display = '無効な計算です';
    this.isError = true;
    this.rawDisplay = '';
    this.formula = prevExpression;
    this.showFormula = false;
    this.updateFormattedDisplays();
  }

  setTimeout(() => {
    if (!this.isError && this.resultTextRef) {
      // フォーカス処理など必要があればここに
    }
  });
}

// ===== 桁数制限チェック =====
private isOverDigitLimit(formatted: string): boolean {
  const intDigits = formatted.split('.')[0].replace(/,/g, '').replace('-', '').length;
  return intDigits > 10;
}

// ===== 桁数超過時の処理共通化 =====
private handleDigitOverflow(prevExpression: string): void {
  this.display = '11桁以上の計算結果';
  this.isError = true;
  this.rawDisplay = '';
  this.formula = prevExpression;
  this.showFormula = true;
}

// ===== 最後の演算を安全に抽出する関数（分離ロジック） =====
private extractLastOperation(expr: string): { before: string; op: string; after: string } | null {
  let i = expr.length - 1;
  let after = '';

  while (i >= 0) {
    const char = expr[i];
    after = char + after;
    if (/[+\-*/]/.test(char) && i !== 0) {
      const prevChar = expr[i - 1];
      if (!/[+\-*/]/.test(prevChar)) {
        const before = expr.slice(0, i);
        return { before, op: char, after: after.slice(1) };
      }
    }
    i--;
  }
  return null;
}
convertExponentialToDecimal(expStr: string): string {
  const num = Number(expStr);
  if (!Number.isFinite(num)) return 'エラー';

  const sign = num < 0 ? '-' : '';
  const [base, exp] = Math.abs(num).toExponential().split('e');
  const exponent = parseInt(exp, 10);

  let [intPart, decPart = ''] = base.split('.');
  const digits = intPart + decPart;

  if (exponent >= 0) {
    // 小数点を右にずらす
    const zeros = exponent - decPart.length;
    return sign + digits + (zeros > 0 ? '0'.repeat(zeros) : '');
  } else {
    // 小数点を左にずらす（0.000000...）
    const zeros = Math.abs(exponent) - 1;
    return sign + '0.' + '0'.repeat(zeros) + digits;
  }
}

  
formatNumber(value: number | string): string {
  let strValue = typeof value === 'number' ? value.toString() : value;
  
  
  // e表記（指数表記）を通常の文字列に変換
  if (/e/i.test(strValue)) {
    strValue = this.convertExponentialToDecimal(strValue);
  }

  const [intPartRaw, decPartRaw = ''] = strValue.split('.');
  const isNegative = intPartRaw.startsWith('-');
  const intPart = isNegative ? intPartRaw.slice(1) : intPartRaw;
  const formattedInt = (isNegative ? '-' : '') + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (!decPartRaw) return formattedInt;

  // 💡 小数部が9桁以上なら強制的に...表示（簡易版ルール追加）
  if (decPartRaw.padEnd(8, '0').length > 8) {
    return `${formattedInt}.${decPartRaw.slice(0, 7)}...`;
  }

  // 小数部が8桁以内なら末尾0の処理などを行って返す
  console.log('🔍 raw decimal part before trimming:', decPartRaw);
  let trimmedDec = decPartRaw;

  if (!/^0+$/.test(decPartRaw)) {
    trimmedDec = decPartRaw.replace(/0+$/, '');
  }

  console.log('🔍 trimmed decimal part:', trimmedDec);

  return trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;
}

  
  
  evaluateExpression(expression: string): string {
    console.log("Original expression:", expression);
    
    expression = expression.replace(/−/g, '-');
    // 数式中のカンマを取り除く
    expression = expression.replace(/,/g, ''); 
    console.log("After replacing '−' with '-' and removing commas:", expression);
  
    try {
      // √処理（既存と同じ）
      const negativeSqrtHandled = expression.replace(/-√(-?\d+(\.\d+)?)/g, (_, num) => {
        console.log("Handling negative square root:", num);
        return (-Math.sqrt(parseFloat(num))).toString();
      });
  
      const replaced = negativeSqrtHandled.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        console.log("Handling square root:", num);
        return Math.sqrt(parseFloat(num)).toString();
      });
  
      let safeExpression = replaced
      .replace(/\+\+/g, '+')    // + + → +
      .replace(/--/g, '+')      // - - → +
      .replace(/\+-/g, '-')      // + - → -
      .replace(/-\+/g, '-')      // - + → -
      .replace(/\s+/g, '');      // 不要な空白を取り除く

      // ↓ この一行を追加
      if (safeExpression.match(/^[-+]/)) {
      safeExpression = '0' + safeExpression;
      }
      
      console.log("After handling square roots and '--' replacement:", safeExpression);
  
      // 数字部分だけ抽出して、BigDecimal風に処理
      const operands = safeExpression.split(/[\+\-\*\/]/);
      const operators = safeExpression.match(/[\+\-\*\/]/g) || [];
      console.log("Operands:", operands);
      console.log("Operators:", operators);
  
      if (operands.length === 0) throw new Error('Empty expression');
  
      let result = operands[0];
      console.log('Evaluation Result:', result);
  
      for (let i = 0; i < operators.length; i++) {
        const op = operators[i];
        const next = operands[i + 1];
        console.log(`Processing: ${result} ${op} ${next}`);
  
        // 演算処理（文字列同士を小数で計算し、丸め）
        const res = this.calcAsString(result, op, next);
        result = res;
        console.log("Result after operation:", result);
      }
  
      return result;
    } catch (error) {
      console.error("Error during evaluation:", error);
      return 'エラー';
    }
  }

 
  // --- サブ関数：文字列同士の演算 ---
calcAsString(a: string, op: string, b: string): string {
  console.log('calcAsString:', a, op, b);
  console.log('calcBsString:', a, op, b);
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    let result: number;
  
    switch (op) {
      case '+':
        result = aNum + bNum;
        break;
      case '-':
        result = aNum - bNum;
        break;
      case '*':
        result = aNum * bNum;
        break;
      case '/':
        result = aNum / bNum;
        break;
      default:
        throw new Error('Unsupported operator');
    }
  
   

    console.log('Result after calcAsString:', result);
    return String(result); // 丸め・ゼロ削除などは一切せず、数値をそのまま文字列で返す
  }




ngOnInit() {
  this.display = '0';
  this.rawDisplay = '0';
  this.formula = '';
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
    }

