import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CustomerService } from './customer.service';
import { environment } from '../../environments/environment';

describe('CustomerService', () => {
  let service: CustomerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CustomerService]
    });

    service = TestBed.inject(CustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists customers with a search term', () => {
    service.list('jane').subscribe(response => {
      expect(response.data.length).toBe(1);
    });

    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/customers` && r.params.get('q') === 'jane'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ id: 1, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', contact_number: '123' }], meta: { total: 1, source: 'elasticsearch' } });
  });

  it('creates a customer', () => {
    const payload = { first_name: 'John', last_name: 'Smith', email: 'john@example.com', contact_number: '456' };

    service.create(payload).subscribe(response => {
      expect(response.data.email).toBe('john@example.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/customers`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 2, ...payload } });
  });

  it('deletes a customer', () => {
    service.delete(1).subscribe(response => {
      expect(response.message).toContain('deleted');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/customers/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Customer deleted successfully.' });
  });
});
