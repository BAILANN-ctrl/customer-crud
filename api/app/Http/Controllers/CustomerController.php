<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    protected ElasticsearchService $elasticsearch;

    public function __construct(ElasticsearchService $elasticsearch)
    {
        $this->elasticsearch = $elasticsearch;
    }

    /**
     * GET /api/customers
     * GET /api/customers?q=jane
     *
     * Lists all customers. When a `q` query parameter is present, the list is
     * produced from the Elasticsearch index (search by name or email) instead
     * of a plain DB listing.
     */
    public function index(Request $request)
    {
        $term = trim((string) $request->query('q', ''));
        $perPage = (int) $request->query('per_page', 15);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 15;

        if ($term !== '') {
            $hits = $this->elasticsearch->search($term);
            $ids = array_column($hits, 'id');

            // Preserve DB-fresh data & ordering that matches the ES relevance order.
            $customers = Customer::whereIn('id', $ids)->get()->keyBy('id');
            $ordered = collect($ids)->map(fn ($id) => $customers->get($id))->filter()->values();

            return response()->json([
                'data' => $ordered,
                'meta' => [
                    'total' => $ordered->count(),
                    'search_term' => $term,
                    'source' => 'elasticsearch',
                ],
            ]);
        }

        $paginator = Customer::orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'source' => 'database',
            ],
        ]);
    }

    /**
     * POST /api/customers
     */
    public function store(Request $request)
    {
        $data = $this->validateCustomer($request);

        $customer = Customer::create($data);

        return response()->json(['data' => $customer], 201);
    }

    /**
     * GET /api/customers/{id}
     */
    public function show(int $id)
    {
        $customer = Customer::findOrFail($id);

        return response()->json(['data' => $customer]);
    }

    /**
     * PUT/PATCH /api/customers/{id}
     */
    public function update(Request $request, int $id)
    {
        $customer = Customer::findOrFail($id);

        $data = $this->validateCustomer($request, $customer->id);

        $customer->update($data);

        return response()->json(['data' => $customer->fresh()]);
    }

    /**
     * DELETE /api/customers/{id}
     */
    public function destroy(int $id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully.']);
    }

    /**
     * Shared validation rules for store/update. Email uniqueness ignores the
     * current record's own id when updating.
     */
    protected function validateCustomer(Request $request, ?int $ignoreId = null): array
    {
        $emailRule = 'required|email|max:255|unique:customers,email'.($ignoreId ? ",{$ignoreId}" : '');

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => $emailRule,
            'contact_number' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }
}
