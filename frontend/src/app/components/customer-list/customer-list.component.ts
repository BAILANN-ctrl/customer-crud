import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Customer, CustomerListResponse } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html'
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  searchTerm = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  currentPage = 1;
  lastPage = 1;
  total = 0;
  source: 'database' | 'elasticsearch' = 'database';

  customerPendingDelete: Customer | null = null;

  private searchSubject = new Subject<string>();

  constructor(private customerService: CustomerService, private router: Router) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 1;
        this.fetchCustomers();
      });

    this.fetchCustomers();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  fetchCustomers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.customerService.list(this.searchTerm, this.currentPage).subscribe({
      next: (response: CustomerListResponse) => {
        this.customers = response.data;
        this.total = response.meta.total;
        this.source = response.meta.source;
        this.lastPage = response.meta.last_page ?? 1;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load customers. Please try again.';
        this.loading = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage) {
      return;
    }
    this.currentPage = page;
    this.fetchCustomers();
  }

  createCustomer(): void {
    this.router.navigate(['/customers/new']);
  }

  viewCustomer(customer: Customer): void {
    this.router.navigate(['/customers', customer.id]);
  }

  editCustomer(customer: Customer): void {
    this.router.navigate(['/customers', customer.id, 'edit']);
  }

  confirmDelete(customer: Customer): void {
    this.customerPendingDelete = customer;
  }

  cancelDelete(): void {
    this.customerPendingDelete = null;
  }

  deleteCustomer(): void {
    if (!this.customerPendingDelete?.id) {
      return;
    }

    const id = this.customerPendingDelete.id;

    this.customerService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Customer deleted successfully.';
        this.customerPendingDelete = null;
        this.fetchCustomers();
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to delete customer.';
        this.customerPendingDelete = null;
      }
    });
  }
}
