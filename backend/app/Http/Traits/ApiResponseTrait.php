<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpFoundation\Response;

/**
 * ApiResponseTrait
 *
 * Provides consistent JSON response formatting for all API controllers.
 *
 * Every API response in the GNN AML platform follows this structure:
 * {
 *   "success": true|false,
 *   "message": "Human-readable description",
 *   "data": { ... } | [ ... ] | null,
 *   "meta": { "pagination": { ... } }  // present only for paginated responses
 * }
 *
 * Why consistent format?
 *   - Client SDKs (mobile app, compliance dashboard) can parse responses uniformly
 *   - Error handling is predictable — success=false always means check 'message'
 *   - Auditors reviewing API logs can immediately identify successful vs failed operations
 */
trait ApiResponseTrait
{
    /**
     * Return a successful JSON response.
     *
     * @param mixed  $data    The response payload (Resource, array, etc.)
     * @param string $message Descriptive message for the client
     * @param int    $status  HTTP status code (default 200)
     */
    protected function successResponse(
        mixed $data = null,
        string $message = 'Operation successful.',
        int $status = Response::HTTP_OK
    ): JsonResponse {
        $response = [
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ];

        return response()->json($response, $status);
    }

    /**
     * Return a paginated JSON response with pagination metadata.
     * Used for all collection endpoints (accounts, transactions, alerts).
     *
     * @param LengthAwarePaginator $paginator The paginated query result
     * @param mixed                $data      The serialized resource collection
     * @param string               $message   Descriptive message
     */
    protected function paginatedResponse(
        LengthAwarePaginator $paginator,
        mixed $data,
        string $message = 'Data retrieved successfully.'
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
            'meta'    => [
                'pagination' => [
                    'total'        => $paginator->total(),
                    'per_page'     => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'last_page'    => $paginator->lastPage(),
                    'from'         => $paginator->firstItem(),
                    'to'           => $paginator->lastItem(),
                    'next_page_url' => $paginator->nextPageUrl(),
                    'prev_page_url' => $paginator->previousPageUrl(),
                ],
            ],
        ]);
    }

    /**
     * Return an error JSON response.
     *
     * @param string $message Descriptive error message
     * @param int    $status  HTTP error status code
     * @param mixed  $errors  Optional validation errors or debug details
     */
    protected function errorResponse(
        string $message,
        int $status = Response::HTTP_BAD_REQUEST,
        mixed $errors = null
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
            'data'    => null,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * Return a 201 Created response for new resource creation.
     */
    protected function createdResponse(mixed $data, string $message = 'Resource created successfully.'): JsonResponse
    {
        return $this->successResponse($data, $message, Response::HTTP_CREATED);
    }

    /**
     * Return a 204 No Content response for successful deletions.
     */
    protected function noContentResponse(): JsonResponse
    {
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
