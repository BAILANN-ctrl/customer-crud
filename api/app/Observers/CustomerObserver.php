<?php

namespace App\Observers;

use App\Models\Customer;
use App\Services\ElasticsearchService;

class CustomerObserver
{
    protected ElasticsearchService $elasticsearch;

    public function __construct(ElasticsearchService $elasticsearch)
    {
        $this->elasticsearch = $elasticsearch;
    }

    public function created(Customer $customer): void
    {
        $this->elasticsearch->index($customer);
    }

    public function updated(Customer $customer): void
    {
        $this->elasticsearch->index($customer);
    }

    public function deleted(Customer $customer): void
    {
        $this->elasticsearch->delete($customer->id);
    }
}
