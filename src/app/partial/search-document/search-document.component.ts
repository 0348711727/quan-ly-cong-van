import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  WritableSignal,
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
  ],
  templateUrl: './search-document.component.html',
  styleUrl: './search-document.component.scss',
})
export class SearchDocumentComponent implements OnInit {
  protected documentService = inject(DocumentService);
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

  ngOnInit() {
    if (this.selectDocumentType) {
      this.selectDocumentType.value = 'incoming';
    }
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

    console.log('Parámetros de búsqueda enviados:', searchParams);
    this.handleSearch(searchParams);
  }

  private searchDocuments(
    searchParams: any,
    searchFunction: (params: any) => Observable<any>
  ) {
    console.log('Llamando a searchDocuments con parámetros:', searchParams);
    searchFunction(searchParams).subscribe({
      next: (response: any) => {
        console.log('Respuesta de búsqueda recibida:', response);
        const {
          data: { documents, pagination },
        } = response as SearchDataResponse;

        // Update pagination information
        this.totalItems.set(pagination.totalItems);

        console.log('Documentos recibidos:', documents);
        
        // Verificar la estructura de los documentos recibidos 
        this.debugDocumentStructure(documents);
        
        // Mantener las fechas como strings para visualización, pero añadir propiedades adicionales para ordenamiento
        const docs = (documents as SearchResultDocument[]).map((doc) => {
          // Crear una copia del documento
          const docCopy = { ...doc };
          
          // Crear un objeto Date solo para ordenamiento (no para visualización)
          docCopy.issuedDateObj = this.formatDate(doc.issuedDate);
          
          return docCopy;
        });
        
        console.log('Documentos procesados:', docs);
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
    console.log('Tipo de documento a buscar:', searchParams.documentType);
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
   * Sắp xếp danh sách tài liệu theo ngày văn bản (issuedDate) tăng dần
   */
  sortDocumentsByIssuedDate() {
    try {
      this.documents.set(
        [...this.documents()].sort((a: any, b: any) => {
          // Xử lý trường hợp một trong hai tài liệu không có ngày văn bản
          if (!a.issuedDateObj) return 1; // Đẩy các tài liệu không có ngày xuống cuối
          if (!b.issuedDateObj) return -1;

          // So sánh hai ngày usando los objetos Date
          try {
            const dateA = a.issuedDateObj?.getTime() || 0;
            const dateB = b.issuedDateObj?.getTime() || 0;

            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;

            return dateA - dateB; // Sắp xếp tăng dần
          } catch (e) {
            console.error('Lỗi khi so sánh ngày:', e);
            return 0;
          }
        })
      );
    } catch (e) {
      console.error('Lỗi khi sắp xếp tài liệu:', e);
    }
  }

  reset() {
    // Xóa tất cả tham số tìm kiếm và đặt lại giá trị mặc định cho documentType
    this.searchParams.set({ documentType: 'incoming' });

    // Xóa kết quả tìm kiếm
    this.documents.set([]);
    this.hasSearched = false;

    // Reset pagination
    this.pageIndex.set(0);
    this.totalItems.set(0);

    // Reset các trường nhập liệu
    try {
      // Reset document type select về giá trị mặc định
      if (this.selectDocumentType) {
        this.selectDocumentType.value = 'incoming';
      }

      // Reset các date pickers
      if (this.datePickerFrom) {
        this.datePickerFrom.writeValue('');
      }

      if (this.datePickerTo) {
        this.datePickerTo.writeValue('');
      }

      // Reset các text inputs
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
      console.error('Lỗi khi đặt lại form:', error);
    }
  }

  downloadAttachment(filename: string) {
    const { documentType } = this.searchParams();
    this.documentService.downloadAttachment$(filename, documentType).subscribe({
      next: (blob: any) => {
        // Tạo URL cho blob và tải xuống
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = this.getShortFileName(filename); // Sử dụng tên ngắn gọn hơn
        window.document.body.appendChild(a);
        a.click();

        // Dọn dẹp
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      },
      error: (error) => {
        console.error('Lỗi khi tải tệp đính kèm', error);
        alert('Không thể tải tệp đính kèm. Vui lòng thử lại sau.');
      },
    });
  }

  /**
   * Chuyển đổi tên file từ format "1742310337699-github-recovery-codes.txt"
   * thành dạng ngắn gọn hơn bằng cách loại bỏ timestamp ở đầu
   */
  getShortFileName(filename: string): string {
    // Tách tên file theo dấu gạch ngang để lấy phần không chứa timestamp
    const parts = filename.split('-');

    // Nếu có timestamp ở đầu (format chuẩn), loại bỏ nó
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      // Loại bỏ phần đầu tiên (timestamp) và ghép lại các phần còn lại
      return parts.slice(1).join('-');
    }

    // Nếu không đúng format hoặc không có timestamp, trả về tên gốc
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
      console.log('No hay documentos para depurar');
      return;
    }
    
    const firstDoc = documents[0];
    console.log('Estructura del primer documento:', {
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
      console.log('Formato de issuedDate:', firstDoc.issuedDate);
    }
    if (firstDoc.receivedDate) {
      console.log('Formato de receivedDate:', firstDoc.receivedDate);
    }
    if (firstDoc.dueDate) {
      console.log('Formato de dueDate:', firstDoc.dueDate);
    }
  }
}
