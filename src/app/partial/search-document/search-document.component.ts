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
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, BorderStyle } from 'docx';

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
  signedBy?: string;
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
  paginatedDocuments: SearchResultDocument[];
  filteredDocuments: SearchResultDocument[];
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
  paginatedDocuments: WritableSignal<SearchResultDocument[]> = signal([]);
  filteredDocuments: WritableSignal<SearchResultDocument[]> = signal([]);
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

  private turnOffLoading() {
    this.loading.set(false);
  }
  
  private turnOnLoading() {
    this.loading.set(true);
  }

  private resetPageIndex() {
    this.pageIndex.set(0);
  }

  onChangeSearch() {
    try {
      console.log('Starting search with params:', this.searchParams());
      this.turnOnLoading();
      
      // Reset pagination when performing a new search
      this.resetPageIndex();
      
      // Execute search
      this.search(this.searchParams());
    } catch (error) {
      console.error('Error in onChangeSearch:', error);
      this.turnOffLoading();
      this.hasSearched = true;
      this.paginatedDocuments.set([]);
      
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
    this.turnOnLoading()
    
    // Force change detection to show loading state
    this.cdr.detectChanges();
    
    searchFunction(searchParams).subscribe({
      next: (response: SearchDataResponse) => {
        this.filteredDocuments.set(response.data.filteredDocuments);
        this.displaySearchResult(response);
      },
      error: (err: any) => {
        console.error('Error searching documents:', err);
        this.paginatedDocuments.set([]);
        this.hasSearched = true;
        this.turnOffLoading()
        
        // Force change detection after error
        this.cdr.detectChanges();
      },
    });
  }
  
  private displaySearchResult(response: SearchDataResponse) {
    try {
      const {
        data: { paginatedDocuments, pagination },
      } = response;

      // Update pagination information
      this.totalItems.set(pagination.totalItems);
      
      // Keep dates as strings for display, but add additional properties for sorting
      const docs = paginatedDocuments.map((doc) => {
        return {...doc, issuedDateObj: this.formatDate(doc.issuedDate)};
      });
      
      // Update documents signal
      this.paginatedDocuments.set(docs);

      // Sort documents by issuedDate
      this.sortDocumentsByIssuedDate();
      
      // Make sure to set loading to false before change detection
      this.turnOffLoading()
      
      // Ensure change detection happens when we have the final results
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error processing search results:', error);
      this.paginatedDocuments.set([]);
      this.hasSearched = true;
      this.turnOffLoading()
      
      // Force change detection in case of error
      this.cdr.detectChanges();
    } finally {
      this.hasSearched = true;
      this.turnOffLoading()
      
      // Final change detection to ensure UI is consistent with state
      this.cdr.detectChanges();
    }
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
      this.turnOffLoading()
    }
  }

  /**
   * Handle page change events from the paginator
   */
  onPageChange(event: PageEvent) {  
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);

    // Load data with new pagination settings
    this.turnOnLoading()
    this.search(this.searchParams());
  }

  /**
   * Sort the document list by issue date (issuedDate) in ascending order
   */
  sortDocumentsByIssuedDate() {
    try {
      const sortedDocs = [...this.paginatedDocuments()].sort((a: any, b: any) => {
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
      
      this.paginatedDocuments.set(sortedDocs);
      
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
    this.paginatedDocuments.set([]);
    this.hasSearched = false;

    // Reset pagination
    this.resetPageIndex()
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

  downloadAttachment(fileName: string) {
    this.showNoAttachmentsMessage.set(false);

    const documentType = this.selectDocumentType.value as string;
      
    this.documentService.downloadAttachment$(fileName, documentType).subscribe({
      next: (blob: any) => {
        // Create URL for blob and download
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = this.getShortFileName(fileName); // Use shorter name
        window.document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      },
      error: (error: unknown) => {
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
   * Convert date string from DD/MM/YYYY or ISO format to Date object
   * This method helps handle dates correctly from different sources
   */
  formatDate(dateString: string | Date): Date | null {
    if (!dateString) return null;

    // Check if it's already a Date object
    if (dateString instanceof Date) return dateString;

    // Try parsing DD/MM/YYYY format
    if (typeof dateString === 'string' && dateString.includes('/')) {
      // Match format DD/MM/YYYY
      const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = dateString.match(regex);

      if (!match) return null;
      
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Adjust for JS months (0-11)
      const year = parseInt(match[3], 10);
      
      const date = new Date(year, month, day);
      
      // Validate that the date is real (handles cases like 31/02/2023)
      if (date.getDate() === day && 
          date.getMonth() === month && 
          date.getFullYear() === year) {
        return date;
      }

      return null;
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

      if (field !== 'documentType') {
        // Handle normal field updates
        updatedParams[field] = value || '';
        this.searchParams.set(updatedParams as SearchParams);
        
        // For debugging
        console.log(`Field ${field} updated to: ${value}`);
        console.log('Current search params:', this.searchParams());

        return;
      }

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
          this.paginatedDocuments.set([]);
          this.filteredDocuments.set([]);
          this.hasSearched = false;
          
          // Reset pagination
          this.resetPageIndex()
          this.totalItems.set(0);
          
          // Update UI
          this.cdr.detectChanges();
        });
        
        return; // Exit early since we've handled everything
      }
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

  /**
   * Xuất dữ liệu hiển thị ra file Excel
   */
  exportToExcel(): void {
    try {
      this.loading.set(true);
      this.processAndExportData(this.filteredDocuments());
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      this.loading.set(false);
    }
  }
  
  /**
   * Xuất dữ liệu hiển thị ra file Word
   */
  exportToWord(): void {
    try {
      this.loading.set(true);
      
      // Kiểm tra dữ liệu
      const documents = this.filteredDocuments();
      if (documents.length === 0) {
        console.warn('Không có dữ liệu để xuất');
        this.loading.set(false);
        return;
      }
      
      // Tạo mảng header cho bảng Word
      let headerRow: TableRow;
      if (this.searchParams().documentType === 'incoming') {
        headerRow = new TableRow({
          children: [
            new TableCell({ 
              children: [new Paragraph({ text: 'TT', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Số đến', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Ngày đến', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Số ký hiệu', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Ngày văn bản', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Hạn xử lý', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Tác giả', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Trích yếu', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
          ],
        });
      } else {
        headerRow = new TableRow({
          children: [
            new TableCell({ 
              children: [new Paragraph({ text: 'TT', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Số ký hiệu', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Ngày văn bản', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Tác giả', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Trích yếu', alignment: 'center' })],
              shading: { color: "auto", fill: "D3D3D3" }, 
            }),
          ],
        });
      }
      
      // Tạo các hàng dữ liệu
      const rows: TableRow[] = [headerRow];
      
      documents.forEach((doc, index) => {
        if (this.searchParams().documentType === 'incoming') {
          // Hàng dữ liệu cho văn bản đến
          const dataRow = new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph(doc.documentNumber || '')] }),
              new TableCell({ children: [new Paragraph({ text: doc.receivedDate, alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph(doc.referenceNumber || '')] }),
              new TableCell({ children: [new Paragraph({ text: doc.issuedDate, alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph({ text: doc.dueDate, alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph(doc.author || '')] }),
              new TableCell({ children: [new Paragraph(doc.summary || '')] }),
            ],
          });
          rows.push(dataRow);
        } else {
          // Hàng dữ liệu cho văn bản đi
          const dataRow = new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph(doc.referenceNumber || '')] }),
              new TableCell({ children: [new Paragraph({ text: doc.issuedDate, alignment: 'center' })] }),
              new TableCell({ children: [new Paragraph(doc.signedBy || '')] }),
              new TableCell({ children: [new Paragraph(doc.summary || '')] }),
            ],
          });
          rows.push(dataRow);
        }
      });
      
      // Tạo bảng
      const table = new Table({
        rows,
        width: {
          size: 100,
          type: 'pct',
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
        },
        columnWidths: this.searchParams().documentType === 'incoming' ? 
          [600, 800, 1200, 1200, 1200, 1200, 1800, 3000] : 
          [600, 1500, 1200, 1800, 4000],
      });
      
      // Tạo tiêu đề
      const title = new Paragraph({
        text: this.searchParams().documentType === 'incoming' ? 'DANH SÁCH VĂN BẢN ĐẾN' : 'DANH SÁCH VĂN BẢN ĐI',
        heading: HeadingLevel.HEADING_1,
        alignment: 'center',
      });
      
      // Tạo thông tin tìm kiếm
      const searchInfo = [];
      if (this.searchParams().issuedDateFrom) {
        searchInfo.push(new Paragraph(`Từ ngày: ${this.searchParams().issuedDateFrom}`));
      }
      if (this.searchParams().issuedDateTo) {
        searchInfo.push(new Paragraph(`Đến ngày: ${this.searchParams().issuedDateTo}`));
      }
      if (this.searchParams().referenceNumber) {
        searchInfo.push(new Paragraph(`Số ký hiệu: ${this.searchParams().referenceNumber}`));
      }
      if (this.searchParams().author) {
        searchInfo.push(new Paragraph(`Tác giả: ${this.searchParams().author}`));
      }
      if (this.searchParams().summary) {
        searchInfo.push(new Paragraph(`Trích yếu: ${this.searchParams().summary}`));
      }

      const formatDateString = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          
          // Định dạng thành DD/MM/YYYY
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          
          return `${day}/${month}/${year}`;
        } catch {
          return dateStr;
        }
      };
      
      // Tạo ngày xuất báo cáo
      const reportDate = new Paragraph({
        text: `Ngày xuất báo cáo: ${formatDateString(new Date().toISOString())}`,
        alignment: 'right',
      });
      
      // Tạo document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              title,
              ...searchInfo,
              reportDate,
              new Paragraph(" "), // Khoảng trống
              table,
            ],
          },
        ],
      });
      
      // Xuất file
      Packer.toBlob(doc).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        
        const documentType = this.searchParams().documentType === 'incoming' ? 'Văn bản đến' : 'Văn bản đi';
        const fileName = `${documentType}_${new Date().toLocaleDateString('vi-VN')}.docx`;
        
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.loading.set(false);
      });
      
    } catch (error) {
      console.error('Lỗi khi xuất file Word:', error);
      this.loading.set(false);
    }
  }
  
  /**
   * Xử lý và xuất dữ liệu ra file Excel
   */
  private processAndExportData(documents: SearchResultDocument[]): void {
    try {
      if (documents.length === 0) {
        console.warn('Không có dữ liệu để xuất');
        this.loading.set(false);
        return;
      }
      
      // Tạo dữ liệu xuất theo thứ tự cột giống UI
      const exportData = documents.map((doc, index) => {
        // Base data cho cả văn bản đến và văn bản đi
        const data: any = {
          'TT': index + 1,
        };

        console.log(doc.issuedDate, 999);
        
        // Thêm dữ liệu theo thứ tự cột giống UI
        if (this.searchParams().documentType === 'incoming') {
          // Thứ tự cột cho văn bản đến
          data['Số đến'] = doc.documentNumber || '';
          data['Ngày đến'] = doc.receivedDate;
          data['Số ký hiệu'] = doc.referenceNumber || '';
          data['Ngày văn bản'] = doc.issuedDate;
          data['Hạn xử lý'] = doc.dueDate;
          data['Tác giả'] = doc.author || '';
          data['Trích yếu'] = doc.summary || '';
          data["Nội dung"] = doc.attachments?.join(', ') || '';
        } else {
          // Thứ tự cột cho văn bản đi
          data['Số ký hiệu'] = doc.referenceNumber || '';
          data['Ngày văn bản'] = doc.issuedDate;
          data['Tác giả'] = doc.signedBy || '';
          data['Trích yếu'] = doc.summary || '';
          data["Nội dung"] = doc.attachments?.join(', ') || '';
        }
        
        return data;
      });

      console.log(exportData, 999);
      
      // Tạo workbook Excel từ dữ liệu
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
      
      // Điều chỉnh chiều rộng cột cho dễ đọc
      let columnsWidth: any[] = [];
      
      if (this.searchParams().documentType === 'incoming') {
        columnsWidth = [
          { wch: 5 },  // TT
          { wch: 10 }, // Số đến
          { wch: 15 }, // Ngày đến  
          { wch: 15 }, // Số ký hiệu
          { wch: 15 }, // Ngày văn bản
          { wch: 15 }, // Hạn xử lý
          { wch: 25 }, // Tác giả
          { wch: 50 }, // Trích yếu
          { wch: 50 }, // Nội dung
        ];
      } else {
        columnsWidth = [
          { wch: 5 },  // TT
          { wch: 15 }, // Số ký hiệu
          { wch: 15 }, // Ngày văn bản
          { wch: 25 }, // Tác giả
          { wch: 50 }, // Trích yếu
          { wch: 50 }, // Nội dung
        ];
      }
      
      worksheet['!cols'] = columnsWidth;
      
      const workbook: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả tìm kiếm');
      
      // Tạo tên file xuất ra
      const documentType = this.searchParams().documentType === 'incoming' ? 'Văn bản đến' : 'Văn bản đi';
      const fileName = `${documentType}_${new Date().toLocaleDateString('vi-VN')}.xlsx`;
      
      // Xuất file Excel
      XLSX.writeFile(workbook, fileName);
      
      this.loading.set(false);
    } catch (error) {
      console.error('Lỗi khi xử lý và xuất dữ liệu Excel:', error);
      this.loading.set(false);
    }
  }
}
