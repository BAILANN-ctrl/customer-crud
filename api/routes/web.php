<?php

/** @var \Laravel\Lumen\Routing\Router $router */

$router->get('/', function () use ($router) {
    return response()->json([
        'service' => 'customer-crud-api',
        'status' => 'ok',
    ]);
});

$router->get('/health', function () {
    return response()->json(['status' => 'ok']);
});

$router->group(['prefix' => 'api'], function () use ($router) {
    $router->get('customers', 'CustomerController@index');
    $router->post('customers', 'CustomerController@store');
    $router->get('customers/{id}', 'CustomerController@show');
    $router->put('customers/{id}', 'CustomerController@update');
    $router->patch('customers/{id}', 'CustomerController@update');
    $router->delete('customers/{id}', 'CustomerController@destroy');
});
