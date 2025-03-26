import {
  Component,
  inject,
  linkedSignal,
  signal,
  TemplateRef,
  viewChild,
  ViewChild,
  WritableSignal,
  OnInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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
import { DocumentService, PaginationResponse } from '../../services/document.service';
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
export class HomeComponent implements OnInit {
  protected httpClient: HttpClientService = inject(HttpClientService);
  protected messageService: MessageService = inject(MessageService);
  protected router: Router = inject(Router);
  protected documentService = inject(DocumentService);
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

  // Pagination signals
  currentPage = signal<number>(0); // 0-based for Material Paginator
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);

  ngOnInit() {
    this.loadDocuments();
  }

  addDocument() {
    this.router.navigateByUrl('add-document');
  }

  onChangeToggle(value: string): void {
    this.value.set(value);
    value === 'incomingDocuments'
      ? this.loadDocuments()
      : this.getOutComingDocument();
  }

  searchDocument() {
    this.router.navigateByUrl('search-document');
  }

  loadDocuments() {
    const service = this.value() === 'incomingDocuments' 
      ? this.documentService.getDocuments(this.currentPage() + 1, this.pageSize())
      : this.documentService.getOutgoingDocuments(this.currentPage() + 1, this.pageSize());

    service.subscribe({
      next: (response: any) => {
        if (response && response.data) {
          const { documents, pagination } = response.data;
          this.document.set(documents);
          this.totalItems.set(pagination.totalItems);
          this.pageSize.set(pagination.pageSize);
          this.currentPage.set(pagination.currentPage - 1);
        }
      },
      error: (error: any) => {
        console.error('Error loading documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load documents'
        });
      }
    });
  }

  getOutComingDocument() {
    this.loadDocuments();
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

  handlePageEvent(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.pageIndex);
    this.loadDocuments();
  }
}
