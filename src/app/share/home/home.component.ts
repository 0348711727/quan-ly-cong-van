import {
  Component,
  inject,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { L10nTranslateAsyncPipe } from 'angular-l10n';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { CcButtonComponent } from '../../commons/cc-button/cc-button.component';
import { CcToggleGroupComponent } from '../../commons/cc-toggle-group/cc-toggle-group.component';
import { HttpClientService } from '../../services/http-client.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    L10nTranslateAsyncPipe,
    MatTableModule,
    CcButtonComponent,
    MatPaginatorModule,
    CcToggleGroupComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [MessageService],
})
export class HomeComponent {
  protected httpClient: HttpClientService = inject(HttpClientService);
  protected messageService: MessageService = inject(MessageService);
  protected router: Router = inject(Router);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  value = signal('incomingDocuments');
  listToggle = signal([
    {
      label: 'incomingDocuments',
    },
    { label: 'outcomingDocuments' },
  ]);
  columns: WritableSignal<string[]> = signal([
    'stt',
    'documentNumber',
    'receivedDate',
    'documentInfomation',
    'priority',
    'dueDate',
    'sender',
    'content',
    'process',
    'processOperation',
  ]);
  document: WritableSignal<any> = signal([]);
  ngOnInit() {
    this.httpClient
      .comonGet({ url: `${environment.RESOURCE_URL}/incoming-documents` })
      .subscribe({
        next: (data: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Get data success',
          });
          this.document.set(data.document);
        },
      });
  }
  addDocument() {
    this.router.navigateByUrl('add-document');
  }
  onChangeToggle(value: any) {
    this.value.set(value);
  }

  searchDocument() {
    this.router.navigateByUrl('search-document');
  }
}
