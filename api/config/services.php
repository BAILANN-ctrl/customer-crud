<?php

return [

    'elasticsearch' => [
        'host' => env('ELASTICSEARCH_HOST', 'http://searcher:9200'),
        'index' => env('ELASTICSEARCH_INDEX', 'customers'),
    ],

];
