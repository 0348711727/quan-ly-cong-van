import {
  Component,
  inject,
  signal,
  TemplateRef,
  viewChild,
  ViewChild,
  WritableSignal,
  OnInit,
  computed,
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
import { DocumentService } from '../../services/document.service';
import { HttpClientService } from '../../services/http-client.service';
import { WaitingDocumentComponent } from './waiting-document/waiting-document.component';
import { FinishedDocumentComponent } from './finished-document/finished-document.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    L10nTranslateAsyncPipe,
    MatTableModule,
    CcButtonComponent,
    MatPaginatorModule,
    CcToggleGroupComponent,
    CcLoadingComponent,
    WaitingDocumentComponent,
    FinishedDocumentComponent
  ],
  template: `
    <div class="p-3">
      <div class="d-flex justify-content-between mb-3">
        <div>
          <cc-toggle-group
            [value]="value()"
            (valueChange)="onChangeToggle($event)"
            [activeClass]="true"
            [listToggle]="listToggle()"
          ></cc-toggle-group>
        </div>
        <div class="d-flex gap-2">
          <cc-button mode="secondary" (onClick)="searchDocument()">
            {{ "Tìm kiếm văn bản" }}
          </cc-button>
          <cc-button (onClick)="addDocument()">
            {{ "addDocument" | translateAsync }}
          </cc-button>
        </div>
      </div>

      <app-waiting-document
        [waitingDocuments]="waitingDocuments()"
        [columns]="waitingColumns()"
        [currentPage]="waitingCurrentPage()"
        [pageSize]="waitingPageSize()"
        [totalItems]="waitingTotalItems()"
        (pageChanged)="handleWaitingPageEvent($event)"
        (openDialog)="openDialog()"
      ></app-waiting-document>

      <app-finished-document
        [finishedDocuments]="finishedDocuments()"
        [columns]="finnishColumns()"
        [currentPage]="finishedCurrentPage()"
        [pageSize]="finishedPageSize()"
        [totalItems]="finishedTotalItems()"
        (pageChanged)="handleFinishedPageEvent($event)"
        (openDialog)="openDialog()"
      ></app-finished-document>
    </div>

    @if(this.httpClient.loading()) {
      <cc-loading></cc-loading>
    }
  `,
  styleUrl: './home.component.scss',
  providers: [MessageService],
})
export class HomeComponent implements OnInit {
  protected httpClient: HttpClientService = inject(HttpClientService);
  protected messageService: MessageService = inject(MessageService);
  protected router: Router = inject(Router);
  protected documentService = inject(DocumentService);
  protected dialog: MatDialog = inject(MatDialog);
  
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

  // Shared data from API
  allDocuments = signal<any[]>([]);
  
  // Computed signals for filtered data
  waitingDocumentsAll = computed(() => 
    this.allDocuments().filter(doc => doc.status === 'waiting')
  );
  
  finishedDocumentsAll = computed(() => 
    this.allDocuments().filter(doc => doc.status !== 'waiting')
  );

  // Computed signals for paginated data
  waitingDocuments = computed(() => {
    const filteredDocs = this.waitingDocumentsAll();
    const startIndex = this.waitingCurrentPage() * this.waitingPageSize();
    return filteredDocs.slice(startIndex, startIndex + this.waitingPageSize());
  });
  
  finishedDocuments = computed(() => {
    const filteredDocs = this.finishedDocumentsAll();
    const startIndex = this.finishedCurrentPage() * this.finishedPageSize();
    return filteredDocs.slice(startIndex, startIndex + this.finishedPageSize());
  });

  // Pagination signals for waiting documents
  waitingCurrentPage = signal<number>(0);
  waitingPageSize = signal<number>(3);
  waitingTotalItems = signal<number>(0);

  // Pagination signals for finished documents
  finishedCurrentPage = signal<number>(0);
  finishedPageSize = signal<number>(3);
  finishedTotalItems = signal<number>(0);

  ngOnInit() {
    this.loadAllDocuments();
  }

  addDocument() {
    this.router.navigateByUrl('add-document');
  }

  onChangeToggle(value: string): void {
    this.value.set(value);
    // Reset pagination
    this.waitingCurrentPage.set(0);
    this.waitingPageSize.set(10);
    this.finishedCurrentPage.set(0);
    this.finishedPageSize.set(10);
    
    // Reload data
    this.loadAllDocuments();
  }

  searchDocument() {
    this.router.navigateByUrl('search-document');
  }

  // Load all documents from API once
  loadAllDocuments() {
    const service = this.value() === 'incomingDocuments' 
      ? this.documentService.getDocuments(1, 1000) // Get a larger page size to have enough data for both tables
      : this.documentService.getOutgoingDocuments(1, 1000);

    service.subscribe({
      next: (response: any) => {
        if (response && response.data) {
          const { documents } = response.data;
          
          // Store all documents
          this.allDocuments.set(documents);
          
          // Calculate total items for each table
          const waitingDocs = documents.filter((doc: any) => doc.status === 'waiting');
          const finishedDocs = documents.filter((doc: any) => doc.status !== 'waiting');
          
          this.waitingTotalItems.set(waitingDocs.length);
          this.finishedTotalItems.set(finishedDocs.length);
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

  // Client-side pagination for waiting documents
  handleWaitingPageEvent(event: PageEvent) {
    console.log('Waiting pagination changed:', event);
    this.waitingPageSize.set(event.pageSize);
    this.waitingCurrentPage.set(event.pageIndex);
    // No need to call API again as we're using computed properties for pagination
  }

  // Client-side pagination for finished documents
  handleFinishedPageEvent(event: PageEvent) {
    console.log('Finished pagination changed:', event);
    this.finishedPageSize.set(event.pageSize);
    this.finishedCurrentPage.set(event.pageIndex);
    // No need to call API again as we're using computed properties for pagination
  }

  openDialog() {
    const data = {
      title: 'Chọn người chuyển',
      templateType: TEMPLATE_TYPE.LITE,
    };

    const dialog = this.dialog.open(CcDialogComponent, { data });
    return dialog;
  }
}
