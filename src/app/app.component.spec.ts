import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { input } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';

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

describe('四則演算 ', () => {
  const cases = [
    { sequence: ['1','+','2','='], expected: '3' },                   // 1 + 2
    { sequence: ['5','−','3','='], expected: '2' },                   // 5 - 3
    { sequence: ['6','×','7','='], expected: '42' },                  // 6 × 7
    { sequence: ['8','÷','4','='], expected: '2' },                   // 8 ÷ 4
    { sequence: ['3','±','+','5','='], expected: '2' },              // -3 + 5
    { sequence: ['8','±','−','4','='], expected: '-12' },            // -8 - 4
    { sequence: ['9','±','×','3','='], expected: '-27' },            // -9 × 3
    { sequence: ['1','2','±','÷','4','='], expected: '-3' },         // -12 ÷ 4
    { sequence: ['1','0','−','5','±','='], expected: '15' },         // 10 - (-5)
    { sequence: ['6','±','−','4','±','='], expected: '-2' },         // -6 - (-4)
    { sequence: ['5','±','×','5','±','='], expected: '25' },         // -5 × (-5)
    { sequence: ['1','8','±','÷','3','±','='], expected: '6' },      // -18 ÷ (-3)
    { sequence: ['9','±','+','9','±','='], expected: '-18' },        // -9 + (-9)
    { sequence: ['1','6','±','+','4','='], expected: '-12' },        // -16 + 4
    { sequence: ['4','−','5','±','='], expected: '9' },              // 4 - (-5)
    { sequence: ['3','±','×','4','='], expected: '-12' },            // -3 × 4
    { sequence: ['0','+','0','='], expected: '0' },                  // 0 + 0
    { sequence: ['0','×','1','2','3','4','5','6','7','8','9','='], expected: '0' },  // 0 × 123456789
    { sequence: ['0','−','5','='], expected: '-5' },                 // 0 - 5
    { sequence: ['5','−','0','='], expected: '5' },                  // 5 - 0
    { sequence: ['3','3','3','3','3','3','3','3','3','3','.','2','2','2','2','2','2','2','2','+','3','3','3','3','3','3','3','3','3','3','.','2','2','2','2','2','2','2','2','='], expected: '6,666,666,666.44444444' }  // 3333333333.22222222 + 3333333333.22222222
  ];

  cases.forEach(({ sequence, expected }) => {
    it(`${sequence.join('')} = ${expected}`, () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      sequence.forEach(key => {
        if (key === '=') {
          app.calculateResult();
        } else {
          app.appendValue(key);
        }
      });
      const result = app.display;
      expect(result).toBe(expected);
    });
  });
});

