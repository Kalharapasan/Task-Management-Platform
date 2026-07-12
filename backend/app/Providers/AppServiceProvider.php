<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * AppServiceProvider
 *
 * The primary application service provider for the GNN AML platform.
 * Used to register application-level bindings and boot-time configuration.
 *
 * The AuditLogService is registered as a singleton so that:
 *   - Only one instance is created per request lifecycle
 *   - The service can maintain request-scoped context if needed
 *   - Dependency injection works consistently across all controllers
 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     * Singleton binding ensures AuditLogService is shared across the request.
     */
    public function register(): void
    {
        // Register AuditLogService as a singleton for dependency injection
        // This allows controllers to receive it via constructor injection
        $this->app->singleton(\App\Services\AuditLogService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
