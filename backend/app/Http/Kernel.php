<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

/**
 * HTTP Kernel
 *
 * Defines middleware stacks for the GNN AML API.
 *
 * Middleware execution order for an API request:
 *   1. Global middleware (always run)
 *   2. API middleware group (for /api/* routes)
 *   3. Named middleware (route-specific: auth:sanctum, role:*)
 *
 * The 'role' middleware alias is critical — it maps the string 'role'
 * used in route definitions to the RoleMiddleware class.
 */
class Kernel extends HttpKernel
{
    /**
     * Global middleware — runs on every HTTP request.
     * TrustProxies handles reverse proxy headers (important for AML audit IP logging).
     */
    protected $middleware = [
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * Route middleware groups.
     * 'api' group is automatically applied to all routes in routes/api.php.
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            // Sanctum stateless token middleware
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,

            // Rate limiting — prevents brute-force attacks on the login endpoint
            // Default 'api' throttle: 60 requests per minute per IP
            \Illuminate\Routing\Middleware\ThrottleRequests::class . ':api',

            // Route model binding resolution (e.g., {account} → Account::find())
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * Named (route-level) middleware.
     *
     * 'role' is the key middleware for RBAC enforcement.
     * Used as: Route::middleware('role:admin,compliance_officer')
     */
    protected $middlewareAliases = [
        'auth'             => \App\Http\Middleware\Authenticate::class,
        'auth.basic'       => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session'     => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers'    => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can'              => \Illuminate\Auth\Middleware\Authorize::class,
        'guest'            => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'precognitive'     => \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
        'signed'           => \App\Http\Middleware\ValidateSignature::class,
        'throttle'         => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified'         => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,

        // Custom RBAC middleware — registered here for use in route definitions
        'role'             => \App\Http\Middleware\RoleMiddleware::class,
    ];
}
