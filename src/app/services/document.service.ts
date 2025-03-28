import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClientService } from './http-client.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface PaginationResponse {
  message: string;
  data: {
    documents: any[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private httpClientService = inject(HttpClientService);
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

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

  getDocuments(page: number = 1, pageSize: number = 10) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/incoming-documents`,
      params: { page, pageSize }
    });
  }

  getOutgoingDocuments(page: number = 1, pageSize: number = 10) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/outgoing-documents`,
      params: { page, pageSize }
    });
  }

  updateDocumentStatus(documentNumber: string, status: string, isIncoming: boolean = true) {
    const documentType = isIncoming ? 'incoming-documents' : 'outgoing-documents';
    return this.httpClientService.commonPatch({
      url: `${environment.RESOURCE_URL}/${documentType}/${documentNumber}/status`,
      headers: {},
      params: {},
      body: { status }
    });
  }

  updateDocument(documentNumber: string, updateData: any, isIncoming: boolean = true) {
    const documentType = isIncoming ? 'incoming-documents' : 'outgoing-documents';
    return this.httpClientService.commonPatch({
      url: `${environment.RESOURCE_URL}/${documentType}/${documentNumber}`,
      headers: {},
      params: {},
      body: updateData
    });
  }
}
