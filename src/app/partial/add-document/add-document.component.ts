import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import { Router } from '@angular/router';
import _ from 'lodash';
import moment from 'moment';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { environment } from '../../../environments/environment';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { HttpClientService } from '../../services/http-client.service';
import { MESSAGE_CODES } from '../../share/constant';

@Component({
  selector: 'app-add-document',
  imports: [
    CcInputComponent,
    CcDatePickerComponent,
    MatLabel,
    CcButtonComponent,
    FileUploadModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './add-document.component.html',
  styleUrl: './add-document.component.scss',
})
export class AddDocumentComponent {
  protected messageService: MessageService = inject(MessageService);
  protected httpCientService: HttpClientService = inject(HttpClientService);
  protected router: Router = inject(Router);
  emptyBody = {
    receivedDate: '',
    issuedDate: '',
    referenceNumber: '',
    priority: '',
    type: '',
    author: '',
    summary: '',
    receivingMethod: '',
    dueDate: '',
    processingOpinion: '',
  };
  body: WritableSignal<{
    receivedDate: string;
    issuedDate: string;
    referenceNumber: string;
    priority: string;
    type: string;
    author: string;
    summary: string;
    receivingMethod: string;
    dueDate: string;
    processingOpinion: string;
  }> = signal(this.emptyBody);
  error: WritableSignal<any> = signal({});
  documentTitle: string = localStorage.getItem('action') ?? 'Soạn';
  bodyDate: WritableSignal<any> = signal({});
  onChange(key: string, value: string) {
    this.body.update((prev) => {
      const old = _.cloneDeep(prev);
      _.set(old, [key], value);
      return old;
    });
    if (['receivedDate', 'issuedDate', 'dueDate'].includes(key)) {
      value = moment(value, 'DD/MM/YYYY').format('YYYY-MM-DD');
      this.bodyDate.update((prev) => {
        const old = _.cloneDeep(prev);
        _.set(old, [key], value);
        return old;
      });
      return;
    }
  }
  save() {
    return this.httpCientService
      .comonPost({
        url: `${environment.RESOURCE_URL}/incoming-documents`,
        body: { ...this.body(), ...this.bodyDate() },
      })
      .subscribe({
        next: (data: any) => {
          if (data.message === MESSAGE_CODES.VALIDATION_FAILED) {
            this.error.set(data.errors);
            return;
          }
          this.body.set(this.emptyBody);
          this.bodyDate.set({});
          this.error.set({});
        },
        error: ({ error }) => {
          this.messageService.addAll([
            { severity: 'info', summary: 'Info', detail: 'First message' },
            { severity: 'warn', summary: 'Warning', detail: 'Second message' },
          ]);
          this.error.set(error.errors);
        },
      });
  }
  onUpload(event: any) {
    console.log(event);
  }
  cancel() {
    this.router.navigate(['../']);
  }
}
