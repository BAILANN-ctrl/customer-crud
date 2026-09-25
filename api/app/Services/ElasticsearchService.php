<?php

namespace App\Services;

use App\Models\Customer;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around the Elasticsearch REST API using Guzzle directly.
 * Intentionally does NOT use Laravel/Lumen Scout, per the challenge spec.
 */
class ElasticsearchService
{
    protected Client $client;
    protected string $index;

    public function __construct(?Client $client = null, ?string $host = null, ?string $index = null)
    {
        $this->index = $index ?? $this->configValue('services.elasticsearch.index', 'customers');

        $this->client = $client ?? new Client([
            'base_uri' => rtrim($host ?? $this->configValue('services.elasticsearch.host', 'http://searcher:9200'), '/').'/',
            'timeout' => 5,
        ]);
    }

    /**
     * Reads from the Laravel/Lumen config() helper when the app container is
     * booted, otherwise falls back to a plain default. This keeps the class
     * usable in isolated (non-Lumen) unit tests.
     */
    protected function configValue(string $key, string $default): string
    {
        return app()->bound('config')
            ? (string) config($key, $default)
            : $default;
    }

    /**
     * Create the `customers` index with an explicit mapping, if it doesn't exist yet.
     */
    public function initIndex(): void
    {
        try {
            $exists = $this->client->head($this->index);
        } catch (GuzzleException $e) {
            // HEAD on a missing index throws a 404 GuzzleException - that's expected.
            $exists = null;
        }

        if ($exists && $exists->getStatusCode() === 200) {
            return;
        }

        try {
            $this->client->put($this->index, [
                'json' => [
                    'mappings' => [
                        'properties' => [
                            'id' => ['type' => 'integer'],
                            'first_name' => ['type' => 'text'],
                            'last_name' => ['type' => 'text'],
                            'full_name' => ['type' => 'text'],
                            'email' => ['type' => 'keyword'],
                            'contact_number' => ['type' => 'keyword'],
                            'created_at' => ['type' => 'date'],
                            'updated_at' => ['type' => 'date'],
                        ],
                    ],
                ],
            ]);
        } catch (GuzzleException $e) {
            Log::warning('Could not create Elasticsearch index: '.$e->getMessage());
        }
    }

    /**
     * Index (create/replace) a single customer document.
     */
    public function index(Customer $customer): void
    {
        try {
            $this->client->put("{$this->index}/_doc/{$customer->id}", [
                'json' => $customer->toSearchArray(),
            ]);
        } catch (GuzzleException $e) {
            Log::error("Failed to sync customer {$customer->id} to Elasticsearch: ".$e->getMessage());
        }
    }

    /**
     * Remove a customer document from the index.
     */
    public function delete(int $customerId): void
    {
        try {
            $this->client->delete("{$this->index}/_doc/{$customerId}");
        } catch (GuzzleException $e) {
            // Ignore 404s (doc already gone); log everything else.
            if (! str_contains($e->getMessage(), '404')) {
                Log::error("Failed to delete customer {$customerId} from Elasticsearch: ".$e->getMessage());
            }
        }
    }

    /**
     * Full text search across name and email fields.
     *
     * @return array<int, array<string, mixed>> matched documents (the _source of each hit)
     */
    public function search(string $term, int $size = 50): array
    {
        try {
            $response = $this->client->post("{$this->index}/_search", [
                'json' => [
                    'size' => $size,
                    'query' => [
                        'bool' => [
                            'should' => [
                                ['match' => ['first_name' => ['query' => $term, 'fuzziness' => 'AUTO']]],
                                ['match' => ['last_name' => ['query' => $term, 'fuzziness' => 'AUTO']]],
                                ['match' => ['full_name' => ['query' => $term, 'fuzziness' => 'AUTO']]],
                                ['wildcard' => ['email' => '*'.strtolower($term).'*']],
                            ],
                            'minimum_should_match' => 1,
                        ],
                    ],
                ],
            ]);

            $body = json_decode((string) $response->getBody(), true);

            return array_map(
                fn ($hit) => $hit['_source'],
                $body['hits']['hits'] ?? []
            );
        } catch (GuzzleException $e) {
            Log::error('Elasticsearch search failed: '.$e->getMessage());

            return [];
        }
    }
}
