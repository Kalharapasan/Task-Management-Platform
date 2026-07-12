<?php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'message' => 'GNN AML Fraud Detection API',
        'version' => 'v1',
        'docs'    => url('/api/health'),
    ]);
});
