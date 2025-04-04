import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { environment } from '../../environments/environment';
import { SearchParams } from '../commons/constants';
import { HttpClientService } from './http-client.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private httpClientService = inject(HttpClientService);

  currentAdd: WritableSignal<string> = signal('');

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
      params: { page, pageSize },
    });
  }

  getOutgoingDocuments(page: number = 1, pageSize: number = 10) {
    return this.httpClientService.comonGet({
      url: `${environment.RESOURCE_URL}/outgoing-documents`,
      params: { page, pageSize },
    });
  }

  updateDocumentStatus(
    documentNumber: string,
    status: string,
    isIncoming: boolean = true
  ) {
    const documentType = isIncoming
      ? 'incoming-documents'
      : 'outgoing-documents';
    return this.httpClientService.commonPatch({
      url: `${environment.RESOURCE_URL}/${documentType}/${documentNumber}/status`,
      headers: {},
      params: {},
      body: { status },
    });
  }

  updateDocument(
    documentNumber: string,
    updateData: any,
    isIncoming: boolean = true
  ) {
    const documentType = isIncoming
      ? 'incoming-documents'
      : 'outgoing-documents';
    return this.httpClientService.commonPatch({
      url: `${environment.RESOURCE_URL}/${documentType}/${documentNumber}`,
      headers: {},
      params: {},
      body: updateData,
    });
  }
}
