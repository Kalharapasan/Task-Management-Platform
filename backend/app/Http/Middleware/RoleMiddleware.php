<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param Closure(Request): (Response) $next
     * @param string ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new UnauthorizedHttpException('Bearer', 'Unauthenticated. Please provide a valid API token.');
        }

        if (! in_array($user->role, $roles, true)) {
            throw new AccessDeniedHttpException('Forbidden. You do not have permission to perform this action.');
        }

        return $next($request);
    }
}
