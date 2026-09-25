<?php

namespace Tests;

use App\Services\ElasticsearchService;
use Laravel\Lumen\Testing\DatabaseMigrations;
use Laravel\Lumen\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use DatabaseMigrations;

    /**
     * Creates the application, and swaps the real Elasticsearch HTTP client
     * for a no-op fake so the test suite never needs a live ES cluster.
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->singleton(ElasticsearchService::class, function () {
            return new class extends ElasticsearchService {
                public function __construct() {}
                public function initIndex(): void {}
                public function index(\App\Models\Customer $customer): void {}
                public function delete(int $customerId): void {}
                public function search(string $term, int $size = 50): array { return []; }
            };
        });

        return $app;
    }
}
