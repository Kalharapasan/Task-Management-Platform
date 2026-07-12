<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

/**
 * VerifyCsrfToken
 *
 * For a pure API using Bearer tokens, CSRF protection is not needed.
 * Bearer tokens sent in Authorization headers are inherently CSRF-safe.
 * This stub is kept for Sanctum compatibility requirements.
 */
class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     * All API routes are excluded since they use Bearer token auth.
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/*', // All API routes use Bearer tokens — no CSRF needed
    ];
}
