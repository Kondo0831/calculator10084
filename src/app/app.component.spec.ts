import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { input } from '@angular/core';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'calculator-app' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.display).toEqual('calculator-app');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, calculator-app');
  });
});

fdescribe('四則演算 ', () => {
  const cases = [
    { input: '1+2', expected: '3' },
    { input: '5-3', expected: '2' },
    { input: '6×7', expected: '42' },
    { input: '8÷4', expected: '2' },
    { input: '-3+5', expected: '2' },
    { input: '-8-4', expected: '-12' },
    { input: '-9×3', expected: '-27' },
    { input: '-12÷4', expected: '-3' },
    { input: '10--5', expected: '15' },
    { input: '-6--4', expected: '-2' },
    { input: '-5×-5', expected: '25' },
    { input: '-18÷-3', expected: '6' },
    { input: '-9+-9', expected: '-18' },
    { input: '-16+4', expected: '-12' },
    { input: '4--5', expected: '9' },
    { input: '-3×4', expected: '-12' },
    { input: '0+0', expected: '0' },
    { input: '0×123456789', expected: '0' },
    { input: '0-5', expected: '-5' },
    { input: '5-0', expected: '5' },
    { input: '3333333333.22222222+3333333333.22222222', expected: '6,666,666,666.44444444' },
  ];

  cases.forEach(({ input, expected }) => {
    it(`${input} = ${expected}`, () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      app.rawDisplay = input;
      app.calculateResult();
      const result = app.display;
      expect(result).toBe(expected);
    });
  });
});

fdescribe('小数演算テスト', () => {
  const decimalCases = [
    { input: '0.1 + 0.2', expected: '0.3' },
    { input: '1.2 - 3', expected: '-1.8' },
    { input: '0.7 × 3', expected: '2.1' },
    { input: '0.3 × 10', expected: '3' },
    { input: '2.4 ÷ 2', expected: '1.2' },
    { input: '1 ÷ 3', expected: '0.33333333' },
    { input: '0.00000001 ÷ 2', expected: '0.00000000...' },
    { input: '0.0000001 ÷ 3', expected: '0.00000003...' },
    { input: '1.12345678 + 0.00000001', expected: '1.12345679' },
    { input: '1.99999999 + 0.00000001', expected: '2' },
    { input: '0.99999999 × 1.00000001', expected: '0.99999999...' },
    { input: '0.12345678 + 0.87654321', expected: '0.99999999' },
    { input: '0.12345678 + 0.87654322', expected: '1' },
    { input: '0.00000000 + 0.00000000', expected: '0' },
    { input: '50÷0.1', expected: '500' },
    { input: '1 ÷ 0.1', expected: '10' },
    { input: '1 ÷ 0.5', expected: '2' },
    { input: '0.5 ÷ 0.1', expected: '5' },
    { input: '10 ÷ 0.2', expected: '50' },
    { input: '0.1 ÷ 0.01', expected: '10' },
    { input: '0.001 ÷ 0.1', expected: '0.01' },
    { input: '1.5 ÷ 0.3', expected: '5' },
    { input: '0.15 ÷ 0.03', expected: '5' },
    { input: '0.5 * 0.3', expected: '0.15' },
    { input: '2.5 * 3.1', expected: '7.75' },
  ];

  const negativeDecimalCases = [
    { input: '−0.1 + 0.2', expected: '0.1' },
    { input: '−0.5 − 0.3', expected: '-0.8' },
    { input: '−0.25 × 4', expected: '-1.0' },
    { input: '−0.9 ÷ 3', expected: '-0.3' },
    { input: '−0.00000001 + 0.00000001', expected: '0' },
  ];

  let calculator: AppComponent;

  beforeEach(() => {
    calculator = new AppComponent();
    calculator.ngOnInit?.();
    calculator.clearDisplay?.();
    calculator.isError = false;
    calculator.justCalculated = false;
  });

  describe('正の小数', () => {
    decimalCases.forEach(({ input, expected }) => {
      it(`${input} = ${expected}`, () => {
        calculator.rawDisplay = input;
        calculator.calculateResult();
        expect(parseFloat(calculator.display)).toBeCloseTo(parseFloat(expected), 8);
      });
    });
  });

  describe('負の小数', () => {
    negativeDecimalCases.forEach(({ input, expected }) => {
      it(`${input} = ${expected}`, () => {
        calculator.rawDisplay = input;
        calculator.calculateResult();
        expect(parseFloat(calculator.display)).toBeCloseTo(parseFloat(expected), 8);
      });
    });
  });
});

