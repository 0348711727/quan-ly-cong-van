import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { L10nTranslateAsyncPipe } from 'angular-l10n';

@Component({
  selector: 'cc-toggle-group',
  imports: [MatButtonToggleModule, L10nTranslateAsyncPipe],
  templateUrl: './cc-toggle-group.component.html',
  styleUrl: './cc-toggle-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CcToggleGroupComponent {
  readonly activeClass: InputSignal<boolean> = input<boolean>(false);
  listToggle: any = input([]);
  value: InputSignal<any> = input('');
  valueChange = output();
  onChangeValue(event: any) {
    this.valueChange.emit(event.value);
  }
}
