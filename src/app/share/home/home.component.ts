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
        (finishDocument)="finishDocument($event)"
      ></app-waiting-document>

      <app-finished-document
        [finishedDocuments]="finishedDocuments()"
        [columns]="finnishColumns()"
        [currentPage]="finishedCurrentPage()"
        [pageSize]="finishedPageSize()"
        [totalItems]="finishedTotalItems()"
        [recentlyFinishedDocId]="recentlyFinishedDoc()"
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
  
  // Signal để theo dõi tài liệu vừa được kết thúc
  recentlyFinishedDoc = signal<string | null>(null);
  
  // Computed signals for filtered data
  waitingDocumentsAll = computed(() => {
    const filtered = this.allDocuments().filter(doc => doc.status === 'waiting');
    // Sắp xếp theo documentNumber tăng dần
    return filtered.sort((a, b) => {
      // Xử lý trường hợp documentNumber là chuỗi hoặc số
      const numA = typeof a.documentNumber === 'string' ? parseInt(a.documentNumber.replace(/\D/g, '')) : a.documentNumber;
      const numB = typeof b.documentNumber === 'string' ? parseInt(b.documentNumber.replace(/\D/g, '')) : b.documentNumber;
      return numA - numB;
    });
  });
  
  finishedDocumentsAll = computed(() => {
    const filtered = this.allDocuments().filter(doc => doc.status !== 'waiting');
    // Sắp xếp theo documentNumber tăng dần
    return filtered.sort((a, b) => {
      // Xử lý trường hợp documentNumber là chuỗi hoặc số
      const numA = typeof a.documentNumber === 'string' ? parseInt(a.documentNumber.replace(/\D/g, '')) : a.documentNumber;
      const numB = typeof b.documentNumber === 'string' ? parseInt(b.documentNumber.replace(/\D/g, '')) : b.documentNumber;
      return numA - numB;
    });
  });

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

  finishDocument(document: any) {
    // Tìm tài liệu trong mảng allDocuments
    const allDocs = this.allDocuments();
    const docIndex = allDocs.findIndex(doc => doc.id === document.id);
    
    if (docIndex !== -1) {
      // Thay đổi trạng thái từ "waiting" sang một giá trị khác (ví dụ: "finished")
      const updatedDoc = { ...allDocs[docIndex], status: 'finished' };
      
      // Cập nhật mảng allDocuments với tài liệu đã có trạng thái mới
      const newAllDocs = [...allDocs];
      newAllDocs[docIndex] = updatedDoc;
      
      // Gán lại mảng mới cho signal allDocuments
      this.allDocuments.set(newAllDocs);
      
      // Lưu ID của tài liệu vừa được kết thúc
      this.recentlyFinishedDoc.set(document.id);
      
      // Cập nhật tổng số tài liệu trong pagination
      const waitingDocs = newAllDocs.filter(doc => doc.status === 'waiting');
      const finishedDocs = newAllDocs.filter(doc => doc.status !== 'waiting');
      this.waitingTotalItems.set(waitingDocs.length);
      this.finishedTotalItems.set(finishedDocs.length);
      
      // Tìm tài liệu trong danh sách đã sắp xếp của finished
      const sortedFinishedDocs = finishedDocs.sort((a, b) => {
        const numA = typeof a.documentNumber === 'string' ? parseInt(a.documentNumber.replace(/\D/g, '')) : a.documentNumber;
        const numB = typeof b.documentNumber === 'string' ? parseInt(b.documentNumber.replace(/\D/g, '')) : b.documentNumber;
        return numA - numB;
      });
      
      // Tìm vị trí của tài liệu trong danh sách đã sắp xếp
      const docPositionInSorted = sortedFinishedDocs.findIndex(doc => doc.id === document.id);
      
      // Tính toán trang chứa tài liệu dựa trên kích thước trang
      if (docPositionInSorted !== -1) {
        const targetPage = Math.floor(docPositionInSorted / this.finishedPageSize());
        this.finishedCurrentPage.set(targetPage);
      } else {
        // Nếu không tìm thấy, mặc định về trang đầu tiên
        this.finishedCurrentPage.set(0);
      }
      
      // Hiển thị thông báo thành công
      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: `Tài liệu số ${document.documentNumber} đã được kết thúc`
      });
    }
  }
}