fdescribe('％演算一連テスト', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const testCases = [
    { expr: ['9','−','9','%','='], expected: '8.19' },
    { expr: ['9','+','9','%','='], expected: '9.81' },
    { expr: ['1','0','0','−','1','0','%','='], expected: '90' },
    { expr: ['1','0','0','+','1','0','%','='], expected: '110' },
    { expr: ['5','0','*','1','0','%','='], expected: '5' },
    { expr: ['9','−','0','%','='], expected: '9' },
    { expr: ['1','0','.','5','+','2','0','%','='], expected: '12.6' },
    { expr: ['1','0','0','0','0','0','0','+','1','0','%','='], expected: '1,100,000' },
    { expr: ['0','+','5','0','%','='], expected: '0' },
    { expr: ['1','0','.','5','−','2','0','%','='], expected: '8.4' },
    { expr: ['0','−','5','0','%','='], expected: '0' },
    { expr: ['4','.','5','*','1','0','%','='], expected: '0.45' },
    { expr: ['4','.','5','*','2','0','%','='], expected: '0.9' },
    { expr: ['5','0','/','1','0','%','='], expected: '500' },
    { expr: ['4','.','5','/','1','0','%','='], expected: '45' },
    { expr: ['0','.','0','0','1','+','5','0','%','='], expected: '0.0015' },
    { expr: ['5','0','±','+','1','0','%','='], expected: '-55' },
    { expr: ['5','0','±','−','1','0','%','='], expected: '-45' },
    { expr: ['5','.','5','5','5','+','1','0','%','='], expected: '6.1105' },
  ];

  testCases.forEach(({ expr, expected }) => {
    it(`${expr.join('')} → ${expected}`, () => {
      expr.forEach(ch => {
        if (ch === '=') calc.calculateResult();
        else calc.appendValue(ch);
      });
      expect(calc.display).toBe(expected);
    });
  });
});

fdescribe('Square root calculation UI & logic tests', () => {
  let calculator: AppComponent;

  beforeEach(() => {
    calculator = new AppComponent();
  });

  const testCases = [
    { sequence: ['9','√'], expected: '3' },
    { sequence: ['1','6','√'], expected: '4' },
    { sequence: ['2','5','√'], expected: '5' },
    { sequence: ['1','0','0','√'], expected: '10' },
    { sequence: ['0','√'], expected: '0' },
    { sequence: ['0','.','2','5','√'], expected: '0.5' },
    { sequence: ['0','.','0','0','0','1','√'], expected: '0.01' },
    { sequence: ['9','±','√'], expected: '無効な計算です' },
    { sequence: ['1','6','±','√'], expected: '無効な計算です' },
    { sequence: ['0','.','2','5','±','√'], expected: '無効な計算です' },
    { sequence: ['0','.','0','0','0','0','0','0','0','1','√'], expected: '0.0001' },
    { sequence: ['1','0','0','0','0','0','0','0','0','0','√'], expected: '31,622.77660168...' },

    { sequence: ['1','6','√','+','4'], expected: '8' },
    { sequence: ['2','5','√','−','5'], expected: '0' },
    { sequence: ['3','6','√','*','2'], expected: '12' },
    { sequence: ['8','1','√','/','9',], expected: '1' },
    { sequence: ['0','.','2','5','√','+','0','.','5'], expected: '1' },
    { sequence: ['0','.','0','1','√','−','0','.','0','0','3',], expected: '0.097' },
    { sequence: ['0','.','0','0','0','1','√','*','1','0',], expected: '0.1' },
    { sequence: ['0','.','0','0','0','4','√','/','2',], expected: '0.01' },

    { sequence: ['9','√','+','1','6','√'], expected: '7' },
    { sequence: ['4','9','√','−','2','5','√'], expected: '2' },
    { sequence: ['3','6','√','*','4','√'], expected: '12' },
    { sequence: ['6','4','√','/','1','6','√'], expected: '2' },

    { sequence: ['2','√'], expected: '1.41421356...' },
    { sequence: ['3','√'], expected: '1.73205080...' },
    { sequence: ['5','√'], expected: '2.23606797...' },
    { sequence: ['7','√','+','1'], expected: '3.64575131...' },
    { sequence: ['2','√','*','3'], expected: '4.24264068...' },
    { sequence: ['2','√','+','3','√'], expected: '3.14626436...' },
    { sequence: ['3','√','−','2','√'], expected: '0.31783724...' },
    { sequence: ['5','√','/','2','√'], expected: '1.58113883...' },
    { sequence: ['2','√','*','2','√'] , expected: '2', description: '√2×√2は2' },
  ];

  testCases.forEach(({ sequence, expected }) => {
    it(`should calculate ${sequence.join('')} → ${expected}`, () => {
      calculator.clearDisplay?.();
      sequence.forEach(token => calculator.appendValue(token));
      calculator.calculateResult();
      expect(calculator.display).toBe(expected);
    });
  });
});

