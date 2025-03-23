import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

const baseHeaders = new HttpHeaders().set('X-Debug-Level', 'minimal');
@Injectable({
  providedIn: 'root',
})
export class HttpClientService {
  protected httpClient = inject(HttpClient);

  comonGet(props: { url: string; headers?: {}; params?: {} }) {
    const { url, headers, params } = props;
    return this.httpClient.get(url, {
      headers: baseHeaders,
    });
  }
  comonPost(props: { url: string; headers: {}; params: {}; body: {} }) {
    const { url, headers, params, body } = props;
    return this.httpClient.post(url, body, { headers: baseHeaders });
  }
  commonPatch(props: { url: string; headers: {}; params: {}; body: {} }) {
    const { url, headers, params, body } = props;

    return this.httpClient.patch(url, body, { headers: baseHeaders });
  }
  commonDelete(props: { url: string; headers: {}; params: {} }) {
    const { url, headers, params } = props;

    return this.httpClient.delete(url, { headers: baseHeaders });
  }
}
