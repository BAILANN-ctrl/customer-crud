<?php

namespace App\Providers;

use App\Models\Customer;
use App\Observers\CustomerObserver;
use App\Services\ElasticsearchService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ElasticsearchService::class, function () {
            return new ElasticsearchService();
        });
    }

    public function boot(): void
    {
        Customer::observe(CustomerObserver::class);
    }
}
