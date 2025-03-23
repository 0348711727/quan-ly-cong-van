import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { L10nTranslateAsyncPipe } from 'angular-l10n';

@Component({
  selector: 'cc-select',
  standalone: true,
  imports: [L10nTranslateAsyncPipe],
  templateUrl: './cc-select.component.html',
  styleUrl: './cc-select.component.scss',
})
export class CcSelectComponent {
  options: { label: string; value: string | null }[] = [];
  private readonly elementRef: ElementRef = inject(ElementRef);
  constructor() {}
  @Output() onChange = new EventEmitter<string | null>();
  @ViewChild('dropdown') dropdown!: ElementRef;
  @Input() width: string = '';

  value: string | null = '';
  toggleDropdown() {
    const currentDisplay = this.dropdown.nativeElement.style.display;
    this.dropdown.nativeElement.style.display =
      currentDisplay === 'block' ? 'none' : 'block';
    console.log(this.dropdown.nativeElement.style.display);
  }
  selectValue(value: string | null) {
    this.value = value;
    this.onChange.emit(value);
    this.dropdown.nativeElement.style.display = 'none';
  }
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.handleFocusOut();
    }
  }

  handleFocusOut() {
    if (!this.dropdown) return;
    this.dropdown.nativeElement.style.display = 'none';
  }
}
