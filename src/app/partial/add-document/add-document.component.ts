import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import _ from 'lodash';
import moment from 'moment';
import { Button } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
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
    Button,
  ],
  templateUrl: './add-document.component.html',
  styleUrl: './add-document.component.scss',
})
export class AddDocumentComponent {
  protected httpCientService = inject(HttpClientService);
  body: WritableSignal<any> = signal({});
  error: WritableSignal<any> = signal({});

  onChange(key: string, value: string) {
    if (['receivedDate', 'issuedDate', 'dueDate'].includes(key)) {
      value = moment(value, 'DD/MM/YYYY').format('YYYY-MM-DD');
    }
    this.body.update((prev) => {
      const old = _.cloneDeep(prev);
      _.set(old, [key], value);
      return old;
    });
  }
  save() {
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
        },
        error: ({ error }) => {
          this.error.set(error.errors);
        },
      });
  }
  onUpload(event: any) {
    console.log(event);
  }
}
