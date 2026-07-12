<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RedirectIfAuthenticated
 *
 * For API-only applications, this middleware is not actively used.
 * Kept as a stub for compatibility with the HTTP Kernel.
 */
class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     * In API mode, authenticated users are never redirected.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        return $next($request);
    }
}
