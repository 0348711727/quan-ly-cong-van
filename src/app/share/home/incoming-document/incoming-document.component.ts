import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { L10nTranslateAsyncPipe } from 'angular-l10n';
import { MOVE_CV } from '../../constant';
import { DocumentService } from '../../../services/document.service';
import { MessageService } from 'primeng/api';
import { RecipientLabelPipe } from '../../pipes/recipient-label.pipe';

@Component({
  selector: 'app-incoming-document',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    L10nTranslateAsyncPipe,
    RecipientLabelPipe,
  ],
  templateUrl: './incoming-document.component.html',
  styleUrl: './incoming-document.component.scss',
})
export class IncomingDocumentComponent implements OnInit {
  protected router: Router = inject(Router);
  protected documentService = inject(DocumentService);
  protected messageService = inject(MessageService);

  // Signals for component state
  allDocuments = signal<any[]>([]);
  waitingDocumentsAll = computed(() => {
    const filtered = this.allDocuments().filter(
      (doc) => doc.status === 'waiting'
    );
    return filtered.sort((a, b) => {
      const numA =
        typeof a.documentNumber === 'string'
          ? parseInt(a.documentNumber.replace(/\D/g, ''))
          : a.documentNumber;
      const numB =
        typeof b.documentNumber === 'string'
          ? parseInt(b.documentNumber.replace(/\D/g, ''))
          : b.documentNumber;
      return numA - numB;
    });
  });

  finishedDocumentsAll = computed(() => {
    const filtered = this.allDocuments().filter(
      (doc) => doc.status !== 'waiting'
    );
    return filtered.sort((a, b) => {
      const numA =
        typeof a.documentNumber === 'string'
          ? parseInt(a.documentNumber.replace(/\D/g, ''))
          : a.documentNumber;
      const numB =
        typeof b.documentNumber === 'string'
          ? parseInt(b.documentNumber.replace(/\D/g, ''))
          : b.documentNumber;
      return numA - numB;
    });
  });

  // Documents to display after pagination
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

