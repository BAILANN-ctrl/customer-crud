import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomerService } from '../../services/customer.service';
import { ApiValidationError } from '../../models/customer.model';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  form: FormGroup;
  customerId: number | null = null;
  isReadonly = false;
  isEditMode = false;
  loading = false;
  saving = false;
  errorMessage = '';
  fieldErrors: { [field: string]: string[] } = {};

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

  get f() {
    return this.form.controls;
  }

  loadCustomer(id: number): void {
    this.loading = true;
    this.customerService.get(id).subscribe({
      next: (response) => {
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

  cancel(): void {
    this.router.navigate(['/customers']);
  }
}