describe('入力制限テスト (appendValue 単体)', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const cases = [
    {
      keys: ['1','+','+','2'],
      expectedRaw: '1+2',
      expectedDisplay: '2',
      description: '連続演算子「+ +」は無視される',
    },
    {
      keys: ['2','.','.','.','3'],
      expectedRaw: '2.3',
      expectedDisplay: '2.3',
      description: '小数点連続入力は1つにまとめられる',
    },
    {
      keys: ['4','√','√'],
      expectedRaw: '2',
      expectedDisplay: '2',
      description: '多重√は1つ目のみ処理される',
    },
    {
      keys: ['0','0'],
      expectedRaw: '0',
      expectedDisplay: '0',
      description: '00 などの無意味な 0 はまとめて 0 に',
    },
    {
      keys: ['0','.','1','2','3','4','5','6','7','8','9'],
      expectedRaw: '0.12345678',
      expectedDisplay: '0.12345678',
      description: '小数部 8 桁まで、それ以降は "..." 表示',
    },
    {
      keys: ['1','2','3','4','5','6','7','8','9','0','1'],
      expectedRaw: '1234567890',
      expectedDisplay: '1,234,567,890',
      description: '整数部は 10 桁まで、それ以降はエラー',
    },
    {
      keys: '1234567890.123456789'.split(''),
      expectedRaw: '1234567890.12345678',
      expectedDisplay: '1,234,567,890.12345678',
      description: '合計 18 桁を超えると超過分は無視',
    },
  ];

  cases.forEach(({ keys, expectedRaw, expectedDisplay, description }) => {
    it(description, () => {
      keys.forEach(k => calc.appendValue(k));
      // rawDisplay が期待どおりに制限されている
      expect(calc.rawDisplay).toBe(expectedRaw);
      // display も同様に制限＋フォーマット
      expect(calc.display).toBe(expectedDisplay);
    });
  });
});

describe('符号（±）と演算子の挙動', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const tests = [
    { keys: ['5','±'], expected: '-5', desc: '正の数に±を押すと負になる' },
    { keys: ['5', '±'], expected: '-5', desc: '正の数に±を押すと負になる（逆順）' },
    { keys: ['-8', '±'], expected: '8', desc: '負の数に±を押すと正になる' },
    { keys: ['0', '±'], expected: '0', desc: '0に±を押しても変わらない' },
    { keys: ['5', '±', '±'], expected: '5', desc: '±を2回押すと元に戻る' },
    { keys: ['5', '±', '+', '3', '='], expected: '-2', desc: '5に±して+3 → -2' },
    { keys: ['9', '±', '−', '4', '='], expected: '-13', desc: '9に±して-4 → -13' },
    { keys: ['5', '−', '±', '±', '5', '='], expected: '0', desc: '±を2回 → -5 → +5 → 5-5=0' },
    { keys: ['9', '√', '±'], expected: '-3', desc: '√9=3に±で-3' },
    { keys: ['5', '+', '−', '3', '='], expected: '2', desc: '演算子を+→-に切替 → 5-3=2' },
    { keys: ['9', '−', '*', '2', '='], expected: '18', desc: '演算子を-→×に切替 → 9×2=18' },
    { keys: ['4', '×', '/', '2', '='], expected: '2', desc: '演算子を×→÷に切替 → 4÷2=2' },
    { keys: ['8', '÷', '+', '1', '='], expected: '9', desc: '演算子を÷→+に切替 → 8+1=9' },
    { keys: ['5', '+', '−', '*', '/', '2', '='], expected: '2.5', desc: '最後の演算子÷が有効 → 5÷2=2.5' },
    { keys: ['2', '5', '√', '+', '5','±', '='], expected: '0', desc: '√25=5、演算子+→-に変更 → 5-5=0' },
    { keys: ['5', '+', '3', '±', '='], expected: '2', desc: '5 + (-3) = 2' },
  ];

  tests.forEach(({ keys, expected, desc }) => {
    it(desc, () => {
      keys.forEach(k => calc.appendValue(k));
      calc.calculateResult?.();
      expect(calc.display).toBe(expected);
    });
  });
});

