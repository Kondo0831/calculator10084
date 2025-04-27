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

    // ★ % を含む数値（計算後）もまとめて CE 処理
    if (this.isFromPercent) {
      const match = this.rawDisplay.match(/(√?-?\d+(\.\d+)?%?|√?\.\d+%?|\d+(\.\d+)?%?)$/);
      if (match) {
        const idx = this.rawDisplay.lastIndexOf(match[0]);
        this.rawDisplay = this.rawDisplay.slice(0, idx);  // %を含めて全部削除
        this.display = '0';
        this.updateFormattedDisplays();
      }
      this.isFromPercent = false;
      return;
    }

    // √の結果だったら、直前の値だけを削除（CE動作）
    if (this.isFromRoot) {
      const match = this.rawDisplay.match(/(√?-?\d+(\.\d+)?|√?\.\d+)/);
      if (match) {
        const idx = this.rawDisplay.lastIndexOf(match[0]);
        this.rawDisplay = this.rawDisplay.slice(0, idx);
        this.display = '0';
        this.updateFormattedDisplays();
      }
      this.isFromRoot = false;
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
        this.rawDisplay = '0';
      } else if (displayWithoutCommas.length > 1) {
        // 末尾1文字を削除
        displayWithoutCommas = displayWithoutCommas.slice(0, -1);
        // rawDisplay も同期して更新
        this.rawDisplay = this.rawDisplay.slice(0, -1);

        // 空になった場合や不正な状態になった場合は0にする
        if (!displayWithoutCommas || displayWithoutCommas === '-' || displayWithoutCommas === '.' ||
          displayWithoutCommas === '0.' || displayWithoutCommas === '0') {
          displayWithoutCommas = '0';
          this.rawDisplay = '0';
        }
      } else {
        displayWithoutCommas = '0';
        this.rawDisplay = '0';
      }

      // カンマを再度挿入
      this.display = this.formatNumber(displayWithoutCommas);
      this.updateFormattedDisplays();
      return;
    }

    // 🔹ここから下は「＝を押したあと or 演算式がある場合」の処理
    // 演算子が末尾にある場合、Backspaceを無効化する
    if (/[+\−\*\/]$/.test(this.rawDisplay)) {
      return;
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
      this.rawDisplay = this.rawDisplay.replace(/([+\-*/])[^+\-*/]*$/, '$1');
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
    const operators = ['+', '−', '*', '/', '×', '÷'];
    console.log('🔍 appendValue START:', { value, rawDisplay: this.rawDisplay });

    // √の処理
    if (value === '√') {
      console.log('🔍 Processing √ input');

    

      // 数値が入力されていない場合は無視
      if (this.rawDisplay === '0' || this.rawDisplay === '') {
        console.log('🔍 No number to apply √ to');
        return;
      }

      // 最後の数値を取得
      const match = this.rawDisplay.match(/(-?\d+(\.\d+)?)$/);
      if (!match) {
        console.log('🔍 No valid number found at the end');
        return;
      }

      const number = match[0];
      const parsed = parseFloat(number);
      console.log('🔍 Found number:', { number, parsed });

      // 負の数のチェック
      if (parsed < 0) {
        console.log('🔍 Negative number detected');
        this.display = '無効な計算です';
        this.isError = true;
        return;
      }

      // 平方根を計算
      const result = Math.sqrt(parsed);
      const formatted = this.formatNumber(String(result));
      console.log('🔍 Square root result:', { result, formatted });

      // 結果を表示（前半の式を保持）
      const beforeNumber = this.rawDisplay.slice(0, this.rawDisplay.lastIndexOf(number));
      this.rawDisplay = beforeNumber + String(result);
      this.display = formatted;
      this.updateFormattedDisplays();

  
      return;

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
      this.rawDisplay = this.display.replace(/,/g, '');
      this.display = this.formatNumber(this.rawDisplay);
      this.formula = '';
      this.showFormula = false;
      this.justCalculated = false;
      this.rawDisplay += value;
      this.display = this.formatDisplay(this.rawDisplay);
      this.updateFormattedDisplays();
      return;
    }

    // appendValue: classic calculator logic
    if (/^[0-9]$/.test(value)) {
      const lastChar = this.rawDisplay.slice(-1);
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
        this.display = this.formatNumber(evalResult); //🐧
        const opForFormula = value.replace('*', '×').replace('/', '÷'); //🐧
        this.formula = this.formatNumber(evalResult) + opForFormula; //🐧
        this.showFormula = true;
        this.rawDisplay = String(evalResult) + value; //🐧
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

    if (value === '%') {
      const lastChar = this.rawDisplay.slice(-1);
      if (!/[0-9)]/.test(lastChar)) return;

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
      this.isFromPercent = true; // ←★絶対に必要！！
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

      // 現在の数値ブロックを取得
      const match = this.rawDisplay.match(/(?:^|[+\−*/×÷])(-?\d*\.?\d*)$/);
      const currentBlock = match ? match[1] : this.rawDisplay;

      // 既に小数点がある場合は追加しない
      if (currentBlock.includes('.')) return;

      // rawDisplayが空または'0'の場合、または演算子の直後の場合
      if (!this.rawDisplay || this.rawDisplay === '0' || isAfterOperator) {
        this.rawDisplay = this.rawDisplay === '0' ? '0.' : this.rawDisplay + '0.';
        this.display = this.display === '0' ? '0.' : this.display + '.'; //🐧
      } else {
        this.rawDisplay += '.';
        if (!this.display.includes('.')) {
          this.display += '.'; //🐧
        }
      }

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



  //計算式を見やすい形に整える
  formatDisplay(value: string): string {
    // 🐧 √n×√n など同じ√同士のパターンを検出
    if (/^√(\d+(?:\.\d+)?)\s*[×*]\s*√\1$/.test(this.rawDisplay)) {
      const match = this.rawDisplay.match(/^√(\d+(?:\.\d+)?)\s*[×*]\s*√\1$/);
      if (match) {
        const n = Number(match[1]);
        return Math.round(n).toString(); //🐧
      }
    }
    // - を一時的にプレースホルダに置換（符号と演算子を区別するため）
    let temp = value.replace(/-/g, '−');

    // 数値やパーセントを整形（数値部分の - は __MINUS__ のまま）
    temp = temp.replace(/−?\d+(\.\d+)?%?/g, (num) => {
      const isPercent = num.endsWith('%');
      const numberPart = isPercent ? num.slice(0, -1) : num;

      // ここで formatNumber を呼び出して、整形した数値を取得
      const formattedNumber = this.formatNumber(numberPart);

      return isPercent ? `${formattedNumber}%` : formattedNumber;
    });

    // __MINUS__（残ってる演算子用）を全角マイナスに
    temp = temp.replace(/−/g, '-');

    // × と ÷ に変換
    return temp.replace(/\*/g, '×').replace(/\//g, '÷');
  }

  // 数値を整形（小数点以下8桁まで表示）　number型は直接いく。文字列を渡す場合、number型に直してから渡す


  calculateResult(): void {
    console.log('🔍 calculateResult START');
    console.log('🔍 Initial state:', {
      rawDisplay: this.rawDisplay,
      display: this.display,
      formula: this.formula
    });

    this.isResultDisplayed = true;

    // 無効な条件（再計算不要、エラー状態など）
    if (
      (this.justCalculated && !this.lastOperator) ||
      this.display.includes('エラー') ||
      this.display === '無効な計算です' ||
      this.display === '11桁以上の計算結果'
    ) {
      console.log('🔍 Early return due to invalid conditions');
      return;
    }

    // ⭐⭐式のやつ ここで計算前のrawDisplayをコピーしておく！
    const formulaBeforeCalc = this.rawDisplay; //🐧 11桁超過用にも使う
    //　⭐⭐

    this.justCalculated = true;

    try {
      //🐧 イコール連打対応
      if (this.justCalculated && this.lastOperator && this.lastOperand) {
        const repeatedExpr = this.rawDisplay + this.lastOperator + this.lastOperand;
        let evalExpression = repeatedExpr;

        // √の処理を追加（すべての√を処理するためにwhileループを使用）
        while (evalExpression.includes('√')) {
          evalExpression = evalExpression.replace(/-√(-?\d+(\.\d+)?)/g, (_, num) => (-Math.sqrt(parseFloat(num))).toString());
          evalExpression = evalExpression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => Math.sqrt(parseFloat(num)).toString());
        }
        // ゼロ除算チェック
        if (evalExpression.includes('/0') && !evalExpression.includes('/0.')) {
          this.display = '無効な計算です';
          this.isError = true;
          this.rawDisplay = '';
          this.formula = this.formatDisplay(this.normalizeTrailingDots(evalExpression)) + ' ='; //🐧
          this.updateFormattedDisplays();
          return;
        }

        const result = this.evaluateExpression(evalExpression);
        const formatted = this.formatNumber(result);

        if (this.isOverDigitLimit(formatted)) {
          this.handleDigitOverflow(this.rawDisplay);
          return;
        }

        this.display = formatted;
        this.formula = this.formatDisplay(this.normalizeTrailingDots(repeatedExpr)) + ' =';
        this.rawDisplay = String(result);
        this.showFormula = true;
        this.justCalculated = true;
        this.updateFormattedDisplays();
        return;
      }
      //🐧

      // 演算子を正規化
      this.rawDisplay = this.rawDisplay.replace(/−/g, '-').replace(/÷/g, '/').replace(/×/g, '*');
      console.log('🔍 Normalized rawDisplay:', this.rawDisplay);

      // 末尾の演算子をチェック
      const lastChar = this.rawDisplay.slice(-1);
      const operators = ['+', '-', '*', '/'];

      //🐧 末尾が演算子なら繰り返し計算分岐
      if (operators.includes(lastChar)) {
        const beforeOp = this.rawDisplay.slice(0, -1);
        const lastNumMatch = beforeOp.match(/(√?-?\d+(?:\.\d+)?%?)(?!.*\d)/);
        const lastNumber = lastNumMatch ? lastNumMatch[0] : '0';

        this.lastOperator = lastChar;
        this.lastOperand = lastNumber;

        const repeatedExpr = beforeOp + lastChar + lastNumber;
        let evalExpression = repeatedExpr;

        // √の処理を追加（すべての√を処理するためにwhileループを使用）
        while (evalExpression.includes('√')) {
          evalExpression = evalExpression.replace(/-√(-?\d+(\.\d+)?)/g, (_, num) => {
            return (-Math.sqrt(parseFloat(num))).toString();
          });
          evalExpression = evalExpression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
            if (parseFloat(num) < 0) {
              throw new Error('無効な計算です');
            }
            return Math.sqrt(parseFloat(num)).toString();
          });
        }
        // ゼロ除算チェック
        if (evalExpression.includes('/0') && !evalExpression.includes('/0.')) {
          this.display = '無効な計算です';
          this.isError = true;
          this.rawDisplay = '';
          this.formula = this.formatDisplay(this.normalizeTrailingDots(evalExpression)) + ' ='; //🐧
          this.updateFormattedDisplays();
          return;
        }

        const result = this.evaluateExpression(evalExpression);
        const formatted = this.formatNumber(result);

        if (this.isOverDigitLimit(formatted)) {
          this.handleDigitOverflow(beforeOp);
          return;
        }

        this.display = formatted;
        this.formula = this.formatDisplay(this.normalizeTrailingDots(repeatedExpr)) + ' =';
        this.rawDisplay = String(result);
        this.showFormula = true;
        this.justCalculated = true;
        this.updateFormattedDisplays();
        return;
      }
      //🐧

      // 式を評価
      let evalExpression = this.rawDisplay; //🐧 letに変更

      // √の処理を追加（すべての√を処理するためにwhileループを使用）
      while (evalExpression.includes('√')) {
        evalExpression = evalExpression.replace(/-√(-?\d+(\.\d+)?)/g, (_, num) => {
          console.log('🔍 Processing negative square root:', num);
          return (-Math.sqrt(parseFloat(num))).toString();
        });

        evalExpression = evalExpression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
          console.log('🔍 Processing square root:', num);
          if (parseFloat(num) < 0) {
            throw new Error('無効な計算です');
          }
          return Math.sqrt(parseFloat(num)).toString();
        });

        console.log('🔍 Expression after sqrt processing:', evalExpression);
      }

      // ゼロ除算チェック
      if (evalExpression.includes('/0') && !evalExpression.includes('/0.')) {
        console.log('🔍 Division by zero detected');
        throw new Error('無効な計算です');
      }

      const result = this.evaluateExpression(evalExpression);
      console.log('🔍 Evaluation result:', result);

      //⭐⭐ 11桁チェック
      const resultIntPart = String(result).split('.')[0].replace('-', '');
      if (resultIntPart.length > 10) {
        this.display = '11桁以上の計算結果';
        this.formula = this.formatDisplay(this.normalizeTrailingDots(formulaBeforeCalc)) + ' =';
        this.rawDisplay = '';
        this.showFormula = true;
        this.updateFormattedDisplays();
        return;
      }
      //⭐⭐

      if (result === 'エラー') {
        throw new Error('無効な計算です');
      }

      const formatted = this.formatNumber(result);
      console.log('🔍 Formatted result:', formatted);

      this.display = formatted;
      this.rawDisplay = result;

      //🐧 直前の演算子・オペランドを保存
      const opMatch = this.rawDisplay.match(/([+\-*/])([^+\-*/]+)$/);
      if (opMatch) {
        this.lastOperator = opMatch[1];
        this.lastOperand = opMatch[2];
      }
      //🐧

      // ⭐⭐計算前の式を使ってformulaを作る！//⭐⭐⭐さらに、＊を×にする
      //🔥🔥
      let formulaForDisplay = formulaBeforeCalc.replace(/\*/g, '×').replace(/\//g, '÷');
      // 小数部が9桁以上なら...で省略
      formulaForDisplay = formulaForDisplay.replace(/(\d+\.\d{8})\d+/g, '$1...');
      //🔥🔥
      this.formula = formulaForDisplay + ' =';
      this.showFormula = true;
      // ⭐⭐

    } catch (e) {
      console.error('🔍 Error during calculation:', e);
      this.display = '無効な計算です';
      this.isError = true;
      this.rawDisplay = '';
      this.formula = this.formatDisplay(this.normalizeTrailingDots(formulaBeforeCalc)) + ' ='; //🐧
      this.updateFormattedDisplays();
    }

    this.updateFormattedDisplays();
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
    console.log('🐧 formatNumber input:', value, typeof value); //🐧
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
    if (decPartRaw.length > 8) {
      return `${formattedInt}.${decPartRaw.slice(0, 8)}...`;
    }
    // 小数部が8桁以内なら末尾0の処理などを行って返す
    let trimmedDec = decPartRaw;
    if (!/^0+$/.test(decPartRaw)) {
      trimmedDec = decPartRaw.replace(/0+$/, '');
    }
    return trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;
  }



  evaluateExpression(expression: string): string {
    console.log("🔍 evaluateExpression START:", expression);

    // 全角マイナスを半角に変換
    expression = expression.replace(/−/g, '-');
    // カンマを除去
    expression = expression.replace(/,/g, '');

    // √の処理を追加（すべての√を処理するためにwhileループを使用）
    while (expression.includes('√')) {
      expression = expression.replace(/-√(-?\d+(\.\d+)?)/g, (_, num) => {
        console.log('🔍 Processing negative square root:', num);
        return (-Math.sqrt(parseFloat(num))).toString();
      });

      expression = expression.replace(/√(-?\d+(\.\d+)?)/g, (_, num) => {
        console.log('🔍 Processing square root:', num);
        if (parseFloat(num) < 0) {
          throw new Error('無効な計算です');
        }
        return Math.sqrt(parseFloat(num)).toString();
      });

      console.log('🔍 Expression after sqrt processing:', expression);
    }

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

          // 数値の妥当性チェック（小数を含む）
          const numberPattern = /^-?\d*\.?\d+$/;
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
      return 'エラー';
    }
  }

  /**
   * 文字列を分数に変換する
   */
  private stringToFraction(s: string): Fraction {
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
   * 分数を文字列に変換する（小数表示）
   */
  private fractionToString(frac: Fraction): string {
    if (frac.denominator === 1n) {
      return frac.numerator.toString();
    }
    const scaledNumerator = frac.numerator * BigInt(1e18);
    const result = scaledNumerator / frac.denominator;
    const isNegative = result < 0n;
    const absResult = isNegative ? -result : result;
    const intPart = absResult / BigInt(1e18);
    const fracPart = absResult % BigInt(1e18);
    let fracStr = fracPart.toString().padStart(18, '0');
    //🐧 省略記号「...」は付けず、末尾0だけ除去して全桁返す
    if (!/^0+$/.test(fracStr)) {
      fracStr = fracStr.replace(/0+$/, '');
    }
    const sign = isNegative ? '-' : '';
    return fracStr ? `${sign}${intPart.toString()}.${fracStr}` : `${sign}${intPart.toString()}`;
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