  // Columns for incoming documents
  waitingColumns = signal([
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

  finishedColumns = signal([
    'stt',
    'documentNumber',
    'receivedDate',
    'documentInfomation',
    'priority',
    'dueDate',
    'sender',
    'content',
    'process',
    'internalRecipient',
  ]);

  // Pagination signals
  waitingCurrentPage = signal<number>(0);
  waitingPageSize = signal<number>(3);
  waitingTotalItems = signal<number>(0);

  finishedCurrentPage = signal<number>(0);
  finishedPageSize = signal<number>(3);
  finishedTotalItems = signal<number>(0);

  // Signal for highlighting recently finished document
  recentlyFinishedDoc = signal<string | null>(null);

  // Constants
  MOVE_CV = MOVE_CV;

  // Event outputs to parent component
  @Output() openMoveDialog = new EventEmitter<any>();

  ngOnInit() {
    this.loadIncomingDocuments();
  }

  loadIncomingDocuments() {
    this.documentService.getDocuments(1, 1000).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          const { documents } = response.data;

          // Store all documents
          this.allDocuments.set(documents);

          // Calculate total items for each table
          const waitingDocs = documents.filter(
            (doc: any) => doc.status === 'waiting'
          );
          const finishedDocs = documents.filter(
            (doc: any) => doc.status !== 'waiting'
          );

          this.waitingTotalItems.set(waitingDocs.length);
          this.finishedTotalItems.set(finishedDocs.length);
        }
      },
      error: (error: any) => {
        console.error('Error loading incoming documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load incoming documents',
        });
      },
    });
  }

  handleWaitingPageEvent(event: PageEvent) {
    this.waitingPageSize.set(event.pageSize);
    this.waitingCurrentPage.set(event.pageIndex);
  }

  handleFinishedPageEvent(event: PageEvent) {
    this.finishedPageSize.set(event.pageSize);
    this.finishedCurrentPage.set(event.pageIndex);
  }

  returnDocument(document: any) {
    localStorage.setItem('action', 'Sửa');
    this.router.navigateByUrl('add-document', { state: { data: document } });
  }

  finishDocument(document: any) {
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'finished', true)
      .subscribe({
        next: (response: any) => {
          const allDocs = this.allDocuments();
          const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

          if (docIndex !== -1) {
            // Cambiar el estado de "waiting" a "finished"
            const updatedDoc = { ...allDocs[docIndex], status: 'finished' };

            // Actualizar el array allDocuments con el documento modificado
            const newAllDocs = [...allDocs];
            newAllDocs[docIndex] = updatedDoc;

            // Asignar el nuevo array al signal allDocuments
            this.allDocuments.set(newAllDocs);

            // Guardar el ID del documento recién finalizado para resaltarlo
            this.recentlyFinishedDoc.set(document.id);

            // Actualizar el total de elementos en pagination
            const waitingDocs = newAllDocs.filter(
              (doc) => doc.status === 'waiting'
            );
            const finishedDocs = newAllDocs.filter(
              (doc) => doc.status !== 'waiting'
            );
            this.waitingTotalItems.set(waitingDocs.length);
            this.finishedTotalItems.set(finishedDocs.length);

            // Encontrar el documento en la lista ordenada de documentos finalizados
            const sortedFinishedDocs = finishedDocs.sort((a, b) => {
              const numA =
                typeof a.documentNumber === 'string'
                  ? parseInt(a.documentNumber.replace(/\D/g, ''))
                  : a.documentNumber;
              const numB =
                typeof b.documentNumber === 'string'
                  ? parseInt(b.documentNumber.replace(/\D/g, ''))
                  : b.documentNumber;
              return numA - numB;
            });

            // Encontrar la posición del documento en la lista ordenada
            const docPositionInSorted = sortedFinishedDocs.findIndex(
              (doc) => doc.id === document.id
            );

            // Calcular la página que contiene el documento según el tamaño de página
            if (docPositionInSorted !== -1) {
              const targetPage = Math.floor(
                docPositionInSorted / this.finishedPageSize()
              );
              this.finishedCurrentPage.set(targetPage);
            }
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Đã kết thúc văn bản số ${document.documentNumber}`,
          });
        },
        error: (error) => {
          console.error('Lỗi khi cập nhật trạng thái:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail:
              'Không thể cập nhật trạng thái văn bản. Vui lòng thử lại sau.',
          });
        },
      });
  }

  // Método para actualizar la lista después de transferir un documento
  updateAfterTransfer(document: any) {
    const allDocs = this.allDocuments();
    const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

    if (docIndex !== -1) {
      // Cambiar el estado de "waiting" a "finished"
      const updatedDoc = { ...allDocs[docIndex], status: 'finished' };

      // Actualizar el array allDocuments con el documento modificado
      const newAllDocs = [...allDocs];
      newAllDocs[docIndex] = updatedDoc;

      // Asignar el nuevo array al signal allDocuments
      this.allDocuments.set(newAllDocs);

      // Guardar el ID del documento recién transferido para resaltarlo
      this.recentlyFinishedDoc.set(document.id);

      // Actualizar el total de elementos en pagination
      const waitingDocs = newAllDocs.filter(
        (doc) => doc.status === 'waiting'
      );
      const finishedDocs = newAllDocs.filter(
        (doc) => doc.status !== 'waiting'
      );
      this.waitingTotalItems.set(waitingDocs.length);
      this.finishedTotalItems.set(finishedDocs.length);

      // Encontrar el documento en la lista ordenada de documentos finalizados
      const sortedFinishedDocs = finishedDocs.sort((a, b) => {
        const numA =
          typeof a.documentNumber === 'string'
            ? parseInt(a.documentNumber.replace(/\D/g, ''))
            : a.documentNumber;
        const numB =
          typeof b.documentNumber === 'string'
            ? parseInt(b.documentNumber.replace(/\D/g, ''))
            : b.documentNumber;
        return numA - numB;
      });

      // Encontrar la posición del documento en la lista ordenada
      const docPositionInSorted = sortedFinishedDocs.findIndex(
        (doc) => doc.id === document.id
      );

      // Calcular la página que contiene el documento según el tamaño de página
      if (docPositionInSorted !== -1) {
        const targetPage = Math.floor(
          docPositionInSorted / this.finishedPageSize()
        );
        this.finishedCurrentPage.set(targetPage);
      }
    }
  }
} 