describe('エラーハンドリングと桁数制限テスト', () => {
  let calculator: AppComponent;

  beforeEach(() => {
    calculator = new AppComponent();
  });

  const errorTests = [
    { input: '99999999999 + 1', expectedResult: '11桁以上の計算結果', description: '整数部10桁を超える場合、桁数制限が適用される' },
    { input: '1 / 0', expectedResult: '無効な計算です', description: 'ゼロ除算はエラー' },
    { input: '(-9)√', expectedResult: '無効な計算です', description: '負の数の平方根はエラー' },
    { input: '9999999999 + 9999999999', expectedResult: '11桁以上の計算結果', description: '整数部10桁の制限内で計算できる' },
    { input: '9999999999 + 9 +', expectedResult: '11桁以上の計算結果', description: '演算子が残っている場合、エラー' },
    { input: '999999999.99999999 + 0.1 +', expectedResult: '11桁以上の計算結果', description: '小数部が8桁を超えないように制限' },
    { input: '9999999999 + 100√', expectedResult: '11桁以上の計算結果', description: '√100の結果が加算される' },
    { input: '999999999999999999', expectedResult: '11桁以上の計算結果', description: '18桁を超える入力は制限される' },
  ];

  errorTests.forEach(({ input, expectedResult, description }) => {
    it(`${description} - "${input}" → "${expectedResult}"`, () => {
      calculator.rawDisplay = input;
      calculator.calculateResult();
      expect(calculator.display).toBe(expectedResult);
    });
  });
});

describe('複合計算・エッジケーステスト', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
  });

  const cases = [
    { input: Array(7).fill('0.1 +').join(' ') + '0.1', expected: '0.8', description: '0.1を8回加算' },
    { input: Array(8).fill('0.1*').join(' ') + '0.1', expected: '0.00000001', description: '0.1を9回加算' },
    { input: Array(9).fill('0.1*').join(' ') + '0.1', expected: '0.00000000...', description: '0.1を10回乗算（丸めあり）' },
    { input: '0.12345678+0.00000001', expected: '0.12345679', description: '桁ギリギリの加算' },
    { input: '1÷3×3', expected: '0.99999999...', description: '1÷3×3で丸め戻し' },
    { input: '0.000000001/2', expected: '0.00000000...', description: '9桁以上...' },
  
    { input: '0.00000001×9', expected: '0.00000009', description: '極小数の乗算' },
    { input: '0.00000001÷10', expected: '0.00000000...', description: '極小数の割算' },
    { input: '-9999999999+-1', expected: '11桁以上の計算結果', description: '負数のオーバーフロー加算' },
    { input: '-9999999990-10', expected: '11桁以上の計算結果', description: '負数のオーバーフロー減算' },
    { input: '-100000×100000', expected: '11桁以上の計算結果', description: '大きな数同士の乗算' },
    { input: Array(10).fill('-1000000000 +').join(' ') + '0', expected: '11桁以上の計算結果', description: '-1000000000を10回加算' },
    { input: '-5000000000×2', expected: '11桁以上の計算結果', description: '大きな負数の乗算' },
    { input: '-1000000×10000', expected: '11桁以上の計算結果', description: '更に大きな数同士の乗算' },
  ];

  cases.forEach(({ input, expected, description }) => {
    it(`${description} [${input}] → ${expected}`, () => {
      // 入力シーケンスをシミュレート
      calc.clearDisplay?.();
      input.replace(/([0-9.√+-×÷]+)/g, '$1 ').trim().split(/\s+/).forEach(token => {
        calc.appendValue(token);
      });

      // 計算
      calc.calculateResult();
      expect(calc.display).toBe(expected);
    });
  });
});

describe('式表示テスト（formula 更新）', () => {
  let calculator: AppComponent;

  beforeEach(() => {
    calculator = new AppComponent();
    calculator.clearDisplay?.();
  });

  const formulaCases = [
    { sequence: ['1','0','+'], expectedFormula: '10+' },
    { sequence: ['1','0','+','1','+'], expectedFormula: '11+' },
    { sequence: ['1','0','+','1','+','1','+'], expectedFormula: '12+' },
    { sequence: ['1','0','−','1','−'], expectedFormula: '9−' },
    { sequence: ['1','0','−','1','−','1'], expectedFormula: '9−' },
    { sequence: ['1','0','*','2','*'], expectedFormula: '20×' },
    { sequence: ['1','0','/','2','/'], expectedFormula: '5÷' },
  ];

  formulaCases.forEach(({ sequence, expectedFormula }) => {
    it(`"${sequence.join('')}" の後 formula が "${expectedFormula}"`, () => {
      // シーケンスを入力
      sequence.forEach(ch => calculator.appendValue(ch));
      // 演算子入力後の formula を取得
      const actual = calculator.formula.trim();
      expect(actual).toBe(expectedFormula);
    });
  });
});

