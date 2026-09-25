<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;

class ReindexCustomers extends Command
{
    protected $signature = 'es:reindex';

    protected $description = 'Re-sync every customer row from MySQL into Elasticsearch';

    public function handle(ElasticsearchService $elasticsearch)
    {
        $elasticsearch->initIndex();

        $count = 0;
        Customer::query()->orderBy('id')->chunk(200, function ($customers) use ($elasticsearch, &$count) {
            foreach ($customers as $customer) {
                $elasticsearch->index($customer);
                $count++;
            }
        });

        $this->info("Reindexed {$count} customers into Elasticsearch.");
    }
}
