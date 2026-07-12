<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

/**
 * RouteServiceProvider
 *
 * Loads API and web routes and configures rate limiting for the AML platform.
 *
 * Rate limiting strategy:
 *   - 'api' limiter: 60 req/min per IP — protects all API endpoints
 *   - 'login' limiter: 5 req/min per IP — strict protection against brute-force
 *     on the login endpoint (AML credentials must not be compromised)
 *
 * In production, consider:
 *   - Per-user rate limiting (by user ID, not just IP) to prevent token sharing
 *   - Higher limits for internal services (GNN engine) via a dedicated guard
 */
class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for redirects.
     * Not used in API-only mode.
     */
    public const HOME = '/dashboard';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        // Configure rate limiters
        $this->configureRateLimiting();

        // Load routes from the route files
        $this->routes(function () {
            // API routes — versioned under /api with Sanctum + throttling
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            // Web routes — minimal, just the health check redirect
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // General API rate limit: 60 requests per minute per authenticated user or IP
        // This prevents bulk data scraping of the compliance dashboard
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Strict login rate limit: 5 attempts per minute per IP
        // Prevents brute-force attacks on compliance officer credentials
        // AML regulations require strong access controls on privileged accounts
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many login attempts. Please try again in 60 seconds.',
                        'data'    => null,
                    ], 429, $headers);
                });
        });
    }
}
