import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer, CustomerListResponse, CustomerResponse } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {}

  list(searchTerm: string = '', page: number = 1, perPage: number = 15): Observable<CustomerListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    if (searchTerm.trim()) {
      params = params.set('q', searchTerm.trim());
    }

    return this.http.get<CustomerListResponse>(this.baseUrl, { params });
  }

  get(id: number): Observable<CustomerResponse> {
    return this.http.get<CustomerResponse>(`${this.baseUrl}/${id}`);
  }

  create(customer: Customer): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(this.baseUrl, customer);
  }

  update(id: number, customer: Customer): Observable<CustomerResponse> {
    return this.http.put<CustomerResponse>(`${this.baseUrl}/${id}`, customer);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
