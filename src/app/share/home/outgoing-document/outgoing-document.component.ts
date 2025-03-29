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
  selector: 'app-outgoing-document',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    L10nTranslateAsyncPipe,
    RecipientLabelPipe,
  ],
  templateUrl: './outgoing-document.component.html',
  styleUrl: './outgoing-document.component.scss',
})
export class OutgoingDocumentComponent implements OnInit {
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

  // Columns for outgoing documents - different columns from incoming
  waitingColumns = signal([
    'stt',
    'documentNumber',
    'issuedDate',
    'author',
    'summary',
    'attachments',
    'process',
  ]);

  finishedColumns = signal([
    'stt',
    'documentNumber',
    'issuedDate',
    'author',
    'summary',
    'attachments',
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

  // Signal for highlighting recently recovered document
  recentlyRecoveredDoc = signal<string | null>(null);

  // Constants
  MOVE_CV = MOVE_CV;

  // Event outputs to parent component
  @Output() openMoveDialog = new EventEmitter<any>();

  ngOnInit() {
    this.loadOutgoingDocuments();
  }

  loadOutgoingDocuments() {
    this.documentService.getOutgoingDocuments(1, 1000).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          const { documents } = response.data;

          // Enriquecer los documentos con información sobre adjuntos
          const enhancedDocuments = documents.map((doc: any) => {
            return {
              ...doc,
              attachments: doc.fileUrls && doc.fileUrls.length > 0
            };
          });

          // Store all documents
          this.allDocuments.set(enhancedDocuments);

          // Calculate total items for each table
          const waitingDocs = enhancedDocuments.filter(
            (doc: any) => doc.status === 'waiting'
          );
          const finishedDocs = enhancedDocuments.filter(
            (doc: any) => doc.status !== 'waiting'
          );

          this.waitingTotalItems.set(waitingDocs.length);
          this.finishedTotalItems.set(finishedDocs.length);
        }
      },
      error: (error: any) => {
        console.error('Error loading outgoing documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load outgoing documents',
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
    this.router.navigateByUrl('add-outgoing-document', { state: { data: document } });
  }

  finishDocument(document: any) {
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'finished', false)
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

  // Método para publicar documento
  publishDocument(document: any) {
    console.log(`Publicando documento ${document.documentNumber}...`);
    
    // Actualizar estado en el servidor
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'finished', false)
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta del servidor:', response);
          
          // Una vez actualizado en el servidor, procedemos a actualizar la UI
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

            // Guardar el ID del documento recién publicado para resaltarlo
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

            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã phát hành văn bản số ${document.documentNumber}`,
            });
          } else {
            // Si no encontramos el documento en nuestro estado local, recargamos todos los documentos
            console.log('Documento no encontrado en estado local, recargando...');
            this.loadOutgoingDocuments();
            
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã phát hành văn bản số ${document.documentNumber}`,
            });
          }
        },
        error: (error) => {
          console.error('Lỗi khi phát hành văn bản:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể phát hành văn bản. Vui lòng thử lại sau.',
          });
        }
      });
  }

  // Método para publicación adicional de un documento
  additionalPublish(document: any) {
    // Mostrar mensaje de confirmación
    this.messageService.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: `Đang thực hiện phát hành bổ sung cho văn bản số ${document.documentNumber}`,
    });
    
    // Lógica para publicación adicional podría implementarse aquí
    // Por ahora solo mostramos un mensaje de éxito después de un breve retraso
    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: `Đã phát hành bổ sung văn bản số ${document.documentNumber}`,
      });
    }, 1000);
  }

  // Método para recuperar un documento
  recoverDocument(document: any) {
    console.log(`Recuperando documento ${document.documentNumber}...`);
    
    // Actualizar estado en el servidor
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'waiting', false)
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta del servidor:', response);
          
          // Una vez actualizado en el servidor, procedemos a actualizar la UI
          const allDocs = this.allDocuments();
          const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

          if (docIndex !== -1) {
            // Cambiar el estado de "finished" a "waiting"
            const updatedDoc = { ...allDocs[docIndex], status: 'waiting' };

            // Actualizar el array allDocuments con el documento modificado
            const newAllDocs = [...allDocs];
            newAllDocs[docIndex] = updatedDoc;

            // Asignar el nuevo array al signal allDocuments
            this.allDocuments.set(newAllDocs);

            // Guardar el ID del documento recién recuperado para resaltarlo
            this.recentlyRecoveredDoc.set(document.id);
            
            // Quitar resaltado después de 3 segundos
            setTimeout(() => {
              this.recentlyRecoveredDoc.set(null);
            }, 3000);

            // Actualizar el total de elementos en pagination
            const waitingDocs = newAllDocs.filter(
              (doc) => doc.status === 'waiting'
            );
            const finishedDocs = newAllDocs.filter(
              (doc) => doc.status !== 'waiting'
            );
            this.waitingTotalItems.set(waitingDocs.length);
            this.finishedTotalItems.set(finishedDocs.length);

            // Encontrar el documento en la lista ordenada de documentos en espera
            const sortedWaitingDocs = waitingDocs.sort((a, b) => {
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
            const docPositionInSorted = sortedWaitingDocs.findIndex(
              (doc) => doc.id === document.id
            );

            // Calcular la página que contiene el documento según el tamaño de página
            if (docPositionInSorted !== -1) {
              const targetPage = Math.floor(
                docPositionInSorted / this.waitingPageSize()
              );
              this.waitingCurrentPage.set(targetPage);
            }

            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã lấy lại văn bản số ${document.documentNumber}`,
            });
          } else {
            // Si no encontramos el documento en nuestro estado local, recargamos todos los documentos
            console.log('Documento no encontrado en estado local, recargando...');
            this.loadOutgoingDocuments();
            
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã lấy lại văn bản số ${document.documentNumber}`,
            });
          }
        },
        error: (error) => {
          console.error('Lỗi khi lấy lại văn bản:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể lấy lại văn bản. Vui lòng thử lại sau.',
          });
        }
      });
  }
} 