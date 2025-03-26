import { Component, Input, Output, EventEmitter, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CcButtonComponent } from '../../../commons/cc-button/cc-button.component';
import { L10nTranslateAsyncPipe } from 'angular-l10n';

@Component({
  selector: 'app-waiting-document',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, 
    MatPaginatorModule,
    CcButtonComponent,
    L10nTranslateAsyncPipe
  ],
  template: `
    <h2>Chờ xử lý</h2>
    <table
      mat-table
      [dataSource]="waitingDocuments"
      class="mat-elevation-z8 demo-table"
    >
      <ng-container matColumnDef="stt">
        <th mat-header-cell *matHeaderCellDef>{{ "STT" }}</th>
        <td mat-cell *matCellDef="let element; let i = index">{{ i + 1 }}</td>
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
        <td class="d-flex m-1" mat-cell *matCellDef="let element">
          <cc-button (onClick)="openDialog.emit()">Chuyeenr</cc-button
          ><cc-button>tra lai</cc-button><cc-button>ket thuc</cc-button>
        </td>
      </ng-container>

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