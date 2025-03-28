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

          // Enhance documents with attachment information
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
            // Change status from "waiting" to "finished"
            const updatedDoc = { ...allDocs[docIndex], status: 'finished' };

            // Update allDocuments array with the modified document
            const newAllDocs = [...allDocs];
            newAllDocs[docIndex] = updatedDoc;

            // Assign new array to allDocuments signal
            this.allDocuments.set(newAllDocs);

            // Save ID of recently finished document to highlight it
            this.recentlyFinishedDoc.set(document.id);

            // Update total elements in pagination
            const waitingDocs = newAllDocs.filter(
              (doc) => doc.status === 'waiting'
            );
            const finishedDocs = newAllDocs.filter(
              (doc) => doc.status !== 'waiting'
            );
            this.waitingTotalItems.set(waitingDocs.length);
            this.finishedTotalItems.set(finishedDocs.length);

            // Find document in sorted list of finished documents
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

            // Find position of document in sorted list
            const docPositionInSorted = sortedFinishedDocs.findIndex(
              (doc) => doc.id === document.id
            );

            // Calculate page containing document according to page size
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

  // Method for document recovery
  publishDocument(document: any) {
    console.log(`Publishing document ${document.documentNumber}...`);
    
    // Update status on the server
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'finished', false)
      .subscribe({
        next: (response: any) => {
          console.log('Server response:', response);
          
          // Once updated on server, proceed to update UI
          const allDocs = this.allDocuments();
          const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

          if (docIndex !== -1) {
            // Change status from "waiting" to "finished"
            const updatedDoc = { ...allDocs[docIndex], status: 'finished' };

            // Update allDocuments array with modified document
            const newAllDocs = [...allDocs];
            newAllDocs[docIndex] = updatedDoc;

            // Assign new array to allDocuments signal
            this.allDocuments.set(newAllDocs);
            
            // Save ID of recently finished document to highlight it
            this.recentlyFinishedDoc.set(document.id);
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              this.recentlyFinishedDoc.set(null);
            }, 3000);

            // Update total elements in pagination
            const waitingDocs = newAllDocs.filter(
              (doc) => doc.status === 'waiting'
            );
            const finishedDocs = newAllDocs.filter(
              (doc) => doc.status !== 'waiting'
            );
            this.waitingTotalItems.set(waitingDocs.length);
            this.finishedTotalItems.set(finishedDocs.length);

            // Find document in sorted list of finished documents
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

            // Find position of document in sorted list
            const docPositionInSorted = sortedFinishedDocs.findIndex(
              (doc) => doc.id === document.id
            );

            // Calculate page containing document according to page size
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
            // If document not found in local state, reload all documents
            console.log('Document not found in local state, reloading...');
            this.loadOutgoingDocuments();
            
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã phát hành văn bản số ${document.documentNumber}`,
            });
          }
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Unable to publish document. Please try again later.',
          });
        }
      });
  }

  // Method for additional publishing of a document
  additionalPublish(document: any) {
    // Show confirmation message
    this.messageService.add({
      severity: 'info',
      summary: 'Thông báo',
      detail: `Đang thực hiện phát hành bổ sung cho văn bản số ${document.documentNumber}`,
    });
    
    // Logic for additional publication could be implemented here
    // For now we just show a success message after a brief delay
    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: `Đã phát hành bổ sung văn bản số ${document.documentNumber}`,
      });
    }, 1000);
  }

  // Method to recover a document
  recoverDocument(document: any) {
    console.log(`Recovering document ${document.documentNumber}...`);
    
    // Update status on the server
    this.documentService
      .updateDocumentStatus(document.documentNumber, 'waiting', false)
      .subscribe({
        next: (response: any) => {
          console.log('Server response:', response);
          
          // Once updated on server, proceed to update UI
          const allDocs = this.allDocuments();
          const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

          if (docIndex !== -1) {
            // Change status from "finished" to "waiting"
            const updatedDoc = { ...allDocs[docIndex], status: 'waiting' };

            // Update allDocuments array with modified document
            const newAllDocs = [...allDocs];
            newAllDocs[docIndex] = updatedDoc;

            // Assign new array to allDocuments signal
            this.allDocuments.set(newAllDocs);
            
            // Save ID of recently recovered document to highlight it
            this.recentlyRecoveredDoc.set(document.id);
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              this.recentlyRecoveredDoc.set(null);
            }, 3000);

            // Update total elements in pagination
            const waitingDocs = newAllDocs.filter(
              (doc) => doc.status === 'waiting'
            );
            const finishedDocs = newAllDocs.filter(
              (doc) => doc.status !== 'waiting'
            );
            this.waitingTotalItems.set(waitingDocs.length);
            this.finishedTotalItems.set(finishedDocs.length);

            // Find document in sorted list of waiting documents
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

            // Find position of document in sorted list
            const docPositionInSorted = sortedWaitingDocs.findIndex(
              (doc) => doc.id === document.id
            );

            // Calculate page containing document according to page size
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
            // If document not found in local state, reload all documents
            console.log('Document not found in local state, reloading...');
            this.loadOutgoingDocuments();
            
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã lấy lại văn bản số ${document.documentNumber}`,
            });
          }
        },
        error: (error) => {
          console.error('Error when recovering document:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Cannot recover document. Please try again later.',
          });
        }
      });
  }

  updateAfterPublish(document: any) {
    const allDocs = this.allDocuments();
    const docIndex = allDocs.findIndex((doc) => doc.id === document.id);

    if (docIndex !== -1) {
      // Change status from "waiting" to "finished"
      const updatedDoc = { ...allDocs[docIndex], status: 'finished' };

      // Update allDocuments array with the modified document
      const newAllDocs = [...allDocs];
      newAllDocs[docIndex] = updatedDoc;

      // Assign the new array to allDocuments signal
      this.allDocuments.set(newAllDocs);

      // Save the ID of the recently finished document to highlight it
      this.recentlyFinishedDoc.set(document.id);

      // Update total items in pagination
      const waitingDocs = newAllDocs.filter(
        (doc) => doc.status === 'waiting'
      );
      const finishedDocs = newAllDocs.filter(
        (doc) => doc.status !== 'waiting'
      );
      this.waitingTotalItems.set(waitingDocs.length);
      this.finishedTotalItems.set(finishedDocs.length);

      // Find the position of the document in the sorted list
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

      // Find the position of the document in the sorted list
      const docPositionInSorted = sortedFinishedDocs.findIndex(
        (doc) => doc.id === document.id
      );

      // Calculate the page containing the document according to the page size
      if (docPositionInSorted !== -1) {
        const targetPage = Math.floor(
          docPositionInSorted / this.finishedPageSize()
        );
        this.finishedCurrentPage.set(targetPage);
      }
    }
  }
} 