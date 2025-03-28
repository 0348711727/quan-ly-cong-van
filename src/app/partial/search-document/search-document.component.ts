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
  ChangeDetectorRef,
  NgZone,
  AfterViewInit,
} from '@angular/core';
import { MatLabel } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { CcSelectComponent } from '../../commons/cc-select/cc-select.component';
import {
  DocumentService,
  SearchParams,
} from '../../services/document.service';

// Extended interface for local use
interface SearchResultDocument {
  id: number;
  documentNumber?: string;
  receivedDate?: string;
  issuedDate: string; // The original date as string
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
  // For sorting
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

// Define the empty form state
const emptySearchForm: SearchParams = {
  documentType: 'incoming',
  issuedDateFrom: '',
  issuedDateTo: '',
  author: '',
  referenceNumber: '',
  summary: ''
};

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
  ],
  templateUrl: './search-document.component.html',
  styleUrl: './search-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchDocumentComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  protected documentService = inject(DocumentService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  // Form data signal - single source of truth for form values
  searchParams: WritableSignal<SearchParams> = signal({ ...emptySearchForm });
  
  // UI state signals
  documents: WritableSignal<SearchResultDocument[]> = signal([]);
  loading: WritableSignal<boolean> = signal(false);
  hasSearched: boolean = false;
  showNoAttachmentsMessage = signal<boolean>(false);

  // Table columns configuration
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

  // Form options
  documentTypeOptions = [
    { value: 'incoming', label: 'Văn bản đến' },
    { value: 'outgoing', label: 'Văn bản đi' },
  ];

  // Pagination properties
  pageSize: WritableSignal<number> = signal(3);
  pageSizeOptions: number[] = [3, 25, 50, 100];
  pageIndex: WritableSignal<number> = signal(0);
  totalItems: WritableSignal<number> = signal(0);

  // ViewChild references for component access
  @ViewChild('selectDocumentType') selectDocumentType!: CcSelectComponent;
  @ViewChild('datePickerFrom') datePickerFrom!: CcDatePickerComponent;
  @ViewChild('datePickerTo') datePickerTo!: CcDatePickerComponent;
  @ViewChild('inputNumber') inputNumber!: CcInputComponent;
  @ViewChild('inputAuthor') inputAuthor!: CcInputComponent;
  @ViewChild('inputSummary') inputSummary!: CcInputComponent;

  viewInitialized = false;

  ngOnInit() {
    console.log('Search Document Component initialized');
  }

  ngAfterViewInit() {
    // Mark that view has been initialized, so we can safely access ViewChild references
    this.viewInitialized = true;
    
    // Initial sync to ensure form controls are in sync with initial values
    setTimeout(() => {
      this.syncFormControls();
    }, 0);
  }
  
  /**
   * Synchronize form controls with current values
   * This is needed because Angular's change detection might not pick up all changes
   */
  syncFormControls() {
    if (!this.viewInitialized) return;
    
    try {
      // Update document type selector
      if (this.selectDocumentType) {
        this.selectDocumentType.value = this.searchParams().documentType;
      }
      
      // Force change detection
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error synchronizing form controls:', error);
    }
  }

  onChangeSearch() {
    try {
      console.log('Starting search with params:', this.searchParams());
      this.loading.set(true);
      
      // Reset pagination when performing a new search
      this.pageIndex.set(0);
      
      // Execute search
      this.search(this.searchParams());
    } catch (error) {
      console.error('Error in onChangeSearch:', error);
      this.loading.set(false);
      this.hasSearched = true;
      this.documents.set([]);
      
      // Force change detection if there's an error
      this.cdr.detectChanges();
    }
  }

  search(params: SearchParams) {
    console.log('Executing search with params:', params);
    
    const searchParams = {
      ...params,
      page: this.pageIndex() + 1,
      pageSize: this.pageSize(),
    };
    
    // Make sure UI reflects the cleared state before new results arrive
    this.cdr.detectChanges();

    this.handleSearch(searchParams);
  }

  private searchDocuments(
    searchParams: any,
    searchFunction: (params: any) => Observable<any>
  ) {
    this.loading.set(true);
    
    // Force change detection to show loading state
    this.cdr.detectChanges();
    
    searchFunction(searchParams).subscribe({
      next: (response: any) => {      
        try {
          const {
            data: { documents, pagination },
          } = response as SearchDataResponse;

          // Update pagination information
          this.totalItems.set(pagination.totalItems);
          
          if (!documents || documents.length === 0) {          
            this.documents.set([]);
            this.hasSearched = true;
            this.loading.set(false);
            
            // Force change detection after getting empty results
            this.cdr.detectChanges();
            return;
          }
          
          // Keep dates as strings for display, but add additional properties for sorting
          const docs = (documents as SearchResultDocument[]).map((doc) => {
            // Create a copy of the document
            const docCopy = { ...doc };
            
            // Create a Date object only for sorting (not for display)
            docCopy.issuedDateObj = this.formatDate(doc.issuedDate);
            
            return docCopy;
          });
          
          // Update documents signal
          this.documents.set(docs);

          // Sort documents by issuedDate
          this.sortDocumentsByIssuedDate();
          
          // Make sure to set loading to false before change detection
          this.loading.set(false);
          
          // Ensure change detection happens when we have the final results
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error processing search results:', error);
          this.documents.set([]);
          this.hasSearched = true;
          this.loading.set(false);
          
          // Force change detection in case of error
          this.cdr.detectChanges();
        } finally {
          this.hasSearched = true;
          this.loading.set(false);
          
          // Final change detection to ensure UI is consistent with state
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Error searching documents:', err);
        this.documents.set([]);
        this.hasSearched = true;
        this.loading.set(false);
        
        // Force change detection after error
        this.cdr.detectChanges();
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
    } else {
      console.warn('Unknown document type:', searchParams.documentType);
      this.loading.set(false);
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
      const sortedDocs = [...this.documents()].sort((a: any, b: any) => {
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
      });
      
      this.documents.set(sortedDocs);
      
      // Force change detection
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error sorting documents:', e);
    }
  }

  reset() {
    try {
      console.log('Resetting search form');
      
      // Reset the form data signal to default values
      this.searchParams.set({ ...emptySearchForm });
      
      // Reset UI components
      this.resetFormComponents();
      
      // Clear results
      this.clearResults();
      
      // Update UI
      this.cdr.detectChanges();
      
      console.log('Form reset complete');
    } catch (error) {
      console.error('Error during form reset:', error);
    }
  }

  /**
   * Reset form components using ViewChild references
   */
  private resetFormComponents() {
    if (!this.viewInitialized) return;
    
    try {
      // Reset document type select if needed
      if (this.selectDocumentType) {
        this.selectDocumentType.value = this.searchParams().documentType;
      }

      // Reset date pickers
      if (this.datePickerFrom) {
        this.datePickerFrom.valueChange.emit('');
      }

      if (this.datePickerTo) {
        this.datePickerTo.valueChange.emit('');
      }

      // Reset text inputs
      if (this.inputNumber) {
        this.inputNumber.valueChange.emit('');
      }
      
      if (this.inputAuthor) {
        this.inputAuthor.valueChange.emit('');
      }
      
      if (this.inputSummary) {
        this.inputSummary.valueChange.emit('');
      }
      
      // Force change detection
      this.cdr.detectChanges();
      
      console.log('Form components reset');
    } catch (error) {
      console.error('Error resetting form components:', error);
    }
  }
  
  /**
   * Clear search results and reset display state
   */
  private clearResults() {
    // Clear results
    this.documents.set([]);
    this.hasSearched = false;

    // Reset pagination
    this.pageIndex.set(0);
    this.totalItems.set(0);

    // Reset display settings
    this.displayedColumns.set(
      this.searchParams().documentType === 'incoming' 
        ? this.incomingColumns 
        : this.outgoingColumns
    );
    
    // Force change detection to update UI
    this.cdr.detectChanges();
  }

  // Función estándar para descargar archivos adjuntos
  downloadAttachment(param1: string | number, param2?: number | string, param3?: string) {
    this.showNoAttachmentsMessage.set(false);
    
    if (typeof param1 === 'number' && typeof param2 === 'number') {
      // Case where param1 is documentId (number) and param2 is attachmentId (number)
      const documentId = param1;
      const attachmentId = param2;
      const filename = param3 || '';
      
      if (!attachmentId) {
        this.showNoAttachmentsMessage.set(true);
        return;
      }
      
      // The API expects a filename, we use 'temp' + attachmentId as default value
      const filenameToUse = `temp_${attachmentId}`;
      
      this.documentService.downloadAttachment$(filenameToUse, 'incoming')
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
    else if (typeof param1 === 'string') {
      // Caso original: param1 es filename (string), param2 es documentType (opcional)
      const filename = param1;
      const documentType = typeof param2 === 'string' ? param2 : this.searchParams().documentType;
      
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
   * Convert date string from DD/MM/YYYY or ISO format to Date object
   * This method helps handle dates correctly from different sources
   */
  formatDate(dateString: string | Date): Date | null {
    if (!dateString) return null;

    // Check if it's already a Date object
    if (dateString instanceof Date) return dateString;

    // Try parsing DD/MM/YYYY format
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Note: Month in JavaScript starts from 0, so subtract 1
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        // Validate date components
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          try {
            const date = new Date(year, month, day);
            if (isNaN(date.getTime())) return null;
            return date;
          } catch (e) {
            console.error('Error processing date:', e);
            return null;
          }
        }
      }
    }

    // Try parsing ISO or other formats
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error('Error processing date:', e);
      return null;
    }
  }

  /**
   * Handle field changes from form controls
   * @param field The field name to update
   * @param value The new value
   */
  onChange(field: string, value: string | undefined): void {
    try {
      const currentParams = this.searchParams();
      const updatedParams = { ...currentParams } as Record<string, any>;

      // If document type changes
      if (field === 'documentType') {
        // Ensure value is a string
        const docTypeValue: string = value || '';
        
        // Check if the value is actually different
        if (currentParams.documentType !== docTypeValue) {
          // Reset the form except for document type
          this.ngZone.run(() => {
            // First update the document type value
            updatedParams[field] = docTypeValue;
            this.searchParams.set(updatedParams as SearchParams);
            
            // Update displayed columns
            this.displayedColumns.set(
              docTypeValue === 'incoming' ? this.incomingColumns : this.outgoingColumns
            );
            
            // Reset all form fields except document type
            this.resetFormForDocumentTypeChange(docTypeValue);
            
            // Reset results table
            this.documents.set([]);
            this.hasSearched = false;
            
            // Reset pagination
            this.pageIndex.set(0);
            this.totalItems.set(0);
            
            // Update UI
            this.cdr.detectChanges();
          });
          
          return; // Exit early since we've handled everything
        }
      }
      
      // Handle normal field updates
      updatedParams[field] = value || '';
      this.searchParams.set(updatedParams as SearchParams);
      
      // For debugging
      console.log(`Field ${field} updated to: ${value}`);
      console.log('Current search params:', this.searchParams());
    } catch (error) {
      console.error('Error updating field value:', error);
    }
  }
  
  /**
   * Reset form for document type change
   * Preserves document type while clearing other fields
   */
  private resetFormForDocumentTypeChange(documentType: string) {
    try {
      // Create a new form state with the preserved document type
      const newParams: SearchParams = {
        ...emptySearchForm,
        documentType: documentType
      };
      
      // Update the form data signal
      this.searchParams.set(newParams);
      
      // Reset all input components
      this.resetFormComponents();
      
      // Clear results but keep document type
      this.clearResults();
      
      // For debugging
      console.log('Form reset for document type change:', documentType);
    } catch (error) {
      console.error('Error during form reset for document type change:', error);
    }
  }
}
