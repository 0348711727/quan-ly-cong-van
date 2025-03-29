import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import { Router } from '@angular/router';
import _ from 'lodash';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { environment } from '../../../environments/environment';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcDropdownComponent } from '../../commons/cc-dropdown/cc-dropdown.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { HttpClientService } from '../../services/http-client.service';
import { MESSAGE_CODES } from '../../share/constant';

export type Dropdown = { label: string; value: string | null }[];
@Component({
  selector: 'app-add-document',
  imports: [
    CcInputComponent,
    CcDatePickerComponent,
    MatLabel,
    CcButtonComponent,
    FileUploadModule,
    ToastModule,
    CcDropdownComponent,
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
    documentNumber?: string;
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
  documentTitle: WritableSignal<string> = signal('Tạo');
  isEditDocument = signal(false);
  dropdown: Signal<{
    documentType: Dropdown;
    priority: Dropdown;
    receivingMethod: Dropdown;
  }> = signal({
    documentType: [
      { label: 'Báo cáo', value: 'report' },
      { label: 'Công văn', value: 'correspondence' },
      { label: 'Kế hoạch', value: 'plan' },
      { label: 'Thông báo', value: 'announcement' },
      { label: 'Quyết định', value: 'decision' },
    ],
    priority: [
      { label: 'Thường', value: 'normal' },
      { label: 'Khẩn', value: 'urgent' },
    ],
    receivingMethod: [
      { label: 'Giấy', value: 'letter' },
      { label: 'Điện tử', value: 'email' },
    ],
  });
  constructor() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state;
    if (!state) return;
    this.isEditDocument.set(!state['action']);
    this.documentTitle.set(state['action'] ? 'Sửa' : 'Tạo');
    this.body.set(state['data']);
  }

  onChange(key: string, value: string) {
    this.body.update((prev) => {
      const old = _.cloneDeep(prev);
      _.set(old, [key], value);
      return old;
    });
  }
  save() {
    this.isEditDocument() ? this.patchDocument$() : this.saveDocument$();
  }
  onUpload(event: any) {
    console.log(event);
  }
  cancel() {
    this.router.navigate(['../']);
  }
  patchDocument$() {
    return this.httpCientService
      .commonPatch({
        url: `${environment.RESOURCE_URL}/incoming-documents/${
          this.body().documentNumber
        }`,
        body: {
          ..._.omit(_.cloneDeep(this.body()), 'internalRecipient'),
          status: 'finished',
        },
      })
      .subscribe({
        next: (data: any) => {
          if (data.message === MESSAGE_CODES.VALIDATION_FAILED) {
            this.error.set(data.errors);
            return;
          }
          this.body.set(this.emptyBody);
          this.error.set({});
          this.router.navigateByUrl('');
        },
        error: ({ error }) => {
          this.error.set(error.errors);
        },
      });
  }
  saveDocument$() {
    return this.httpCientService
      .comonPost({
        url: `${environment.RESOURCE_URL}/incoming-documents`,
        body: this.body(),
      })
      .subscribe({
        next: (data: any) => {
          if (data.message === MESSAGE_CODES.VALIDATION_FAILED) {
            this.error.set(data.errors);
            return;
          }
          this.body.set(this.emptyBody);
          this.error.set({});

          this.messageService.add({
            severity: 'success',
            summary: 'Success Message',
            detail: 'Thêm công văn thành công',
          });
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
}
