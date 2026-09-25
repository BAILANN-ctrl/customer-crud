<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Services\ElasticsearchService;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;

class ElasticsearchServiceTest extends TestCase
{
    public function test_index_sends_a_put_request_with_the_customer_document()
    {
        $history = [];
        $mock = new MockHandler([new Response(200, [], json_encode(['result' => 'created']))]);
        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($history));
        $client = new Client(['handler' => $stack]);

        $service = new ElasticsearchService($client);

        $customer = new Customer([
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'contact_number' => '+1000000000',
        ]);
        $customer->id = 42;

        $service->index($customer);

        $this->assertCount(1, $history);
        $request = $history[0]['request'];
        $this->assertSame('PUT', $request->getMethod());
        $this->assertStringContainsString('customers/_doc/42', (string) $request->getUri());

        $body = json_decode((string) $request->getBody(), true);
        $this->assertSame('ada@example.com', $body['email']);
        $this->assertSame('Ada Lovelace', $body['full_name']);
    }

    public function test_delete_sends_a_delete_request()
    {
        $history = [];
        $mock = new MockHandler([new Response(200, [], json_encode(['result' => 'deleted']))]);
        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($history));
        $client = new Client(['handler' => $stack]);

        $service = new ElasticsearchService($client);
        $service->delete(7);

        $this->assertCount(1, $history);
        $this->assertSame('DELETE', $history[0]['request']->getMethod());
        $this->assertStringContainsString('customers/_doc/7', (string) $history[0]['request']->getUri());
    }

    public function test_search_parses_hits_into_plain_documents()
    {
        $responseBody = json_encode([
            'hits' => [
                'hits' => [
                    ['_source' => ['id' => 1, 'email' => 'a@example.com']],
                    ['_source' => ['id' => 2, 'email' => 'b@example.com']],
                ],
            ],
        ]);

        $mock = new MockHandler([new Response(200, [], $responseBody)]);
        $stack = HandlerStack::create($mock);
        $client = new Client(['handler' => $stack]);

        $service = new ElasticsearchService($client);
        $results = $service->search('example');

        $this->assertCount(2, $results);
        $this->assertSame('a@example.com', $results[0]['email']);
    }
}
