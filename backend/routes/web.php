<?php
use Illuminate\Support\Facades\Route;

Route::get('/migrate-db-run', function () {
    try {
        $config = \Illuminate\Support\Facades\DB::connection()->getConfig();
        return response()->json([
            'config' => $config
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});