describe('CE / C / BKSP 動作と計算継続テスト', () => {
  let calc: AppComponent;
  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const tests = [
    // [事前Sequence, 操作, 押すキー, expectedDisplay, expectedFormula?]
    { before: ['3','4','+','2'], key: 'C', expectedDisplay: '0' },
    { before: ['1','0','0','×','√','(','1','6',')'], key: 'C', expectedDisplay: '0' },
    { before: ['9','%'], key: 'C', expectedDisplay: '0' },

    { before: ['3','+','2','=','5'], key: 'CE', expectedDisplay: '0' },
    { before: ['3','+'], key: 'CE', expectedDisplay: '0', expectedFormula: '3+' },
    { before: ['3','+','2','='], key: 'CE', expectedDisplay: '0', expectedFormula: '' },

    { before: ['9','±'], key: 'CE', expectedDisplay: '0', expectedFormula: '' },

    { before: ['1','2','3'], key: 'BKSP', expectedDisplay: '12', expectedFormula: '' },
    { before: ['1','2'], key: 'BKSP', expectedDisplay: '1', expectedFormula: '' },
    { before: ['9','±'], key: 'BKSP', expectedDisplay: '-9', expectedFormula: '' },

    { before: ['3','+','4','%'], key: 'BKSP', expectedDisplay: '0', expectedFormula: '3+' },
    { before: ['(','1','6',')','√'], key: 'BKSP', expectedDisplay: '0', expectedFormula: '' },
    { before: ['2','+','3','=','5'], key: 'BKSP', expectedDisplay: '0', expectedFormula: '' },

  ];

  tests.forEach(({ before, key, expectedDisplay, expectedFormula }) => {
    it(`"${before.join('')}" →' then CE' : ''} then "${key}" = "${expectedDisplay}"`, () => {
      // 事前入力
      before.forEach(ch => calc.appendValue(ch));
      // CE/C/BKSP
      if (key === 'C') calc.clearDisplay?.();
      else if (key === 'CE') calc.clearEntry();
      else if (key === 'BKSP') calc.backspace();

      // もし連続 CE
      if (key === 'CE') calc.clearEntry();

      // 次のキー入力
      calc.appendValue(key);
      // イコール入力がある場合
      if (key === '=') calc.calculateResult();

      // 表示検証
      expect(calc.display).toBe(expectedDisplay);
      if (expectedFormula !== undefined) {
        expect(calc.formula.trim()).toBe(expectedFormula);
      }
    });
  });
});

describe('CE 後に入力 & 再計算テスト', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const cases = [
    { seq: ['9','+','5'], // 最初に 9+5= -> 14
      after: ['CE','6','='], expected: '15' }, // → CE -> +6= -> 15

    { seq: ['7','*','3'], // 7×3= -> 21
      after: ['CE','4','='], expected: '28' }, // → CE -> ×4= -> 28

    { seq: ['6','−'], // 6− (最後が演算子なので繰り返し6−6= -> 0)
      after: ['CE','2','='], expected: '4' }, // → CE -> −2= -> 4

    { seq: ['5','+','9'], // 5+9= -> 14
      after: ['CE','CE','1','='], expected: '6' }, // → CE (消9)->+? remains, CE-> clears entry-> 5+1=6

    { seq: ['8','/','4','2'], // 8÷42= -> 0.19047619...
      after: ['CE','3','='], expected: '2.66666666...' }, // → CE -> ÷3= -> 2.66666667
  ];

  cases.forEach(({ seq, after, expected }) => {
    it(`${seq.join('')} then ${after.join(' ')} should display ${expected}`, () => {
      // 初回計算まで
      seq.forEach(ch => {
        if (ch === 'CE') calc.clearEntry();
        else {
          calc.appendValue(ch);
          if (ch === '=') calc.calculateResult();
        }
      });

      // CE 後の入力＆再計算
      after.forEach(ch => {
        if (ch === 'CE') calc.clearEntry();
        else if (ch === '=') calc.calculateResult();
        else calc.appendValue(ch);
      });

      expect(calc.display).toBe(expected);
    });
  });
});