describe('小数演算テスト', () => {
  const decimalCases = [
    { sequence: ['0','.','1','+','0','.','2','='], expected: '0.3' },             // 0.1 + 0.2
    { sequence: ['1','.','2','−','3','='], expected: '-1.8' },                    // 1.2 - 3
    { sequence: ['0','.','7','×','3','='], expected: '2.1' },                     // 0.7 × 3
    { sequence: ['0','.','3','×','1','0','='], expected: '3' },                   // 0.3 × 10
    { sequence: ['2','.','4','÷','2','='], expected: '1.2' },                     // 2.4 ÷ 2
    { sequence: ['1','÷','3','='], expected: '0.33333333...' },                      // 1 ÷ 3
    { sequence: ['0','.','0','0','0','0','0','0','0','1','÷','2','='], expected: '0.00000000...' },  // 0.00000001 ÷ 2
    { sequence: ['0','.','0','0','0','0','0','0','1','÷','3','='], expected: '0.00000003...' },      // 0.0000001 ÷ 3
    { sequence: ['1','.','1','2','3','4','5','6','7','8','+','0','.','0','0','0','0','0','0','0','1','='], expected: '1.12345679' },  // 1.12345678 + 0.00000001
    { sequence: ['1','.','9','9','9','9','9','9','9','9','+','0','.','0','0','0','0','0','0','0','1','='], expected: '2' },          // 1.99999999 + 0.00000001
    { sequence: ['0','.','9','9','9','9','9','9','9','9','×','1','.','0','0','0','0','0','0','0','1','='], expected: '0.99999999...' },  // 0.99999999 × 1.00000001
    { sequence: ['0','.','1','2','3','4','5','6','7','8','+','0','.','8','7','6','5','4','3','2','1','='], expected: '0.99999999' },    // 0.12345678 + 0.87654321
    { sequence: ['0','.','1','2','3','4','5','6','7','8','+','0','.','8','7','6','5','4','3','2','2','='], expected: '1' },            // 0.12345678 + 0.87654322
    { sequence: ['0','.','0','0','0','0','0','0','0','0','+','0','.','0','0','0','0','0','0','0','0','='], expected: '0' },            // 0.00000000 + 0.00000000
    { sequence: ['5','0','÷','0','.','1','='], expected: '500' },                 // 50 ÷ 0.1
    { sequence: ['1','÷','0','.','1','='], expected: '10' },                      // 1 ÷ 0.1
    { sequence: ['1','÷','0','.','5','='], expected: '2' },                       // 1 ÷ 0.5
    { sequence: ['1','÷','0','.','0','1','='], expected: '100' },                 // 1 ÷ 0.01
    { sequence: ['0','.','1','+','0','.','3','='], expected: '0.4' },            // 0.1 + 0.3
    { sequence: ['0','.','1','×','0','.','4','='], expected: '0.04' },           // 0.1 × 0.4
    { sequence: ['0','.','5','÷','0','.','1','='], expected: '5' },              // 0.5 ÷ 0.1
    { sequence: ['1','0','÷','0','.','2','='], expected: '50' },                 // 10 ÷ 0.2
    { sequence: ['0','.','1','÷','0','.','0','1','='], expected: '10' },         // 0.1 ÷ 0.01
    { sequence: ['1','.','5','÷','0','.','3','='], expected: '5' },              // 1.5 ÷ 0.3
    { sequence: ['0','.','1','5','÷','0','.','0','3','='], expected: '5' },      // 0.15 ÷ 0.03
    { sequence: ['0','.','5','×','0','.','3','='], expected: '0.15' },           // 0.5 × 0.3
    { sequence: ['2','.','5','×','3','.','1','='], expected: '7.75' }            // 2.5 × 3.1
  ];

  const negativeDecimalCases = [
    { sequence: ['−','0','.','1','+','0','.','2','='], expected: '0.1' },        // -0.1 + 0.2
    { sequence: ['−','0','.','5','−','0','.','3','='], expected: '-0.8' },       // -0.5 - 0.3
    { sequence: ['−','0','.','2','5','×','4','='], expected: '-1' },           // -0.25 × 4
    { sequence: ['−','0','.','9','÷','3','='], expected: '-0.3' },               // -0.9 ÷ 3
    { sequence: ['−','0','.','0','0','0','0','0','0','0','1','+','0','.','0','0','0','0','0','0','0','1','='], expected: '0' }  // -0.00000001 + 0.00000001
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
    decimalCases.forEach(({ sequence, expected }) => {
      it(`${sequence.join('')} = ${expected}`, () => {
        sequence.forEach(key => {
          if (key === '=') {
            calculator.calculateResult();
          } else {
            calculator.appendValue(key);
          }
        });
        expect(calculator.display).toBe(expected);
      });
    });
  });

  describe('負の小数', () => {
    negativeDecimalCases.forEach(({ sequence, expected }) => {
      it(`${sequence.join('')} = ${expected}`, () => {
        sequence.forEach(key => {
          if (key === '=') {
            calculator.calculateResult();
          } else {
            calculator.appendValue(key);
          }
        });
        expect(calculator.display).toBe(expected);
      });
    });
  });
});

