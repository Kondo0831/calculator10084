import { Component, HostListener, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

type Operator = '×' | '÷' | '+' | '-';
const operators = ['+', '-', '*', '/'];

/**
 * 分数を表すインターフェース
 */
interface Fraction {
  numerator: bigint;    // 分子
  denominator: bigint;  // 分母
}

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
  @ViewChild('calculator') calculatorRef!: ElementRef;

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
  private justPressedRoot = false;
  shouldShowDots = false;

  constructor() {
    this.display = '0';
    this.rawDisplay = '0';
    this.formula = '';
  }

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
    this.calculatorRef.nativeElement.focus();
  }
  focusBack(event: Event) {
    this.calculatorRef.nativeElement.focus();
  }



  // ==========================
  // キーボード操作
  // ==========================
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
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
  onButtonClick(value: string): void {
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

      setTimeout(() => {
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
    if (/[+\-−*/×÷]$/.test(this.rawDisplay)) {
      this.rawDisplay += '0';
      this.display = '0';
      this.updateFormattedDisplays();
      return;
    }
  
    if (this.justCalculated || this.isError) {
      this.display = '0';
      this.rawDisplay = '0';
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.isError = false;
      this.updateFormattedDisplays();
      return;
    }
  
    if (this.isFromPercent) {
      this.clearEntry();
      this.isFromPercent = false;
      return;
    }
    if (this.isFromRoot) {
      this.clearEntry();
      this.isFromRoot = false;
      return;
    }
  
    if (this.display.length === 2 && this.display.startsWith('-')) {
      this.clearEntry();
      return;
    }
  
    if (this.display.length > 1) {
      this.display = this.display.replace(/,/g, '').slice(0, -1); // カンマを除去してから1桁消す
      if (this.display === '' || this.display === '-') {
        this.display = '0';
      } else {
        this.display = this.formatNumber(this.display); // 消したあとカンマを付け直す
      }
      this.rawDisplay = this.rawDisplay.replace(/(\d)(?!.*\d)/, '');
    } else {
      this.display = '0';
      this.rawDisplay = this.rawDisplay.replace(/(\d)(?!.*\d)/, '');
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



  clearEntry() {
    // rawDisplayの末尾が演算子なら、必ずrawDisplayに0を追加し、displayも0に
    if (/[+\-−*/×÷]$/.test(this.rawDisplay)) {
      this.rawDisplay += '0';
      this.display = '0';
      this.updateFormattedDisplays();
      return;
    }
    // エラーや計算直後は全体クリア
    if (this.display === '無効な計算です' || this.display.startsWith('エラー') || this.justCalculated) {
      this.rawDisplay = '0';
      this.display = '0';
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.isError = false;
      this.isNumberEntered = false; // 追加: 新規入力フラグもリセット
      this.updateFormattedDisplays();
      return;
    }
    // displayが0でなければ、rawDisplayの末尾が数字のときだけ消す
    if (this.display !== '0' && /[0-9]$/.test(this.rawDisplay)) { //🐧
      this.rawDisplay = this.rawDisplay.replace(/(-?\d+(\.\d+)?)(?!.*\d)/, '');
      this.display = '0';
      this.updateFormattedDisplays();
      return;
    }
    // それ以外はdisplayだけ0に
    this.display = '0';
    this.updateFormattedDisplays();
  } //🐧
  
  


  resetHistory() {
    //最後の演算子をクリア
    this.lastOperator = null;
    //最後の数字をクリア
    this.lastOperand = null;
  }


  appendValue(value: string) {
    // ±（符号切替）は最優先で処理
    if (value === '±') {
      if (!this.display || this.display === '0') return;
      // rawDisplayの末尾が数字でない場合は無視
      if (!/(\d+)(?!.*\d)/.test(this.rawDisplay)) return; //🐧

      // displayの符号切り替え
      if (this.display.startsWith('-')) {
        this.display = this.display.slice(1);
      } else {
        this.display = '-' + this.display;
      }

      // rawDisplayの末尾の数字ブロックの符号も切り替え
      this.rawDisplay = this.rawDisplay.replace(/(-?)(\d+(?:\.\d+)?)(?!.*\d)/, (match, sign, num) => {
        return (sign === '-' ? '' : '-') + num;
      }); //🐧

      this.updateFormattedDisplays();
      return;
    }

    if (value !== '%') {
      this.isFromPercent = false;
    }

    if (this.justCalculated && value === '%') {
      let num = parseFloat(this.rawDisplay.replace(/,/g, ''));
      if (!isNaN(num)) {
        num = num / 100;
        this.display = this.formatNumber(num.toString());
        this.rawDisplay = num.toString();
        this.updateFormattedDisplays();
        this.justCalculated = false;
        this.isFromPercent = true;
        return;
      }
    }

    if (value === '%') {
      if (this.isFromPercent) {
        // 直前が%なら何もしない（連打禁止）
        return;
      }
      // ...既存の%処理...
      const raw = this.rawDisplay;
      if (!raw) return; // 空文字なら禁止
    
      // 演算子が含まれているかチェック（※この場合 × ÷ も考慮）
      const hasOperator = /[+\-×÷*/]/.test(raw);
    
      // もし演算子なし、かつrawが数字だけなら％禁止
      if (!hasOperator && /^[0-9.]+$/.test(raw)) {
        return;
      }
    
      const lastChar = raw.slice(-1);
      if (!/[0-9)\-]/.test(lastChar) && lastChar !== '%' && lastChar !== '√') {
        return;
      }

      const lastChar2 = this.rawDisplay.slice(-1);
      if (!/[0-9)]/.test(lastChar2)) return;

      // 最後の数値（負の数や小数も対応）を取得
      const match = this.rawDisplay.match(/-?\d+(\.\d+)?(?!.*\d)/);
      if (!match) return;

      const rawNum = match[0];
      const idx = this.rawDisplay.lastIndexOf(rawNum);

      // 直前の演算子を取得
      const before = this.rawDisplay.slice(0, idx);
      const op = before.slice(-1);

      let replaceValue: string;
      if (op === '×' || op === '*' || op === '÷' || op === '/') {
        // ×, ÷ のときは直前の数字だけ ÷100
        replaceValue = (Math.round((parseFloat(rawNum) / 100) * 1e8) / 1e8).toString();
      } else {
        // +, - のときは全体ベースの◯％
        const baseNum = parseFloat(before.replace(/[+\-]$/, ''));
        replaceValue = (Math.round((baseNum * (parseFloat(rawNum) / 100)) * 1e8) / 1e8).toString();
      }
      // rawDisplay と display を更新
      this.rawDisplay = before + replaceValue;
      this.display = this.formatNumber(replaceValue);
      this.updateFormattedDisplays();
      this.isFromPercent = true;
      return;
    }

    // 全角・半角両方の演算子を含める
    const operators = ['+', '-', '*', '/', '＋', '−', '×', '÷'];
    console.log('DEBUG appendValue start:', { value, justCalculated: this.justCalculated, display: this.display, rawDisplay: this.rawDisplay });

    // 🐧【最優先】displayが小数点で終わっている状態で演算子を入力した場合の特別処理
    if (this.display.endsWith('.') && !this.display.endsWith('...') && operators.includes(value)) {
      console.log('DEBUG dot-fix branch:', { display: this.display, rawDisplay: this.rawDisplay, value });
      this.display += '0';
      this.rawDisplay += '0';
      this.formula = this.display + value;
      this.showFormula = true;
      this.rawDisplay += value;
      this.display = '0';
      this.justCalculated = false;
      this.updateFormattedDisplays();
      return;
    }

    // エラー表示中は数字以外の入力を無効化
    if (
      this.display === '無効な計算です' ||
      this.display === '11桁以上の計算結果'
    ) {
      if (!/^[0-9]$/.test(value)) return; //
      // 数字が入力された場合はクリアして新しい入力を開始
      this.clearDisplay(); //🐧
    }
    
    //🐧 justCalculatedの分岐は最初に
    if (this.justCalculated && /^[0-9]$/.test(value)) {
      this.display = this.formatNumber(value);
      this.rawDisplay = value;
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.updateFormattedDisplays();
      return;
    }
    if (this.justCalculated && operators.includes(value)) {
      // ...を消さずにrawDisplayのまま演算子を追加
      let numStr = this.rawDisplay.replace(/,/g, '');
      this.rawDisplay = numStr + value;
      // formula用に演算子を見やすく
      let opForFormula = value === '*' ? '×' : value === '/' ? '÷' : value;
      this.formula = this.display + opForFormula;
      this.showFormula = true;
      this.justCalculated = false;
      this.updateFormattedDisplays();
      return;
    }

    // 新規入力フラグの扱い
    if ((this.display === '0' && this.rawDisplay === '0') && !this.isNumberEntered && /^[0-9]$/.test(value)) {
      this.display = this.formatNumber(value);
      this.rawDisplay = value;
      this.isNumberEntered = true;
      this.updateFormattedDisplays();
      return;
    }
    if (/^[0-9]$/.test(value)) {
      this.isNumberEntered = true;
    }

    // appendValue: classic calculator logic
    if (/^[0-9]$/.test(value)) {
      // justCalculated直後で直前が演算子でない場合はrawDisplayをリセット
    if (this.justCalculated) {
        this.justCalculated = false;
        if (!operators.includes(this.rawDisplay.slice(-1))) {
          this.rawDisplay = '';
        }
      }
      const lastChar = this.rawDisplay.slice(-1);
      // displayとrawDisplayが両方'0'なら、上書き
      if (this.display === '0' && (this.rawDisplay === '0' || this.rawDisplay === '')) {
        this.display = this.formatNumber(value); //🐧
        this.rawDisplay = value; //🐧
        this.updateFormattedDisplays();
        return;
      }
      // displayが'0'（CE直後など）なら
      if (this.display === '0') {
        if (/[+\-−*/×÷]$/.test(this.rawDisplay) || this.rawDisplay === '' || this.rawDisplay === '0') { //🐧
          // 末尾が演算子 or 空 or 0 → そのまま追加
          this.rawDisplay += value;
    } else {
          // 末尾が数字 → その数字を消してから追加
          this.rawDisplay = this.rawDisplay.replace(/(\d+)(?!.*\d)/, '') + value; //🐧
        }
        this.display = this.formatNumber(value);
        this.updateFormattedDisplays();
        return;
      }
      // 直前が演算子なら新しい数字ブロック
      let currentBlock = '';
      if (operators.includes(lastChar)) {
        currentBlock = '';
    } else {
        const match = this.rawDisplay.match(/(?:^|[+\-*/×÷])(-?\d*\.?\d*)$/);
        currentBlock = match ? match[1] : '';
      }
      const [intPart = '', decimalPart = ''] = currentBlock.split('.');
      const isDecimal = currentBlock.includes('.');
      const cleanInt = intPart.replace(/^[-]?0+(?!$)/, '');
      const totalDigits = cleanInt.length + decimalPart.length;
      if (!isDecimal && cleanInt.length >= 10) return; //🐧
      if (isDecimal && decimalPart.length >= 8) return; //🐧
      if (totalDigits >= 18) return; //🐧
      // 直前が演算子なら display を新しい数字で上書き
      if (operators.includes(lastChar)) {
        this.display = this.formatNumber(value); //🐧
        this.rawDisplay += value;
    this.updateFormattedDisplays();
        return;
      }
      // displayが「0.」や「12.」など小数点で終わっている場合はそのまま連結
      if (this.display.endsWith('.')) {
        this.display += value;
        this.rawDisplay += value;
        this.updateFormattedDisplays();
        return;
      }
      // 最初の「0」なら上書き
      if (this.display === '0') {
        this.display = this.formatNumber(value);
        this.rawDisplay = value;
        this.updateFormattedDisplays();
        return;
      }
      this.display = this.formatNumber(this.display.replace(/,/g, '') + value);
      this.rawDisplay += value;
      this.updateFormattedDisplays();
    return;
  }

    if (operators.includes(value) || value === '√') {
      const lastChar = this.rawDisplay.slice(-1);
      // 直前が数字や ) の場合のみ
      if (/[0-9)]$/.test(this.rawDisplay)) {
        // 直前までの式を計算
        const evalResult = this.evaluateExpression(this.rawDisplay);
        const formatted = this.formatNumber(evalResult);
        // 11桁超過チェック
        const intDigits = String(evalResult).split('.')[0].replace(/,/g, '').replace('-', '').length;
        if (intDigits > 10) {
          this.display = '11桁以上の計算結果';
          this.formula = '';
          this.rawDisplay = '';
          this.showFormula = true;
          this.isError = true;
          this.updateFormattedDisplays();
          return;
        }
        this.display = formatted;
        this.formula = formatted + value.replace('*', '×').replace('/', '÷');
        this.showFormula = true;
        this.rawDisplay = this.addDotsIfNeeded(String(evalResult)) + value;
        this.updateFormattedDisplays();
        return;
      }
      // 既存の演算子置き換えロジック
      if (operators.includes(lastChar)) {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        // displayは直前の数字部分だけ
        const numMatch = this.rawDisplay.match(/(-?\d+(?:\.\d+)?)(?=[^0-9.]*$)/);
        this.display = numMatch ? this.formatNumber(numMatch[1]) : this.display;
        // formulaは式全体（/と*を÷と×に変換）
        this.formula = this.formatDisplay(this.rawDisplay).replace(/\//g, '÷').replace(/\*/g, '×'); //🐧
        this.showFormula = true;
        this.updateFormattedDisplays();
        return;
      }
      this.rawDisplay += value;
      this.display = this.formatDisplay(this.rawDisplay);
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
      // 直前が演算子なら「0.」を追加
      if (operators.includes(lastChar)) {
        this.display = '0.';
        this.rawDisplay += '0.';
        this.updateFormattedDisplays();
        return;
      }
      // すでに小数点が含まれている場合は無視
      const currentBlock = this.rawDisplay.split(/[+\-*/×÷]/).pop() || '';
      if (currentBlock.includes('.')) return;
      this.display += '.';
      this.rawDisplay += '.';
      this.updateFormattedDisplays();
      return;
    }

    // ⑪ 桁数制限（整数10、小数8、合計18桁）
    if (/^[0-9]$/.test(value)) {
      const match = this.rawDisplay.match(/(?:^|[+\−*/×÷])(-?\d*\.?\d*)$/);
    const currentBlock = match ? match[1] : '';
    const [intPart = '', decimalPart = ''] = currentBlock.split('.');
    const isDecimal = currentBlock.includes('.');
    const cleanInt = intPart.replace(/^[-]?0+(?!$)/, '');
    const totalDigits = cleanInt.length + decimalPart.length;
      if (!isDecimal && cleanInt.length >= 10) return; //🐧
      if (isDecimal && decimalPart.length >= 8) return; //🐧
      if (totalDigits >= 18) return; //🐧
    }

    if (operators.includes(value) || value === '√') {
      const lastChar = this.rawDisplay.slice(-1);
      if (operators.includes(lastChar)) {
        this.rawDisplay = this.rawDisplay.slice(0, -1) + value;
        this.display = this.formatDisplay(this.rawDisplay);
        this.updateFormattedDisplays();
        return;
      }
      this.rawDisplay += value;
      this.display = this.formatDisplay(this.rawDisplay);
      this.updateFormattedDisplays();
      return;
    }

    if (/^[0-9]$/.test(value)) {
      const lastChar = this.rawDisplay.slice(-1);
      // 直前が演算子なら新しい数字ブロック
      let currentBlock = '';
      if (operators.includes(lastChar)) {
        currentBlock = '';
      } else {
        const match = this.rawDisplay.match(/(?:^|[+\-*/×÷])(-?\d*\.?\d*)$/);
        currentBlock = match ? match[1] : '';
      }
      const [intPart = '', decimalPart = ''] = currentBlock.split('.');
      const isDecimal = currentBlock.includes('.');
      const cleanInt = intPart.replace(/^[-]?0+(?!$)/, '');
      const totalDigits = cleanInt.length + decimalPart.length;
      if (!isDecimal && cleanInt.length >= 10) return; //🐧
      if (isDecimal && decimalPart.length >= 8) return; //🐧
      if (totalDigits >= 18) return; //🐧
      // 直前が演算子なら display を新しい数字で上書き
      if (operators.includes(lastChar)) {
        this.display = this.formatNumber(value); //🐧
    this.rawDisplay += value;
    this.updateFormattedDisplays();
        return;
      }
      // displayが「0.」や「12.」など小数点で終わっている場合はそのまま連結
      if (this.display.endsWith('.')) {
        this.display += value;
        this.rawDisplay += value;
        this.updateFormattedDisplays();
        return;
      }
      // 最初の「0」なら上書き
      if (this.display === '0') {
        this.display = this.formatNumber(value);
        this.rawDisplay = value;
        this.updateFormattedDisplays();
        return;
      }
      this.display = this.formatNumber(this.display.replace(/,/g, '') + value);
      this.rawDisplay += value;
      this.updateFormattedDisplays();
      return;
    }

    // ＝のあと数字を押したら初期化
    if (this.justCalculated && /^[0-9]$/.test(value)) {
      this.display = this.formatNumber(value); //🐧
      this.rawDisplay = value; //🐧
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.updateFormattedDisplays();
      return;
    }

    // ＝のあと演算子を押したら答えから計算続行
    if (this.justCalculated && operators.includes(value)) {
      this.rawDisplay = this.display.replace(/,/g, ''); //🐧 カンマ除去
      this.display = this.formatNumber(this.rawDisplay);
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      // ここで演算子を追加して続行
      this.rawDisplay += value;
      this.display = this.formatDisplay(this.rawDisplay);
    this.updateFormattedDisplays();
      return;
    }

    this.rawDisplay = this.addDotsIfNeeded(this.rawDisplay);
  }

  // 小数点以下9桁以上の場合のみ...を付与
  addDotsIfNeeded(str: string): string {
    return str.replace(/(\d+\.\d{9,})/g, '$1...');
  }

  normalizeTrailingDots(expr: string): string {
    // ...が含まれていれば何もしない
    if (expr.includes('...')) return expr;
    // 末尾が「.」で終わる場合のみ「.0」を補う
    return expr.replace(/(\d+)\.$/, '$1.0')
      // `.` から始まる数字を `0.` に補正
      .replace(/(^|[+\-*/\(])\.([0-9])/g, '$10.$2');
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


　//rawdisplay（入力内容）をもとに、画面の表示を更新し、フォントサイズも変更
  updateFormattedDisplays() {
    // 結果表示のフォントサイズを固定（自動リサイズなし）
    if (this.resultTextRef) {
      // const resultEl = this.resultTextRef.nativeElement;
      // resultEl.style.fontSize = '';
      // void resultEl.offsetWidth;
      // resultEl.style.fontSize = '32px'; // 固定サイズ
    }

    // もし display が空なら、次の入力を待つ状態として表示をクリア
    if (this.display === '') {
      this.display = ''; // 空に設定（※実際には何も表示しない状態）
    }
  }



　//計算式を見やすい形に整える
  formatDisplay(value: string): string {
    if (value.includes('...')) {
      return value;
    }
    // すべての数値部分にカンマ区切りを適用
    return value.replace(/-?\d+(\.\d+)?/g, (num) => this.formatNumber(num));
  }

  // formatNumber: 表示用のみに「...」を付与
  formatNumber(value: number | string): string {
    let str = String(value);
    if (str.includes('...')) {
      // すでに...が付いている場合はそのまま返す
      return str;
    }
    if (str.includes('.')) {
      const [intPart, decPart] = str.split('.');
      if (decPart.length > 8) {
        return `${Number(intPart).toLocaleString()}.${decPart.slice(0, 8)}...`;
      }
      return `${Number(intPart).toLocaleString()}.${decPart}`;
    }
    return Number(str).toLocaleString();
  }

  // fractionToString: ...は付けず、純粋な数値文字列のみ返す
  private fractionToString(frac: Fraction): string {
    if (frac.denominator === 1n) {
      return frac.numerator.toString();
    }
    const scaledNumerator = frac.numerator * BigInt(1e18);
    const result = scaledNumerator / frac.denominator;
    if (result === 0n) {
      return '0';
    }
    const isNegative = result < 0n;
    const absResult = isNegative ? -result : result;
    const intPart = absResult / BigInt(1e18);
    const fracPart = absResult % BigInt(1e18);
    let fracStr = fracPart.toString().padStart(18, '0');
    if (!/^0+$/.test(fracStr)) {
      fracStr = fracStr.replace(/0+$/, '');
    }
    const sign = isNegative ? '-' : '';
    return fracStr ? `${sign}${intPart.toString()}.${fracStr}` : `${sign}${intPart.toString()}`;
  }

  calculateResult(): void {
    console.log('DEBUG calculateResult START:', { rawDisplay: this.rawDisplay, display: this.display });
    console.log('🔍 calculateResult START');
    console.log('🔍 Initial state:', {
      rawDisplay: this.rawDisplay,
      display: this.display,
      formula: this.formula
    });

    this.isResultDisplayed = true;

    if (
      (this.justCalculated && !this.lastOperator) ||
      this.display.includes('エラー') ||
      this.display === '無効な計算です' ||
      this.display === '11桁以上の計算結果'
    ) {
      console.log('🔍 Early return due to invalid conditions');
      return;
    }

    const formulaBeforeCalc = this.rawDisplay; //🐧 11桁超過用にも使う
    const operators = ['+', '−', '*', '/', '×', '÷'];
    const lastChar = this.rawDisplay.slice(-1);
    let evalExpression = this.rawDisplay.replace(/\.{3,}/g, ''); // ...を除去して計算用に使う
    // 末尾が「.」で終わる数値を「.0」に補正
    evalExpression = this.normalizeTrailingDots(evalExpression);
      if (operators.includes(lastChar)) {
      // 末尾が演算子のときは繰り返し計算
        const beforeOp = this.rawDisplay.slice(0, -1);
      const lastNumMatch = beforeOp.match(/(-?\d+(?:\.\d+)?)(?!.*\d)/);
      const lastNumber = lastNumMatch ? lastNumMatch[1] : '0';
      evalExpression = beforeOp + lastChar + lastNumber;
        this.lastOperator = lastChar;
        this.lastOperand = lastNumber;
      // formula: 累積値＋繰り返し数＝（*→×、/→÷）
      let opForFormula = lastChar === '*' ? '×' : lastChar === '/' ? '÷' : lastChar;
      this.formula = this.formatNumber(beforeOp) + opForFormula + this.formatNumber(lastNumber) + ' =';
        this.showFormula = true;
      this.justCalculated = true;
      const result = this.evaluateExpression(evalExpression);
      // 11桁超過チェック
      const intDigits = String(result).split('.')[0].replace(/,/g, '').replace('-', '').length;
      if (intDigits > 10) {
        this.display = '11桁以上の計算結果';
        this.formula = '';
        this.rawDisplay = '';
        this.isError = true;
        this.showFormula = true;
        this.updateFormattedDisplays();
        return;
      }
      // 小数部が8桁以上ならreturn
      const resultStr = String(result);
      const decimalMatch = resultStr.match(/\.(\d+)/);
      if (decimalMatch && decimalMatch[1].length >= 8) {
        return;
      }
      this.rawDisplay = this.addDotsIfNeeded(resultStr);
      this.display = this.formatNumber(this.rawDisplay);
      return;
    } else if (this.justCalculated && this.lastOperator && this.lastOperand) {
      // ＝連打時、直前の演算子・オペランドで繰り返し計算
      evalExpression = this.rawDisplay + this.lastOperator + this.lastOperand;
      // formula: 累積値＋繰り返し数＝（*→×、/→÷）
      let opForFormula = this.lastOperator === '*' ? '×' : this.lastOperator === '/' ? '÷' : this.lastOperator;
      this.formula = this.formatNumber(this.rawDisplay) + opForFormula + this.formatNumber(this.lastOperand) + ' =';
      this.showFormula = true;
      this.justCalculated = true;
      const result = this.evaluateExpression(evalExpression);
      // 11桁超過チェック
      const intDigits = String(result).split('.')[0].replace(/,/g, '').replace('-', '').length;
      if (intDigits > 10) {
        this.display = '11桁以上の計算結果';
        this.formula = '';
        this.rawDisplay = '';
        this.isError = true;
        this.showFormula = true;
        this.updateFormattedDisplays();
        return;
      }
      // 小数部が8桁以上ならreturn
      const resultStr = String(result);
      const decimalMatch = resultStr.match(/\.(\d+)/);
      if (decimalMatch && decimalMatch[1].length >= 8) {
        return;
      }
      this.rawDisplay = this.addDotsIfNeeded(resultStr);
      this.display = this.formatNumber(this.rawDisplay);
      return;
    } else {
      // 通常計算時はrawDisplay全体を整形してformulaにセット
      let formulaForDisplay = this.rawDisplay.replace(/\*/g, '×').replace(/\//g, '÷');
      if (!formulaForDisplay.includes('...')) {
        formulaForDisplay = this.normalizeTrailingDots(formulaForDisplay);
      }
      formulaForDisplay = formulaForDisplay.replace(/(\d+\.\d{8})\d+/g, '$1...');
      // すべての数値部分にカンマ区切りを適用
      const formulaForDisplayWithComma = formulaForDisplay.replace(/-?\d+(\.\d+)?/g, (num) => this.formatNumber(num));
      this.formula = formulaForDisplayWithComma + ' =';
      this.showFormula = true;
      this.justCalculated = true;
    }

    try {
      // ゼロ除算チェック
      if (evalExpression.includes('/0') && !evalExpression.includes('/0.')) {
        this.display = '無効な計算です';
        this.isError = true;
        this.rawDisplay = '';
        this.formula = '';
        this.updateFormattedDisplays();
        return;
      }
  
      const result = this.evaluateExpression(evalExpression);
      console.log('DEBUG evaluateExpression result:', result);

      //⭐⭐ 11桁チェック
      const resultIntPart = String(result).split('.')[0].replace('-', '');
      if (resultIntPart.length > 10) {
        this.display = '11桁以上の計算結果';
        this.formula = '';
        this.rawDisplay = '';
        this.showFormula = true;
        this.updateFormattedDisplays();
        return;
      }
      //⭐⭐

      if (result === 'エラー') {
        throw new Error('無効な計算です');
      }

      // 割り算の計算結果で小数部が8桁ちょうどのときだけ...を付与
      let isDivision = false;
      if (typeof evalExpression === 'string' && evalExpression.includes('/')) {
        isDivision = true;
      }
      let resultStr = String(result);
      if (isDivision) {
        const match = resultStr.match(/\.(\d{8})(?!\d)/);
        if (match) {
          resultStr = resultStr + '...';
        }
      }
      this.rawDisplay = resultStr;
      this.display = this.formatNumber(this.rawDisplay);

      //🐧 直前の演算子・オペランドを保存
      const opMatch = this.rawDisplay.match(/([+\-*/])([^+\-*/]+)$/);
      if (opMatch) {
        this.lastOperator = opMatch[1];
        this.lastOperand = opMatch[2];
      }
      //🐧

      // ⭐⭐計算前の式を使ってformulaを作る！//⭐⭐⭐さらに、＊を×にする
      let formulaForDisplay = formulaBeforeCalc.replace(/\*/g, '×').replace(/\//g, '÷');
      formulaForDisplay = this.normalizeTrailingDots(formulaForDisplay);
      // 小数部が9桁以上なら...で省略
      formulaForDisplay = formulaForDisplay.replace(/(\d+\.\d{8})\d+/g, '$1...');
    
      // 🔥ここでカンマ区切りを適用
　　　　const formulaForDisplayWithComma = formulaForDisplay.replace(/-?\d+(\.\d+)?/g, (num) => this.formatNumber(num));

      this.formula = formulaForDisplayWithComma + ' =';
  this.showFormula = true;
      // ⭐⭐

    } catch (e) {
      console.error('🔍 Error during calculation:', e);
      this.display = '無効な計算です';
      this.isError = true;
      this.rawDisplay = '';
      this.formula = '';
      this.updateFormattedDisplays();
    }

    console.log('DEBUG calculateResult END:', { rawDisplay: this.rawDisplay, display: this.display });
    this.updateFormattedDisplays();

    this.shouldShowDots = this.rawDisplay.includes('...') || (typeof this.formula === 'string' && this.formula.includes('...'));
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

  evaluateExpression(expression: string): string {
    console.log("🔍 evaluateExpression START:", expression);

    // 全角マイナスを半角に変換
    expression = expression.replace(/−/g, '-');
    // カンマを除去
    expression = expression.replace(/,/g, '');

    // 演算子の正規化
    expression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\s+/g, '')      // 不要な空白を除去
      .replace(/--/g, '+')      // -- を + に変換
      .replace(/\+-/g, '-')     // +- を - に変換
      .replace(/-\+/g, '-');    // -+ を - に変換

    console.log("🔍 Normalized expression:", expression);

    try {
      // 数式を項と演算子に分解（負の数と小数を考慮）
      const tokens: string[] = [];
      let currentToken = '';
      let isInNumber = false;

      for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        // 小数点または数字の場合は現在のトークンに追加
        if (char === '.' || /\d/.test(char)) {
          currentToken += char;
          isInNumber = true;
          continue;
        }

        // 演算子の場合
        if ('+-*/'.includes(char)) {
          // 負の数の処理
          if (char === '-' && (!isInNumber || tokens[tokens.length - 1]?.match(/[+\-*/]/))) {
            currentToken = char;
            isInNumber = true;
          } else {
            // 現在のトークンがあれば保存
            if (currentToken) {
              tokens.push(currentToken);
              currentToken = '';
            }
            tokens.push(char);
            isInNumber = false;
          }
        }
      }

      // 最後のトークンがあれば追加
      if (currentToken) {
        tokens.push(currentToken);
      }

      console.log("🔍 Tokens:", tokens);

      if (tokens.length === 0) throw new Error('Empty expression');

      let result = tokens[0];
      let currentOp = '';

      for (let i = 1; i < tokens.length; i++) {
        const current = tokens[i];
        if ('+-*/'.includes(current)) {
          currentOp = current;
          console.log("🔍 Current operator:", currentOp);
  } else {
          console.log("🔍 Calculating:", {
            left: result,
            operator: currentOp,
            right: current
          });

          // 数値の妥当性チェック（小数を含む、「...」付きも許容）
          const numberPattern = /^-?\d*\.?\d+(?:\.\.\.)?$/;
          if (!numberPattern.test(result) || !numberPattern.test(current)) {
            console.error("🔍 Invalid number format:", { result, current });
            throw new Error('Invalid number format');
          }

          result = this.calcAsString(result, currentOp, current);
          console.log('🐧 after calcAsString', result, typeof result); //🐧
          console.log("🔍 Step result:", result);
        }
      }

      if (result === 'エラー' || result === undefined || result === null) {
        throw new Error('Invalid calculation');
      }

      return result;

    } catch (error) {
      console.error("🔍 Error in evaluateExpression:", error);
      // 極小数の割り算パターンなら0.00000000...を返す
      if (/^0\.0{7,}\d+\/\d+$/.test(expression)) {
        return '0.00000000...';
      }
      return 'エラー';
    }
  }

  /**
   * 文字列を分数に変換する
   */
  private stringToFraction(s: string): Fraction {
    // カンマ・±記号を除去
    s = s.replace(/,/g, '').replace('±', '-');
    if (!s.includes('.')) {
      // 整数の場合
      return {
        numerator: BigInt(s),
        denominator: 1n
      };
    }
    // 小数の場合
    const isNegative = s.startsWith('-');
    const absStr = isNegative ? s.slice(1) : s;
    const [intPart, decPart = ''] = absStr.split('.');
    const denominator = BigInt('1' + '0'.repeat(decPart.length));
    const numeratorStr = intPart + decPart;
    let numerator = BigInt(numeratorStr);
    if (isNegative) numerator = -numerator;
    return this.reduceFraction({
      numerator,
      denominator
    });
  }

  /**
   * 分数を約分する
   */
  private reduceFraction(frac: Fraction): Fraction {
    const gcd = this.calculateGCD(
      frac.numerator < 0n ? -frac.numerator : frac.numerator,
      frac.denominator
    );
    return {
      numerator: frac.numerator / gcd,
      denominator: frac.denominator / gcd
    };
  }

  /**
   * 最大公約数を計算する
   */
  private calculateGCD(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * a, b を計算し、戻り値は文字列。
   */
  calcAsString(a: string, op: string, b: string): string {
    console.log('🔍 calcAsString START:', { a, op, b });

    // 平方根の場合は従来通りNumber型で計算
    if (op === '*' && (a.startsWith('√') || b.startsWith('√'))) {
      const aIsRoot = a.startsWith('√');
      const bIsRoot = b.startsWith('√');
      const aNum = aIsRoot ? Number(a.slice(1)) : Number(a);
      const bNum = bIsRoot ? Number(b.slice(1)) : Number(b);
    
      const aValue = aIsRoot ? Math.sqrt(aNum) : aNum;
      const bValue = bIsRoot ? Math.sqrt(bNum) : bNum;
    
      let result = aValue * bValue;
    
      // 【ここ】中身がほぼ同じ √同士の掛け算なら、整数化して返す！
      const epsilon = 1e-8;
      if (aIsRoot && bIsRoot && Math.abs(aNum - bNum) < epsilon) {
        result = aNum; // √2×√2なら「2」を返す
        return String(result);
      }
    
      return String(result);
    }
    try {
      // 文字列を分数に変換
      const fracA = this.stringToFraction(a);
      const fracB = this.stringToFraction(b);
      let result: Fraction;

    switch (op) {
        case '+':
          result = {
            numerator: fracA.numerator * fracB.denominator + fracB.numerator * fracA.denominator,
            denominator: fracA.denominator * fracB.denominator
          };
          break;
        case '-':
          result = {
            numerator: fracA.numerator * fracB.denominator - fracB.numerator * fracA.denominator,
            denominator: fracA.denominator * fracB.denominator
          };
          break;
        case '*':
          result = {
            numerator: fracA.numerator * fracB.numerator,
            denominator: fracA.denominator * fracB.denominator
          };
          break;
        case '/':
          if (fracB.numerator === 0n) throw new Error('Division by zero');
          result = {
            numerator: fracA.numerator * fracB.denominator,
            denominator: fracA.denominator * fracB.numerator
          };
          break;
        default:
          throw new Error('Unsupported operator');
      }

      // 約分して文字列に変換
      result = this.reduceFraction(result);
      return this.fractionToString(result);

    } catch (error) {
      console.error('🔍 Error in calcAsString:', error);
      throw error;
    }
  }




  ngOnInit() {
    this.display = '0';
    this.rawDisplay = '0';
    this.formula = '';
  }




  replacePercent(expression: string): string {
    // 数値の後ろの % を「÷100」の構文に置換し、8桁で四捨五入
    return expression.replace(/(-?\d+(\.\d+)?)%/g, (_, num) => {
      const rounded = Math.round((parseFloat(num) / 100) * 1e8) / 1e8;
      return `(${rounded})`;
    });
  }
}