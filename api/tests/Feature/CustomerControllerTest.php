<?php

namespace Tests\Feature;

use App\Models\Customer;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    public function test_it_lists_customers()
    {
        Customer::factory()->count(3)->create();

        $this->get('/api/customers')
            ->seeStatusCode(200)
            ->seeJsonStructure(['data', 'meta']);

        $this->assertCount(3, json_decode($this->response->getContent(), true)['data']);
    }

    public function test_it_creates_a_customer()
    {
        $payload = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane.doe@example.com',
            'contact_number' => '+1234567890',
        ];

        $this->post('/api/customers', $payload)
            ->seeStatusCode(201)
            ->seeJson([
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'email' => 'jane.doe@example.com',
            ]);

        $this->seeInDatabase('customers', ['email' => 'jane.doe@example.com']);
    }

    public function test_first_name_and_last_name_are_required()
    {
        $this->post('/api/customers', [
            'email' => 'missing.names@example.com',
            'contact_number' => '+1234567890',
        ])->seeStatusCode(422);

        $body = json_decode($this->response->getContent(), true);
        $this->assertArrayHasKey('first_name', $body['errors']);
        $this->assertArrayHasKey('last_name', $body['errors']);
    }

    public function test_email_must_be_unique()
    {
        Customer::factory()->create(['email' => 'duplicate@example.com']);

        $this->post('/api/customers', [
            'first_name' => 'John',
            'last_name' => 'Smith',
            'email' => 'duplicate@example.com',
            'contact_number' => '+1234567890',
        ])->seeStatusCode(422);

        $body = json_decode($this->response->getContent(), true);
        $this->assertArrayHasKey('email', $body['errors']);
    }

    public function test_it_shows_a_single_customer()
    {
        $customer = Customer::factory()->create();

        $this->get("/api/customers/{$customer->id}")
            ->seeStatusCode(200)
            ->seeJson(['email' => $customer->email]);
    }

    public function test_it_returns_404_for_missing_customer()
    {
        $this->get('/api/customers/999999')->seeStatusCode(404);
    }

    public function test_it_updates_a_customer()
    {
        $customer = Customer::factory()->create();

        $this->put("/api/customers/{$customer->id}", [
            'first_name' => 'Updated',
            'last_name' => $customer->last_name,
            'email' => $customer->email,
            'contact_number' => '+19998887777',
        ])->seeStatusCode(200)
          ->seeJson(['first_name' => 'Updated', 'contact_number' => '+19998887777']);

        $this->seeInDatabase('customers', ['id' => $customer->id, 'first_name' => 'Updated']);
    }

    public function test_updating_a_customer_can_keep_its_own_email()
    {
        $customer = Customer::factory()->create(['email' => 'keep.mine@example.com']);

        $this->put("/api/customers/{$customer->id}", [
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'email' => 'keep.mine@example.com',
            'contact_number' => $customer->contact_number,
        ])->seeStatusCode(200);
    }

    public function test_updating_a_customer_rejects_another_customers_email()
    {
        Customer::factory()->create(['email' => 'taken@example.com']);
        $customer = Customer::factory()->create(['email' => 'mine@example.com']);

        $this->put("/api/customers/{$customer->id}", [
            'first_name' => $customer->first_name,
            'last_name' => $customer->last_name,
            'email' => 'taken@example.com',
            'contact_number' => $customer->contact_number,
        ])->seeStatusCode(422);
    }

    public function test_it_deletes_a_customer()
    {
        $customer = Customer::factory()->create();

        $this->delete("/api/customers/{$customer->id}")
            ->seeStatusCode(200);

        $this->notSeeInDatabase('customers', ['id' => $customer->id]);
    }
}
