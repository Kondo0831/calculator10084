import { Component } from '@angular/core';

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.css'],
  standalone: true
})
export class CalculatorComponent {
  display: string = '';
  isPercentage: boolean = false;
  buttons: string[] = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  onButtonClick(button: string) {
    if (button === '=') {
      this.calculateResult();
    } else {
      this.display += button;
    }
  }

  calculateResult() {
    try {
      let expression = this.display.replace(/,/g, '');
      if (this.isPercentage) {
        expression = expression.replace('%', '');
        expression = `${parseFloat(expression) / 100}`;
      }
      let result = eval(expression);
      this.display = result.toLocaleString();
      this.isPercentage = false;
    } catch {
      this.display = 'Error';
    }
  }

  clear() {
    this.display = '';
  }

  deleteLast() {
    if (this.display === 'Error') {
      this.clear();
      return;
    }
    this.display = this.display.slice(0, -1);
    if (!this.display.includes('%')) {
      this.isPercentage = false;
    }
  }

  applyPercentage() {
    if (this.display === '' || this.display.includes('%')) return;
    this.display += '%';
    this.isPercentage = true;
  }

  appendValue(value: string) {
    if (this.display === 'Error') {
      this.display = value;
    } else {
      this.display = this.formatNumber(this.display.replace(/,/g, '') + value);
    }
  }

  formatNumber(value: string): string {
    if (isNaN(Number(value.replace(/,/g, '').replace('%', '')))) return value;
    return Number(value.replace(/,/g, '').replace('%', '')).toLocaleString();
  }
}
