import { Component, Input, Output, EventEmitter, signal, WritableSignal, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CcButtonComponent } from '../../../commons/cc-button/cc-button.component';
import { L10nTranslateAsyncPipe } from 'angular-l10n';

@Component({
  selector: 'app-finished-document',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, 
    MatPaginatorModule,
    CcButtonComponent,
    L10nTranslateAsyncPipe
  ],
  template: `
    <h2>Đã xử lý</h2>
    <table
      mat-table
      [dataSource]="finishedDocuments"
      class="mat-elevation-z8 demo-table"
    >
      <ng-container matColumnDef="stt">
        <th mat-header-cell *matHeaderCellDef>{{ "STT" }}</th>
        <td mat-cell *matCellDef="let element; let i = index">{{ currentPage * pageSize + i + 1 }}</td>
      </ng-container>

      <ng-container matColumnDef="documentNumber">
        <th mat-header-cell *matHeaderCellDef>
          {{ "documentNumber" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.documentNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="receivedDate">
        <th mat-header-cell *matHeaderCellDef>
          {{ "receivedDate" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.receivedDate }}</td>
      </ng-container>

      <ng-container matColumnDef="documentInfomation">
        <th mat-header-cell *matHeaderCellDef>
          {{ "documentInfomation" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.author }}</td>
      </ng-container>

      <ng-container matColumnDef="priority">
        <th mat-header-cell *matHeaderCellDef>
          {{ "priority" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.priority }}</td>
      </ng-container>

      <ng-container matColumnDef="dueDate">
        <th mat-header-cell *matHeaderCellDef>
          {{ "dueDate" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.dueDate }}</td>
      </ng-container>

      <ng-container matColumnDef="sender">
        <th mat-header-cell *matHeaderCellDef>
          {{ "sender" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.sender }}</td>
      </ng-container>

      <ng-container matColumnDef="content">
        <th mat-header-cell *matHeaderCellDef>
          {{ "content" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">{{ element.content }}</td>
      </ng-container>

      <ng-container matColumnDef="process">
        <th mat-header-cell *matHeaderCellDef>
          {{ "process" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">
          <div class="d-flex flex-column">
            <a href="javascript:void(0)" class="text-success" (click)="openDialog.emit()">Chuyển bổ sung</a>
          </div>
        </td>
      </ng-container>

      <ng-container matColumnDef="internalRecieve">
        <th mat-header-cell *matHeaderCellDef>
          {{ "internalRecieve" | translateAsync }}
        </th>
        <td mat-cell *matCellDef="let element">
          {{ element.internalRecieve }}
        </td>
      </ng-container>

      @if(finishedDocuments.length === 0) {
        <div class="text-center my-3">Không có dữ liệu</div>
      }
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row 
          *matRowDef="let row; columns: columns;" 
          [ngClass]="{'highlight-row': row.id === recentlyFinishedDocId}"
          [id]="'doc-' + row.id"
      ></tr>
    </table>
    <mat-paginator
      [length]="totalItems"
      [pageSize]="pageSize"
      [pageSizeOptions]="[5, 10, 25, 100]"
      [pageIndex]="currentPage"
      (page)="pageChanged.emit($event)"
      aria-label="Select page"
    >
    </mat-paginator>
  `,
  styles: [`
    .highlight-row {
      background-color: #b3e5fc;
      border-left: 4px solid #0288d1;
      animation: pulseBackground 1.5s ease-in-out;
      animation-iteration-count: 2;
      animation-fill-mode: forwards;
    }
    
    @keyframes pulseBackground {
      0% { background-color: #b3e5fc; }
      50% { background-color: #4fc3f7; }
      100% { background-color: #b3e5fc; }
    }
  `]
})
export class FinishedDocumentComponent implements AfterViewChecked {
  @Input() finishedDocuments: any[] = [];
  @Input() columns: string[] = [];
  @Input() currentPage = 0;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Input() recentlyFinishedDocId: string | null = null;
  
  @Output() pageChanged = new EventEmitter<PageEvent>();
  @Output() openDialog = new EventEmitter<void>();
  
  private previousFinishedDocId: string | null = null;
  
  ngAfterViewChecked() {
    // Kiểm tra nếu ID vừa được thay đổi
    if (this.recentlyFinishedDocId && this.recentlyFinishedDocId !== this.previousFinishedDocId) {
      this.scrollToHighlightedRow();
      this.previousFinishedDocId = this.recentlyFinishedDocId;
    }
  }
  
  scrollToHighlightedRow() {
    if (this.recentlyFinishedDocId) {
      setTimeout(() => {
        const element = document.getElementById(`doc-${this.recentlyFinishedDocId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // Đợi một chút để đảm bảo DOM đã được cập nhật
    }
  }
} 