export interface Customer {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerListResponse {
  data: Customer[];
  meta: {
    total: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
    search_term?: string;
    source: 'database' | 'elasticsearch';
  };
}

export interface CustomerResponse {
  data: Customer;
}

export interface ApiValidationError {
  message: string;
  errors: { [field: string]: string[] };
}
