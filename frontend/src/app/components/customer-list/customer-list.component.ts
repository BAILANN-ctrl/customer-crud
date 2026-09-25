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
  deleting = false;

  customerPendingDelete: Customer | null = null;

  readonly placeholderPhoto = 'assets/images/customers/customer-placeholder.svg';
  readonly skeletonRows = [1, 2, 3, 4, 5];

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

  get resultSummary(): string {
    if (this.loading) {
      return 'Refreshing directory';
    }

    if (this.searchTerm.trim()) {
      const label = this.total === 1 ? 'match' : 'matches';
      return `${this.total} ${label} for “${this.searchTerm.trim()}”`;
    }

    return `${this.total} ${this.total === 1 ? 'customer' : 'customers'}`;
  }

  get emptyTitle(): string {
    return this.searchTerm.trim() ? 'No matching customers' : 'Your directory is ready';
  }

  get emptyCopy(): string {
    return this.searchTerm.trim()
      ? 'Try a different name or email, or clear the search to see everyone.'
      : 'Add your first customer to start building a clear, searchable directory.';
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
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
        this.customers = [];
        this.loading = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage || page === this.currentPage) {
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
    if (!this.deleting) {
      this.customerPendingDelete = null;
    }
  }

  deleteCustomer(): void {
    if (!this.customerPendingDelete?.id || this.deleting) {
      return;
    }

    const id = this.customerPendingDelete.id;
    this.deleting = true;

    this.customerService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Customer deleted successfully.';
        this.customerPendingDelete = null;
        this.deleting = false;
        this.fetchCustomers();
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to delete customer.';
        this.deleting = false;
      }
    });
  }

  customerInitials(customer: Customer): string {
    const firstInitial = customer.first_name.trim().charAt(0);
    const lastInitial = customer.last_name.trim().charAt(0);
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'CU';
  }

  customerPhoto(customer: Customer): string {
    return `assets/images/customers/customer-${customer.id ?? 'new'}.jpg`;
  }

  avatarTone(customer: Customer): number {
    return (customer.id ?? 0) % 4;
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Recently';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Recently';
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  trackByCustomerId(index: number, customer: Customer): number {
    return customer.id ?? index;
  }
}
