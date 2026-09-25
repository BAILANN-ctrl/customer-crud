import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiValidationError, Customer } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  form: FormGroup;
  customerId: number | null = null;
  loadedCustomer: Customer | null = null;
  isReadonly = false;
  isEditMode = false;
  loading = false;
  saving = false;
  errorMessage = '';
  fieldErrors: { [field: string]: string[] } = {};

  readonly placeholderPhoto = 'assets/images/customers/customer-placeholder.svg';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService
  ) {
    this.form = this.fb.group({
      first_name: ['', [Validators.required, Validators.maxLength(255)]],
      last_name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      contact_number: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  get f() {
    return this.form.controls;
  }

  get pageTitle(): string {
    if (this.isReadonly) {
      return 'Customer details';
    }

    return this.isEditMode ? 'Edit customer' : 'New customer';
  }

  get pageDescription(): string {
    if (this.isReadonly) {
      return 'Review the information currently stored for this customer.';
    }

    if (this.isEditMode) {
      return 'Update the customer record and keep every detail accurate.';
    }

    return 'Add the essentials now. The profile can be refined later.';
  }

  get displayName(): string {
    const firstName = this.form.get('first_name')?.value?.trim();
    const lastName = this.form.get('last_name')?.value?.trim();
    const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return name || (this.isEditMode ? 'Customer profile' : 'New customer');
  }

  get displayEmail(): string {
    return this.form.get('email')?.value?.trim() || 'Email not added yet';
  }

  get customerInitials(): string {
    const firstInitial = this.form.get('first_name')?.value?.trim().charAt(0) || '';
    const lastInitial = this.form.get('last_name')?.value?.trim().charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'CU';
  }

  get customerReference(): string {
    return this.customerId ? `Customer #${this.customerId}` : 'New profile';
  }

  get customerSince(): string {
    return this.formatDate(this.loadedCustomer?.created_at);
  }

  ngOnInit(): void {
    this.isReadonly = this.route.snapshot.data['readonly'] === true;

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.customerId = Number(idParam);
      this.isEditMode = !this.isReadonly;
      this.loadCustomer(this.customerId);
    }

    if (this.isReadonly) {
      this.form.disable();
    }
  }

  loadCustomer(id: number): void {
    this.loading = true;
    this.customerService.get(id).subscribe({
      next: (response) => {
        this.loadedCustomer = response.data;
        this.form.patchValue(response.data);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Customer not found.';
        this.loading = false;
      }
    });
  }

  switchToEdit(): void {
    if (this.customerId) {
      this.router.navigate(['/customers', this.customerId, 'edit']);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    const payload = this.form.getRawValue();

    const request$ = this.isEditMode && this.customerId
      ? this.customerService.update(this.customerId, payload)
      : this.customerService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/customers']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        const body = err.error as ApiValidationError;
        if (err.status === 422 && body?.errors) {
          this.fieldErrors = body.errors;
        } else {
          this.errorMessage = 'Something went wrong while saving the customer.';
        }
      }
    });
  }

  customerPhoto(): string {
    return `assets/images/customers/customer-${this.customerId ?? 'new'}.jpg`;
  }

  formatDate(value?: string): string {
    if (!value) {
      return this.isEditMode ? 'Date unavailable' : 'Created on save';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  cancel(): void {
    this.router.navigate(['/customers']);
  }
}
