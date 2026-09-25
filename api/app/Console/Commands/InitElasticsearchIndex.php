<?php

namespace App\Console\Commands;

use App\Services\ElasticsearchService;
use Illuminate\Console\Command;

class InitElasticsearchIndex extends Command
{
    protected $signature = 'es:init-index';

    protected $description = 'Create the Elasticsearch customers index if it does not already exist';

    public function handle(ElasticsearchService $elasticsearch)
    {
        $this->info('Ensuring Elasticsearch index exists...');
        $elasticsearch->initIndex();
        $this->info('Done.');
    }
}
