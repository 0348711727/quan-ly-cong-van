import {
  Component,
  inject,
  linkedSignal,
  signal,
  TemplateRef,
  viewChild,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { L10nTranslateAsyncPipe } from 'angular-l10n';
import { MessageService } from 'primeng/api';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import {
  CcDialogComponent,
  TEMPLATE_TYPE,
} from '../../commons/cc-dialog/cc-dialog.component';
import { CcLoadingComponent } from '../../commons/cc-loading/cc-loading.component';
import { CcToggleGroupComponent } from '../../commons/cc-toggle-group/cc-toggle-group.component';
import { DocumentService } from '../../services/document.service';
import { HttpClientService } from '../../services/http-client.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    L10nTranslateAsyncPipe,
    MatTableModule,
    CcButtonComponent,
    MatPaginatorModule,
    CcToggleGroupComponent,
    CcLoadingComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [MessageService],
})
export class HomeComponent {
  protected httpClient: HttpClientService = inject(HttpClientService);
  protected messageService: MessageService = inject(MessageService);
  protected router: Router = inject(Router);
  protected documentService: DocumentService = inject(DocumentService);
  protected dialog: MatDialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  value = signal('incomingDocuments');
  listToggle = signal([
    {
      label: 'incomingDocuments',
    },
    { label: 'outcomingDocuments' },
  ]);
  waitingColumns: WritableSignal<string[]> = signal([
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
  finnishColumns: WritableSignal<string[]> = signal([
    'stt',
    'documentNumber',
    'receivedDate',
    'documentInfomation',
    'priority',
    'dueDate',
    'sender',
    'content',
    'process',
  ]);

  readonly downloadTemplate =
    viewChild.required<TemplateRef<any>>('downloadTemplate');
  document: WritableSignal<any> = signal([]);
  documentWaiting = linkedSignal(() =>
    this.document().filter((doc: any) => doc.status === 'waiting')
  );
  documentFinish = linkedSignal(() =>
    this.document().filter((doc: any) => doc.status !== 'waiting')
  );
  ngOnInit() {
    this.getIncomingDocument();
  }
  addDocument() {
    this.router.navigateByUrl('add-document');
  }
  onChangeToggle(value: string): void {
    this.value.set(value);
    value === 'incomingDocuments'
      ? this.getIncomingDocument()
      : this.getOutComingDocument();
  }

  searchDocument() {
    this.router.navigateByUrl('search-document');
  }

  getIncomingDocument() {
    this.documentService.getIncomingDocument$().subscribe({
      next: (data: any) => {
        // this.messageService.add({
        //   severity: 'success',
        //   summary: 'Success',
        //   detail: 'Get data success',
        // });
        this.document.set(data.document);
      },
    });
  }
  getOutComingDocument() {
    this.documentService.getOutcomingDocument$().subscribe({
      next: (data: any) => {
        this.document.set(data.document);
      },
    });
  }
  openDialog() {
    const data = {
      title: 'Chọn người chuyển',
      templateType: TEMPLATE_TYPE.LITE,
    };

    // const template = this.downloadTemplate();

    const dialog = this.dialog.open(CcDialogComponent, { data });
    // dialog.componentInstance.tempDialog = template;
    return dialog;
  }
}
