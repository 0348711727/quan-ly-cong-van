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
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcDatePickerComponent } from '../../commons/cc-date-picker/cc-date-picker.component';
import { CcInputComponent } from '../../commons/cc-input/cc-input.component';
import { CcSelectComponent } from '../../commons/cc-select/cc-select.component';
import {
  DocumentService,
  SearchParams,
} from '../../services/document.service';
import { HttpClientService } from '../../services/http-client.service';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';

// Define DocumentTypeValues as fallback if not available
const DocumentTypeValues = [
  { value: 'incoming', label: 'Incoming Document' },
  { value: 'outgoing', label: 'Outgoing Document' },
];

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
export class SearchDocumentComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  protected documentService = inject(DocumentService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
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

  viewInitialized = false;

  ngOnInit() {
    if (this.selectDocumentType) {
      this.selectDocumentType.value = 'incoming';
    }

    this.searchSubject.pipe(
      filter((query) => !!query),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading.set(true);
      }),
      switchMap((query) => {
        const searchType = this.searchForm.get('searchType')?.value;
        const filters = this.searchForm.get('filters')?.value;

        // Create a valid SearchParams object to pass to search methods
        const searchParams: SearchParams = {
          documentType: filters?.documentType || 'incoming',
          author: filters?.author || '',
          issuedDateFrom: filters?.issueDate || '',
          issuedDateTo: filters?.expirationDate || '',
          referenceNumber: filters?.documentNumber || '',
          summary: query || ''
        };

        if (searchType === 'incoming') {
          return this.documentService.searchIncomingDocuments$(searchParams).pipe(
            catchError((error) => {
              console.error('Error searching incoming documents:', error);
              return of([]);
            })
          );
        } else if (searchType === 'outgoing') {
          return this.documentService.searchOutgoingDocuments$(searchParams).pipe(
            catchError((error) => {
              console.error('Error searching outgoing documents:', error);
              return of([]);
            })
          );
        } else {
          // Since searchDocuments$ doesn't exist, we use searchIncomingDocuments$ as an alternative
          return this.documentService.searchIncomingDocuments$(searchParams).pipe(
            catchError((error) => {
              console.error('Error searching all documents:', error);
              return of([]);
            })
          );
        }
      }),
      tap((results) => {
        this.isLoading.set(false);
        // Ensure that results is an array before assigning it
        this.results.set(Array.isArray(results) ? results : []);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // Monitor form changes
    this.searchForm.get('query')?.valueChanges.pipe(
      tap((value) => {
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
        const query = this.searchForm.get('query')?.value;
        if (query?.trim()) {
          this.searchSubject.next(query);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  ngAfterViewInit() {
    // Mark that view has been initialized, so we can safely access ViewChild references
    this.viewInitialized = true;
    
    // Initial reset to ensure form controls are in sync with initial values
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
      
      // Sync other fields from searchParams if needed
      
      // Force change detection
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error synchronizing form controls:', error);
    }
  }

  onChangeSearch() {
    try {
      this.loading.set(true);
      
      // Reset pagination when performing a new search
      this.pageIndex.set(0);
      
      // Ensure we're inside NgZone for proper change detection
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

  search(params: any) {
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
            this.results.set([]); // Sync both result arrays
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
          
          // Update both result arrays to ensure consistency
          this.documents.set(docs);
          this.results.set(docs); // Sync the results signal as well

          // Sort documents by issuedDate
          this.sortDocumentsByIssuedDate();
          
          // Make sure to set loading to false before change detection
          this.loading.set(false);
          
          // Ensure change detection happens when we have the final results
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error processing search results:', error);
          this.documents.set([]);
          this.results.set([]);
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
        this.results.set([]); // Sync both result arrays
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
      this.results.set(sortedDocs); // Also update results signal for consistency
      
      // Force change detection
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error sorting documents:', e);
    }
  }

  reset() {
    this.clearResults();

    this.cdr.detectChanges();
  }

  /**
   * Reset all search fields and results
   */
  reset_temp() {
    // Run inside NgZone to ensure UI updates
    this.ngZone.run(() => {
      try {
        // Strategy 1: Reset the reactive form explicitly
        this.resetReactiveForm();
        
        // Strategy 2: Reset searchParams and trigger change detection
        this.searchParams.set({ documentType: 'incoming' });
        
        // Strategy 3: Direct DOM manipulation as a fallback
        this.resetInputElementsDirectly();
        
        // Strategy 4: Use component methods via ViewChild references
        if (this.viewInitialized) {
          this.resetFormComponents();
        }
        
        // Reset UI state
        this.clearResults();
        
        // Force change detection to update UI
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error during reset:', error);
      }
    });
  }
  
  /**
   * Reset the reactive form controls and trigger value changes
   */
  private resetReactiveForm() {
    // Reset the form model itself
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
    
    // Explicitly mark all controls as pristine and untouched
    Object.keys(this.searchForm.controls).forEach(key => {
      const control = this.searchForm.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
      
      // If it's a form group, reset all its child controls
      if (control?.get) {
        Object.keys(control.value || {}).forEach(childKey => {
          const childControl = control.get(childKey);
          childControl?.setValue('');
          childControl?.markAsPristine();
          childControl?.markAsUntouched();
          
          // Manually trigger valueChanges to ensure subscribers update
          childControl?.updateValueAndValidity({ emitEvent: true });
        });
      }
      
      // Manually trigger valueChanges to ensure subscribers update
      control?.updateValueAndValidity({ emitEvent: true });
    });
  }
  
  /**
   * Clear all results and reset display state
   */
  private clearResults() {
    // Clear both results arrays
    this.documents.set([]);
    this.results.set([]);
    this.hasSearched = false;

    // Reset pagination
    this.pageIndex.set(0);
    this.totalItems.set(0);

    // Reset display settings
    this.displayedColumns.set(this.incomingColumns);
    this.showNoAttachmentsMessage.set(false);
    
    // Force change detection to update UI
    this.cdr.detectChanges();
  }
  
  /**
   * Use direct DOM manipulation to reset input elements as a fallback
   */
  private resetInputElementsDirectly() {
    try {
      // Find all input elements within the form container
      const formContainer = document.querySelector('.main-container__formInput');
      if (!formContainer) {
        return;
      }
      
      // Reset standard input elements within custom components
      const inputElements = formContainer.querySelectorAll('input');
      inputElements.forEach(input => {
        const inputElement = input as HTMLInputElement;
        inputElement.value = '';
        
        // Trigger change event to ensure bound models are updated
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
      });
      
      // Reset mat-input elements
      const matInputs = formContainer.querySelectorAll('mat-input, .mat-input-element');
      matInputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
          
          // Trigger change event
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
      });
      
      // Clear any visible text/placeholder that might be displayed
      const inputContainers = formContainer.querySelectorAll('.mat-form-field');
      inputContainers.forEach(container => {
        // Try to find and clear any internal state
        const inputElement = container.querySelector('input');
        if (inputElement instanceof HTMLInputElement) {
          inputElement.value = '';
          
          // Try to reset any Angular Material specific properties
          try {
            // Mark the field as touched to ensure validation is triggered
            inputElement.blur();
            inputElement.focus();
            inputElement.blur();
          } catch (e) {
            // Ignore errors from these additional attempts
          }
        }
      });
    } catch (error) {
      console.error('Error resetting DOM elements directly:', error);
    }
  }
  
  /**
   * Reset individual form components
   * Separated for better error handling and clarity
   */
  private resetFormComponents() {
    try {
      // Reset document type select 
      if (this.selectDocumentType) {
        this.selectDocumentType.value = 'incoming';
        // Trigger change detection
        this.cdr.detectChanges();
      }

      // Reset date pickers with a more direct approach
      this.resetDatePickers();

      // Reset text inputs with a more direct approach
      this.resetTextInputs();
    } catch (error) {
      console.error('Error resetting form components:', error);
    }
  }
  
  /**
   * Reset date picker components
   */
  private resetDatePickers() {
    if (this.datePickerFrom) {
      this.datePickerFrom.writeValue('');
      // Don't directly assign to the value input signal as it's read-only
      // Instead, use component's methods or trigger events
    }

    if (this.datePickerTo) {
      this.datePickerTo.writeValue('');
      // Don't directly assign to the value input signal as it's read-only
    }
    
    // Force change detection after date pickers update
    this.cdr.detectChanges();
  }
  
  /**
   * Reset text input components
   */
  private resetTextInputs() {
    // Reset input fields - try multiple approaches to ensure they're cleared
    const inputComponents = [
      { name: 'inputNumber', ref: this.inputNumber },
      { name: 'inputAuthor', ref: this.inputAuthor },
      { name: 'inputSummary', ref: this.inputSummary }
    ];
    
    inputComponents.forEach(comp => {
      if (comp.ref) {
        // Try multiple ways to reset the value
        try {
          // Method 1: Using writeValue if available (use type assertion since it's dynamically checked)
          if (typeof (comp.ref as any).writeValue === 'function') {
            (comp.ref as any).writeValue('');
          }
          
          // Method 2: Trigger valueChange if it's an output
          if ((comp.ref as any).valueChange && typeof (comp.ref as any).valueChange.emit === 'function') {
            (comp.ref as any).valueChange.emit('');
          }
          
          // Method 3: Use onValueChange method if available
          if (typeof (comp.ref as any).onValueChange === 'function') {
            (comp.ref as any).onValueChange('');
          }
        } catch (e) {
          console.error(`Error resetting ${comp.name}:`, e);
        }
      }
    });
    
    // Force change detection after text inputs update
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
   * Update a field in searchParams
   * @param field Field name to update
   * @param value New value
   */
  updateSearchParam(field: string, value: any) {
    try {
      const currentParams = this.searchParams();
      const updatedParams = { ...currentParams } as Record<string, any>;

      // If document type changes
      if (field === 'documentType') {
        // Check if the value is actually different
        if (currentParams.documentType !== value) {
          // Reset the form except for document type
          this.ngZone.run(() => {
            // First update the document type value
            updatedParams[field] = value;
            this.searchParams.set(updatedParams as SearchParams);
            
            // Update displayed columns
            this.displayedColumns.set(
              value === 'incoming' ? this.incomingColumns : this.outgoingColumns
            );
            
            // Reset all form fields except document type
            this.resetFormForDocumentTypeChange(value);
            
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
      updatedParams[field] = value;
      this.searchParams.set(updatedParams as SearchParams);
    } catch (error) {
      console.error('Error updating search param:', error);
    }
  }
  
  /**
   * Reset form when document type changes
   * Special version of reset that preserves the selected document type
   */
  private resetFormForDocumentTypeChange(documentType: string) {
    try {
      // Reset the reactive form while preserving document type
      this.searchForm.reset({
        searchType: 'all',
        query: '',
        filters: {
          documentType: documentType,
          issueDate: '',
          expirationDate: '',
          status: '',
          receivedDate: '',
          documentNumber: '',
          signer: ''
        }
      });
      
      // Reset input fields using direct DOM manipulation
      this.resetInputElementsDirectly();
      
      // Reset results but keep document type
      this.clearResults();
    } catch (error) {
      console.error('Error during form reset for document type change:', error);
    }
  }
}
