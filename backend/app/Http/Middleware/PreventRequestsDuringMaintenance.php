<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance as Middleware;


class PreventRequestsDuringMaintenance extends Middleware
{
    /**
     * The URIs that should be reachable while maintenance mode is enabled.
     * Load balancer health probes should always get a response.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/health', // Allow health check during maintenance
    ];
}
