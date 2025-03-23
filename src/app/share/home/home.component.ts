import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { L10nTranslateAsyncPipe } from 'angular-l10n';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { CcTableComponent } from '../../commons/cc-table/cc-table.component';
import { HttpClientService } from '../../services/http-client.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    L10nTranslateAsyncPipe,
    CcInputComponent,
    CcDatePickerComponent,
    MatLabel,
    CcButtonComponent,
    CcTableComponent,
    MatTableModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [MessageService],
})
export class HomeComponent {
  protected httpClient: HttpClientService = inject(HttpClientService);
  protected messageService: MessageService = inject(MessageService);
  // columns: WritableSignal<Column[]> = signal([
  //   { label: 'position' },
  //   { label: 'name' },
  //   { label: 'weight' },
  //   { label: 'symbol' },
  // ]);
  columns: WritableSignal<string[]> = signal([
    'stt',
    'documentNumber',
    'receivedDate',
    'documentInfomation',
    'priority',
    'dueDate',
    'sender',
    'content',
    'process',
    'processOperation',
  ]);
  document: WritableSignal<any> = signal([]);
  ngOnInit() {
    this.httpClient
      .comonGet({ url: `${environment.RESOURCE_URL}/incoming-documents` })
      .subscribe({
        next: (data: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Get data success',
          });
          this.document.set(data.document);
        },
      });
  }
}
