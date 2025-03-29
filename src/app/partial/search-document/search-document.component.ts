import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  WritableSignal,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
} from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Observable } from 'rxjs';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { CcSelectComponent } from '../../commons/cc-select/cc-select.component';
import {
  DocumentService,
  SearchParams,
} from '../../services/document.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, debounceTime, distinctUntilChanged, filter, switchMap, tap, catchError, of } from 'rxjs';
import { HttpClientService } from '../../services/http-client.service';
import { MatDialog } from '@angular/material/dialog';


// Interfaz extendida para uso local
interface SearchResultDocument {
  id: number;
  documentNumber?: string;
  receivedDate?: string;
  issuedDate: string; // La fecha original como cadena
  referenceNumber: string;
  author: string;
  summary: string;
  priority?: string;
  dueDate?: string;
  type?: string;
  receivingMethod?: string;
  attachments?: string[];
  processingOpinion?: string;
  status?: string;
  // Para ordenamiento
  issuedDateObj?: Date | null;
}

// Type for the entire response
interface SearchDataResponse {
  message: string;
  data: DocumentData;
}

// Type for the "data" property
interface DocumentData {
  documents: SearchResultDocument[];
  pagination: Pagination;
}

// Type for the pagination information
interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-search-document',
  standalone: true,
  imports: [
    CommonModule,
    CcInputComponent,
    CcDatePickerComponent,
    CcButtonComponent,
    MatLabel,
    MatTableModule,
    MatProgressSpinnerModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    MatPaginatorModule,
    CcSelectComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './search-document.component.html',
  styleUrl: './search-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchDocumentComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  protected documentService = inject(DocumentService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClientService);
  dialog = inject(MatDialog);

  searchParams: WritableSignal<SearchParams> = signal({
    documentType: 'incoming',
  });
  documents: WritableSignal<SearchResultDocument[]> = signal([]);
  loading: WritableSignal<boolean> = signal(false);
  hasSearched: boolean = false;

  // Định nghĩa các cột hiển thị cho từng loại văn bản
  incomingColumns: string[] = [
    'stt',
    'documentNumber',
    'receivedDate',
    'issuedDate',
    'dueDate',
    'referenceNumber',
    'author',
    'summary',
    'attachments',
  ];
  outgoingColumns: string[] = [
    'stt',
    'referenceNumber',
    'issuedDate',
    'author',
    'summary',
    'attachments',
  ];
  displayedColumns: WritableSignal<string[]> = signal(this.incomingColumns);

  documentTypeOptions = [
    { value: 'incoming', label: 'Văn bản đến' },
    { value: 'outgoing', label: 'Văn bản đi' },
  ];

  // Pagination properties
  pageSize: WritableSignal<number> = signal(2);
  pageSizeOptions: number[] = [2, 10, 25, 50];
  pageIndex: WritableSignal<number> = signal(0);
  totalItems: WritableSignal<number> = signal(0);

  @ViewChild('selectDocumentType') selectDocumentType!: CcSelectComponent;
  @ViewChild('datePickerFrom') datePickerFrom!: CcDatePickerComponent;
  @ViewChild('datePickerTo') datePickerTo!: CcDatePickerComponent;
  @ViewChild('inputNumber') inputNumber!: CcInputComponent;
  @ViewChild('inputAuthor') inputAuthor!: CcInputComponent;
  @ViewChild('inputSummary') inputSummary!: CcInputComponent;

  readonly searchTypes = [
    { value: 'all', label: 'All' },
    { value: 'incoming', label: 'Incoming' },
    { value: 'outgoing', label: 'Outgoing' }
  ];

  readonly documentTypes = DocumentTypeValues;

  private searchSubject = new BehaviorSubject<string>('');

  public searchForm: FormGroup = this.fb.group({
    searchType: ['all'],
    query: [''],
    filters: this.fb.group({
      documentType: [''],
      issueDate: [''],
      expirationDate: [''],
      status: [''],
      receivedDate: [''],
      documentNumber: [''],
      signer: ['']
    })
  });

  isLoading = signal<boolean>(false);
  results = signal<any[]>([]);
  emptyResults = computed(() => this.results().length === 0);
  showNoAttachmentsMessage = signal<boolean>(false);

  ngOnInit() {
    if (this.selectDocumentType) {
      this.selectDocumentType.value = 'incoming';
    }

    this.searchSubject.pipe(
      filter((query) => !!query),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        console.log('Processing search query...');
        this.isLoading.set(true);
      }),
      switchMap((query) => {
        const searchType = this.searchForm.get('searchType')?.value;
        const filters = this.searchForm.get('filters')?.value;

        if (searchType === 'incoming') {
          console.log('Searching incoming documents with query:', query);
          return this.documentService.searchIncomingDocuments$(query, filters).pipe(
            catchError((error) => {
              console.error('Error searching incoming documents:', error);
              return of([]);
            })
          );
        } else if (searchType === 'outgoing') {
          console.log('Searching outgoing documents with query:', query);
          return this.documentService.searchOutgoingDocuments$(query, filters).pipe(
            catchError((error) => {
              console.error('Error searching outgoing documents:', error);
              return of([]);
            })
          );
        } else {
          console.log('Searching all documents with query:', query);
          return this.documentService.searchDocuments$(query, filters).pipe(
            catchError((error) => {
              console.error('Error searching all documents:', error);
              return of([]);
            })
          );
        }
      }),
      tap((results) => {
        console.log('Search results:', results);
        this.isLoading.set(false);
        this.results.set(results);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // Monitor form changes
    this.searchForm.get('query')?.valueChanges.pipe(
      tap((value) => {
        console.log('Search query changed:', value);
        if (value?.trim()) {
          this.searchSubject.next(value);
        } else {
          this.results.set([]);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.searchForm.get('searchType')?.valueChanges.pipe(
      tap((value) => {
        console.log('Search type changed:', value);
        const query = this.searchForm.get('query')?.value;
        if (query?.trim()) {
          this.searchSubject.next(query);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // Monitor filter changes
    this.searchForm.get('filters')?.valueChanges.pipe(
      debounceTime(500),
      tap((filters) => {
        console.log('Filters changed:', filters);
        const query = this.searchForm.get('query')?.value;
        if (query?.trim()) {
          this.searchSubject.next(query);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  onChangeSearch() {
    try {
      this.loading.set(true);
      // Reset pagination when performing a new search
      this.pageIndex.set(0);
      this.search(this.searchParams());
    } catch (error) {
      console.error('Error in onChangeSearch:', error);
      this.loading.set(false);
      this.hasSearched = true;
      this.documents.set([]);
    }
  }

  search(params: any) {
    const searchParams = {
      ...params,
      page: this.pageIndex() + 1,
      pageSize: this.pageSize(),
    };

    this.handleSearch(searchParams);
  }

  private searchDocuments(
    searchParams: any,
    searchFunction: (params: any) => Observable<any>
  ) {
    searchFunction(searchParams).subscribe({
      next: (response: any) => {
        const {
          data: { documents, pagination },
        } = response as SearchDataResponse;

        // Update pagination information
        this.totalItems.set(pagination.totalItems);

        
        // Verify the structure of received documents 
        this.debugDocumentStructure(documents);
        
        // Keep dates as strings for display, but add additional properties for sorting
        const docs = (documents as SearchResultDocument[]).map((doc) => {
          // Create a copy of the document
          const docCopy = { ...doc };
          
          // Create a Date object only for sorting (not for display)
          docCopy.issuedDateObj = this.formatDate(doc.issuedDate);
          
          return docCopy;
        });
        
        this.documents.set(docs);

        // Sort documents by issuedDate
        this.sortDocumentsByIssuedDate();

        this.hasSearched = true;
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error searching documents:', err);
        this.documents.set([]);
        this.hasSearched = true;
        this.loading.set(false);
      },
    });
  }

  public handleSearch(searchParams: any) {
    if (searchParams.documentType === 'incoming') {
      this.searchDocuments(
        searchParams,
        this.documentService.searchIncomingDocuments$.bind(this.documentService)
      );
    } else if (searchParams.documentType === 'outgoing') {
      this.searchDocuments(
        searchParams,
        this.documentService.searchOutgoingDocuments$.bind(this.documentService)
      );
    }
  }

  /**
   * Handle page change events from the paginator
   */
  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);

    // Load data with new pagination settings
    this.loading.set(true);
    this.search(this.searchParams());
  }

  /**
   * Sort the document list by issue date (issuedDate) in ascending order
   */
  sortDocumentsByIssuedDate() {
    try {
      this.documents.set(
        [...this.documents()].sort((a: any, b: any) => {
          // Handle case where one of the two documents has no issue date
          if (!a.issuedDateObj) return 1; // Push documents without dates to the end
          if (!b.issuedDateObj) return -1;

          // Compare two dates using Date objects
          try {
            const dateA = a.issuedDateObj?.getTime() || 0;
            const dateB = b.issuedDateObj?.getTime() || 0;

            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;

            return dateA - dateB; // Sort in ascending order
          } catch (e) {
            console.error('Error comparing dates:', e);
            return 0;
          }
        })
      );
    } catch (e) {
      console.error('Error sorting documents:', e);
    }
  }

  reset() {
    // Clear all search parameters and reset documentType to default value
    this.searchParams.set({ documentType: 'incoming' });

    // Clear search results
    this.documents.set([]);
    this.hasSearched = false;

    // Reset pagination
    this.pageIndex.set(0);
    this.totalItems.set(0);

    // Reset input fields
    try {
      // Reset document type select to default value
      if (this.selectDocumentType) {
        this.selectDocumentType.value = 'incoming';
      }

      // Reset date pickers
      if (this.datePickerFrom) {
        this.datePickerFrom.writeValue('');
      }

      if (this.datePickerTo) {
        this.datePickerTo.writeValue('');
      }

      // Reset text inputs
      if (this.inputNumber) {
        if ('writeValue' in this.inputNumber) {
          (this.inputNumber as any).writeValue('');
        } else if ('value' in this.inputNumber) {
          (this.inputNumber as any).value = '';
        }
      }

      if (this.inputAuthor) {
        if ('writeValue' in this.inputAuthor) {
          (this.inputAuthor as any).writeValue('');
        } else if ('value' in this.inputAuthor) {
          (this.inputAuthor as any).value = '';
        }
      }

      if (this.inputSummary) {
        if ('writeValue' in this.inputSummary) {
          (this.inputSummary as any).writeValue('');
        } else if ('value' in this.inputSummary) {
          (this.inputSummary as any).value = '';
        }
      }
    } catch (error) {
      console.error('Error resetting form:', error);
    }
  }

  downloadAttachment(filename: string) {
    const { documentType } = this.searchParams();
    this.documentService.downloadAttachment$(filename, documentType).subscribe({
      next: (blob: any) => {
        // Create URL for blob and download
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = this.getShortFileName(filename); // Use shorter name
        window.document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      },
      error: (error) => {
        console.error('Error downloading attachment', error);
        alert('Unable to download attachment. Please try again later.');
      },
    });
  }

  /**
   * Convert filename from format "1742310337699-github-recovery-codes.txt"
   * to shorter form by removing the timestamp at the beginning
   */
  getShortFileName(filename: string): string {
    // Split filename by hyphen to get the part without timestamp
    const parts = filename.split('-');

    // If there is a timestamp at the beginning (standard format), remove it
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      // Remove the first part (timestamp) and join the remaining parts
      return parts.slice(1).join('-');
    }

    // If not in the right format or no timestamp, return the original name
    return filename;
  }

  /**
   * Chuyển đổi chuỗi ngày từ định dạng DD/MM/YYYY hoặc ISO sang đối tượng Date
   * Phương thức này giúp xử lý đúng định dạng ngày từ nhiều nguồn khác nhau
   */
  formatDate(dateString: string | Date): Date | null {
    if (!dateString) return null;

    // Kiểm tra nếu đã là đối tượng Date
    if (dateString instanceof Date) return dateString;

    // Thử xử lý với định dạng DD/MM/YYYY
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Lưu ý: Tháng trong JavaScript bắt đầu từ 0, nên cần trừ 1
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        // Kiểm tra tính hợp lệ của ngày tháng
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          try {
            const date = new Date(year, month, day);
            if (isNaN(date.getTime())) return null;
            return date;
          } catch (e) {
            console.error('Lỗi xử lý ngày tháng:', e);
            return null;
          }
        }
      }
    }

    // Thử xử lý ngày ISO hoặc các định dạng khác
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error('Lỗi xử lý ngày tháng:', e);
      return null;
    }
  }

  /**
   * Cập nhật một trường trong searchParams
   * @param field Tên trường cần cập nhật
   * @param value Giá trị mới
   */
  updateSearchParam(field: string, value: any) {
    try {
      const currentParams = this.searchParams();
      const updatedParams = { ...currentParams } as Record<string, any>;

      updatedParams[field] = value;

      // Cập nhật signal searchParams
      this.searchParams.set(updatedParams as SearchParams);

      // Nếu thay đổi loại văn bản
      if (field === 'documentType') {
        // Cập nhật các cột hiển thị
        this.displayedColumns.set(
          value === 'incoming' ? this.incomingColumns : this.outgoingColumns
        );

        // Reset bảng kết quả
        this.documents.set([]);
        this.hasSearched = false;

        // Reset pagination
        this.pageIndex.set(0);
        this.totalItems.set(0);
      }

      console.log('Updated search params:', updatedParams);
    } catch (error) {
      console.error('Error updating search param:', error);
    }
  }

  /**
   * Debug helper para verificar la estructura de los documentos recibidos
   */
  private debugDocumentStructure(documents: any[]) {
    if (!documents || documents.length === 0) {
      console.log('No documents to debug');
      return;
    }
    
    const firstDoc = documents[0];
    console.log('Structure of the first document:', {
      id: firstDoc.id,
      documentNumber: firstDoc.documentNumber,
      receivedDate: firstDoc.receivedDate,
      issuedDate: firstDoc.issuedDate,
      referenceNumber: firstDoc.referenceNumber,
      author: firstDoc.author,
      summary: firstDoc.summary,
      // Verificar tipos de datos
      issuedDateType: typeof firstDoc.issuedDate,
      authorType: typeof firstDoc.author,
      summaryType: typeof firstDoc.summary
    });
    
    // Verificar formatos de fecha
    if (firstDoc.issuedDate) {
      console.log('issuedDate format:', firstDoc.issuedDate);
    }
    if (firstDoc.receivedDate) {
      console.log('receivedDate format:', firstDoc.receivedDate);
    }
    if (firstDoc.dueDate) {
      console.log('dueDate format:', firstDoc.dueDate);
    }
  }

  downloadAttachment(documentId: number, attachmentId: number, filename: string) {
    this.showNoAttachmentsMessage.set(false);
    
    if (!attachmentId) {
      console.log('No attachment ID provided');
      this.showNoAttachmentsMessage.set(true);
      return;
    }

    console.log(`Downloading attachment ${attachmentId} for document ${documentId}`);
    
    this.documentService.downloadAttachment$(documentId, attachmentId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Error downloading attachment:', error);
          alert('Error downloading the attachment. Please try again.');
          return of(null);
        })
      )
      .subscribe((response: any) => {
        if (!response) return;
        
        console.log('Download successful');
        
        // Create blob from the response data
        const blob = new Blob([response], { type: 'application/octet-stream' });
        
        // Create a download link and trigger the download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `attachment-${attachmentId}.pdf`;
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
      });
  }

  openDocument(document: any) {
    const isIncoming = document.hasOwnProperty('sender');
    
    console.log(`Opening ${isIncoming ? 'incoming' : 'outgoing'} document:`, document);
    
    if (isIncoming) {
      window.open(`${environment.baseUrl}/home/incoming/${document.id}`, '_blank');
    } else {
      window.open(`${environment.baseUrl}/home/outgoing/${document.id}`, '_blank');
    }
  }

  clearSearch() {
    this.searchForm.reset({
      searchType: 'all',
      query: '',
      filters: {
        documentType: '',
        issueDate: '',
        expirationDate: '',
        status: '',
        receivedDate: '',
        documentNumber: '',
        signer: ''
      }
    });
    this.results.set([]);
    console.log('Search form cleared');
  }
}
