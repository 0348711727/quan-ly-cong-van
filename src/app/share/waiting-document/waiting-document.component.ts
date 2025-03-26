import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { L10nTranslateAsyncPipe } from 'angular-l10n';

@Component({
  selector: 'app-waiting-document',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, 
    MatPaginatorModule,
    L10nTranslateAsyncPipe
  ],
  template: `
    <h2>Chờ xử lý</h2>
    <table
      mat-table
      [dataSource]="waitingDocuments"
      class="mat-elevation-z8 demo-table"
    >
      <!-- Column definitions unchanged -->

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>
    
    @if(waitingDocuments.length === 0) {
      <div class="text-center my-3">Không có dữ liệu</div>
    }
    
    <mat-paginator
      [length]="totalItems"
      [pageSize]="pageSize"
      [pageSizeOptions]="[5, 10, 25, 100]"
      [pageIndex]="currentPage"
      (page)="pageChanged.emit($event)"
      aria-label="Select page"
    >
    </mat-paginator>
  `
})
export class WaitingDocumentComponent {
  @Input() waitingDocuments: any[] = [];
  @Input() columns: string[] = [];
  @Input() currentPage = 0;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  
  @Output() pageChanged = new EventEmitter<PageEvent>();
  @Output() openDialog = new EventEmitter<void>();
} 