describe('小数', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const calcCases = [
    // ... other test cases ...
    { 
      sequence: ['1', '/', '0', '.', '0', '0', '1', '='],
      expected: '1,000',
      desc: '1÷0.001 = 1000 (正の小数の逆数)'
    },
    // ... other test cases ...
  ];

  calcCases.forEach(({ sequence, expected, desc }) => {
    it(desc, () => {
      sequence.forEach(key => {
        if (key === '=') {
          calc.calculateResult();
        } else {
          calc.appendValue(key);
        }
      });
      expect(calc.display).toBe(expected);
    });
  });
});
describe('％演算一連テスト', () => {
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
    { keys: ['8','±', '±'], expected: '8', desc: '負の数に±を押すと正になる' },
    { keys: ['0', '±'], expected: '0', desc: '0に±を押しても変わらない' },
    { keys: ['5', '±', '±'], expected: '5', desc: '±を2回押すと元に戻る' },
    { keys: ['5', '±', '+', '3', '='], expected: '-2', desc: '5に±して+3 → -2' },
    { keys: ['9', '±', '−', '4', '='], expected: '-13', desc: '9に±して-4 → -13' },
    { keys: ['5', '−', '±', '±', '5', '='], expected: '0', desc: '±を2回 → -5 → +5 → 5-5=0' },
    { keys: ['5', '+', '−', '3', '='], expected: '2', desc: '演算子を+→-に切替 → 5-3=2' },
    { keys: ['9', '−', '*', '2', '='], expected: '18', desc: '演算子を-→×に切替 → 9×2=18' },
    { keys: ['4', '×', '/', '2', '='], expected: '2', desc: '演算子を×→÷に切替 → 4÷2=2' },
    { keys: ['8', '÷', '+', '1', '='], expected: '9', desc: '演算子を÷→+に切替 → 8+1=9' },
    { keys: ['5', '+', '−', '*', '/', '2', '='], expected: '2.5', desc: '最後の演算子÷が有効 → 5÷2=2.5' },
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

describe('小数点入力の制限テスト', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent]
    });
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('演算子の後に小数点を入力すると "0." が追加される', () => {
    component.appendValue('1');
    component.appendValue('+');
    component.appendValue('.');
    expect(component.display).toBe('0.');
    expect(component.rawDisplay).toBe('1+0.');
  });

  it('全角マイナスの後でも小数点入力が可能', () => {
    component.appendValue('1');
    component.appendValue('−');  // 全角マイナス
    component.appendValue('.');
    expect(component.display).toBe('0.');
    expect(component.rawDisplay).toBe('1−0.');
  });

  it('すでに小数点がある数値ブロックには新しい小数点を入力できない', () => {
    component.appendValue('1');
    component.appendValue('.');
    component.appendValue('2');
    component.appendValue('.');
    expect(component.display).toBe('1.2');
    expect(component.rawDisplay).toBe('1.2');
  });

  it('"0" の後に小数点を入力すると "0." になる', () => {
    component.appendValue('0');
    component.appendValue('.');
    expect(component.display).toBe('0.');
    expect(component.rawDisplay).toBe('0.');
  });

  it('複数の数値ブロックで小数点入力が正しく動作する', () => {
    component.appendValue('1');
    component.appendValue('.');
    component.appendValue('2');
    component.appendValue('−');
    component.appendValue('0');
    component.appendValue('.');
    expect(component.display).toBe('0.');
    expect(component.rawDisplay).toBe('1.2−0.');
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
    { before: ['3','4','+','2'], key: 'C', expectedDisplay: '0' },
    { before: ['1','0','0','×','√','(','1','6',')'], key: 'C', expectedDisplay: '0' },
    { before: ['9','%'], key: 'C', expectedDisplay: '0' },
    { before: ['3','+','2','='], key: 'CE', expectedDisplay: '0' },
    { before: ['3','+'], key: 'CE', expectedDisplay: '0', expectedFormula: '3+' },
    { before: ['9','±'], key: 'CE', expectedDisplay: '0', expectedFormula: '' },
    { before: ['1','2','3'], key: 'BKSP', expectedDisplay: '12', expectedFormula: '' },
    { before: ['1','2'], key: 'BKSP', expectedDisplay: '1', expectedFormula: '' },
    { before: ['3','+','4','%'], key: 'BKSP', expectedDisplay: '0', expectedFormula: '3+' },
    { before: ['2','+','3','='], key: 'BKSP', expectedDisplay: '0', expectedFormula: '' },
  ];

  tests.forEach(({ before, key, expectedDisplay, expectedFormula }) => {
    it(`"${before.join('')}" then "${key}" = "${expectedDisplay}"`, () => {
      // 初期入力を実行
      before.forEach(ch => {
        if (ch === '=') {
          calc.calculateResult();
        } else {
          calc.appendValue(ch);
        }
      });

      // 特殊キーを処理
      if (key === 'C') {
        calc.clearDisplay?.();
      } else if (key === 'CE') {
        calc.clearEntry();
      } else if (key === 'BKSP') {
        calc.backspace();
      } else {
        // 通常のキーの場合のみappendValue
        calc.appendValue(key);
        if (key === '=') {
          calc.calculateResult();
        }
      }

      // 結果を検証
      expect(calc.display).toBe(expectedDisplay);
      if (expectedFormula !== undefined) {
        expect(calc.formula.trim()).toBe(expectedFormula);
      }
    });
  });

  // ★ここから追加

  it('should clear all when justCalculated is true', () => {
    calc.display = '123';
    calc.rawDisplay = '123';
    calc.formula = '1+2';
    calc.justCalculated = true;
    calc.backspace();
    expect(calc.display).toBe('0');
    expect(calc.rawDisplay).toBe('0');
    expect(calc.formula).toBe('');
    expect(calc.justCalculated).toBe(false);
    expect(calc.isError).toBe(false);
  });

  it('should clear all when isError is true', () => {
    calc.display = 'エラー';
    calc.rawDisplay = 'エラー';
    calc.formula = '1/0';
    calc.isError = true;
    calc.backspace();
    expect(calc.display).toBe('0');
    expect(calc.rawDisplay).toBe('0');
    expect(calc.formula).toBe('');
    expect(calc.justCalculated).toBe(false);
    expect(calc.isError).toBe(false);
  });

  it('should act like CE when isFromPercent is true', () => {
    calc.display = '50';
    calc.rawDisplay = '50';
    calc.isFromPercent = true;
    calc.backspace();
    expect(calc.display).toBe('0');
  });

  it('should act like CE when isFromRoot is true', () => {
    calc.display = '1.41421356';
    calc.rawDisplay = '1.41421356';
    calc.isFromRoot = true;
    calc.backspace();
    expect(calc.display).toBe('0');
  });

  it('should clear when display is negative one-digit (e.g., "-8")', () => {
    calc.display = '-8';
    calc.rawDisplay = '-8';
    calc.backspace();
    expect(calc.display).toBe('0');
  });

  it('should delete last digit normally', () => {
    calc.display = '123';
    calc.rawDisplay = '123';
    calc.backspace();
    expect(calc.display).toBe('12');
    expect(calc.rawDisplay).toBe('12');
  });

  it('should reset to 0 if only one digit left', () => {
    calc.display = '7';
    calc.rawDisplay = '7';
    calc.backspace();
    expect(calc.display).toBe('0');
    expect(calc.rawDisplay).toBe('');
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

  // 計算結果に続けて四則演算するテストケースを追加
  const continuousCalcCases = [
    // 整数の四則演算
    { seq: ['7','+','8','=','+','3','='], expected: '18', desc: '7+8=15 の後 +3=18' },
    { seq: ['1','0','−','2','=','−','3','='], expected: '5', desc: '10-2=8 の後 -3=5' },
    { seq: ['4','×','5','=','×','2','='], expected: '40', desc: '4×5=20 の後 ×2=40' },
    { seq: ['8','÷','2','=','÷','2','='], expected: '2', desc: '8÷2=4 の後 ÷2=2' },
    
    // 負の数を含む計算
    { seq: ['6','±','×','2','=','+','4','='], expected: '-8', desc: '-6×2=-12 の後 +4=-8' },
    { seq: ['9','−','5','=','×','2','±','='], expected: '-8', desc: '9-5=4 の後 ×(-2)=-8' },
    
    // 小数を含む計算
    { seq: ['1','.','5','+','2','.','5','=','×','2','='], expected: '8', desc: '1.5+2.5=4 の後 ×2=8' },
    { seq: ['1','0','÷','4','=','÷','5','='], expected: '0.5', desc: '10÷4=2.5 の後 ÷5=0.5' },
    { seq: ['0','.','1','+','0','.','2','=','+','0','.','3','='], expected: '0.6', desc: '0.1+0.2=0.3 の後 +0.3=0.6' },
    { seq: ['2','.','5','×','3','=','−','0','.','5','='], expected: '7', desc: '2.5×3=7.5 の後 -0.5=7' },
    
    // 複数回の連続計算
    { seq: ['5','+','5','=','+','5','=','+','5','='], expected: '20', desc: '5+5=10 の後 +5=15 さらに +5=20' },
    { seq: ['1','0','×','2','=','÷','4','=','×','2','='], expected: '10', desc: '10×2=20 の後 ÷4=5 さらに ×2=10' },

    // 追加のパターン
    { seq: ['2','0','÷','5','=','×','3','=','+','1','='], expected: '13', desc: '20÷5=4 の後 ×3=12 さらに +1=13' },
    { seq: ['3','.','5','×','2','=','+','1','.','5','=','÷','2','='], expected: '4.25', desc: '3.5×2=7 の後 +1.5=8.5 さらに ÷2=4' },
    { seq: ['9','9','+','1','=','÷','2','=','×','2','='], expected: '100', desc: '99+1=100 の後 ÷2=50 さらに ×2=100' }
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

  // 連続計算のテストケース
  continuousCalcCases.forEach(({ seq, expected, desc }) => {
    it(desc, () => {
      seq.forEach(ch => {
        if (ch === '=') {
          calc.calculateResult();
        } else {
          calc.appendValue(ch);
        }
      });
      expect(calc.display).toBe(expected);
    });
  });
});

describe('繰り返し演算テスト', () => {
  let calc: AppComponent;

  beforeEach(() => {
    calc = new AppComponent();
    calc.clearDisplay?.();
  });

  const repeatCalcCases = [
    { 
      sequence: ['8','+','='], 
      expected: ['16'], 
      desc: '8+= は 8+8=16'
    },
    { 
      sequence: ['8','+','=','=','='], 
      expected: ['16','24','32'], 
      desc: '8+= を3回押すと 8+8+8+8=32'
    },
    { 
      sequence: ['1','0','−','=','='], 
      expected: ['0','-10'], 
      desc: '10−= を2回押すと 10-10-10=-10'
    },
    { 
      sequence: ['4','×','=','='], 
      expected: ['16','64'], 
      desc: '4×= を2回押すと 4×4×4=64'
    },
    { 
      sequence: ['8','1','÷','=','='], 
      expected: ['1','1'], 
      desc: '81÷= を2回押すと 81÷81÷81'
    },
    { 
      sequence: ['2','.','5','+','=','='], 
      expected: ['5','7.5'], 
      desc: '小数の繰り返し演算 2.5+= を2回'
    },
    { 
      sequence: ['3','+','2','=','+','='], 
      expected: ['5','10'], 
      desc: '3+2=5の後に+= で 5+2=7'
    },
    { 
      sequence: ['1','0','−','5','=','−','='], 
      expected: ['5','0'], 
      desc: '10-5=5の後に−= で 5-5=0'
    }
  ];

  repeatCalcCases.forEach(({ sequence, expected, desc }) => {
    it(desc, () => {
      let resultIndex = 0;
      sequence.forEach(key => {
        if (key === '=') {
          calc.calculateResult();
          expect(calc.display).toBe(expected[resultIndex], `${resultIndex + 1}回目の計算結果が違います`);
          resultIndex++;
        } else {
          calc.appendValue(key);
        }
      });
    });
  });

  it('演算子の後の = で直前の数値で繰り返し演算される', () => {
    // 8+= のケース
    calc.appendValue('8');
    calc.appendValue('+');
    calc.calculateResult();
    expect(calc.display).toBe('16');
    expect(calc.rawDisplay).toBe('16');

    // さらに = を押すと +8 が繰り返される
    calc.calculateResult();
    expect(calc.display).toBe('24');
    expect(calc.rawDisplay).toBe('24');
  });

  it('通常の計算の後に演算子+= で直前の数値で繰り返し演算される', () => {
    // 8+9=17 の後に += で +9 が繰り返される
    calc.appendValue('8');
    calc.appendValue('+');
    calc.appendValue('9');
    calc.calculateResult();
    expect(calc.display).toBe('17');

    calc.appendValue('+');
    calc.calculateResult();
    expect(calc.display).toBe('34');
  });
});

