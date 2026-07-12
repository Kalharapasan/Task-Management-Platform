<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
   
    protected $dontReport = [
        AuthenticationException::class,
        AuthorizationException::class,
        ValidationException::class,
        ModelNotFoundException::class,
    ];

    
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    
    public function render($request, Throwable $e): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->handleApiException($request, $e);
        }

        return parent::render($request, $e);
    }

   
    private function handleApiException($request, Throwable $e): JsonResponse
    {
        $errors = (object)[];
        $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR;
        $message = $e->getMessage() ?: 'An unexpected server error occurred.';

        if ($e instanceof ValidationException) {
            $statusCode = Response::HTTP_UNPROCESSABLE_ENTITY;
            $message = 'The provided data failed validation.';
            $errors = $e->errors();
        } elseif ($e instanceof AuthenticationException) {
            $statusCode = Response::HTTP_UNAUTHORIZED;
            $message = 'Unauthenticated. Please login to access this resource.';
        } elseif ($e instanceof AuthorizationException) {
            $statusCode = Response::HTTP_FORBIDDEN;
            $message = $e->getMessage() ?: 'Forbidden. You do not have permission to perform this action.';
        } elseif ($e instanceof ModelNotFoundException) {
            $statusCode = Response::HTTP_NOT_FOUND;
            $model = class_basename($e->getModel());
            $message = "{$model} not found.";
        } elseif ($e instanceof NotFoundHttpException) {
            $statusCode = Response::HTTP_NOT_FOUND;
            $message = 'The requested endpoint was not found.';
        } elseif ($e instanceof HttpException) {
            $statusCode = $e->getStatusCode();
            $message = $e->getMessage() ?: 'An HTTP error occurred.';
        } else {
            // Unexpected PHP / DB errors
            if (config('app.debug', false)) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => [
                        'exception' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => collect($e->getTrace())->take(5)->toArray(),
                    ],
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
            $message = 'An internal server error occurred.';
        }

        return response()->json([
            'message' => $message,
            'errors' => $errors,
        ], $statusCode);
    }
}
