import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClientService } from './http-client.service';

export interface SearchParams {
  documentType: string;
  issuedDateFrom?: string;
  issuedDateTo?: string;
  author?: string;
  referenceNumber?: string;
  summary?: string;
}

export interface Document {
  referenceNumber: string;
  issuedDate: Date | null;
  author: string;
  summary: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private httpClientService = inject(HttpClientService);

  searchIncomingDocuments$(params: SearchParams) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/incoming-documents/search`,
      params: params,
    });
  }

  searchOutgoingDocuments$(params: SearchParams) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/outgoing-documents/search`,
      params: params,
    });
  }

  downloadAttachment$(filename: string, documentType: string) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/${
        documentType === 'incoming'
          ? 'incoming-documents'
          : 'outgoing-documents'
      }/attachments/${filename}`,
      responseType: 'blob',
    });
  }

  getIncomingDocument$() {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/incoming-documents`,
    });
  }
  getOutcomingDocument$() {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/outgoing-documents`,
    });
  }
}
