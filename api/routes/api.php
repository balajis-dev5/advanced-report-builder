<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DataSourceController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes (prefixed with /api)
|--------------------------------------------------------------------------
*/

Route::get('/health', fn (): JsonResponse => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

Route::prefix('auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function (): void {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

/*
|--------------------------------------------------------------------------
| Reporting (authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function (): void {
    // Metadata for the builder UI.
    Route::get('data-sources', [DataSourceController::class, 'index']);

    // Ad-hoc execution (live preview, no save).
    Route::post('reports/run', [ReportController::class, 'run']);

    // Saved reports.
    Route::get('reports', [ReportController::class, 'index']);
    Route::post('reports', [ReportController::class, 'store']);
    Route::get('reports/{report}', [ReportController::class, 'show']);
    Route::put('reports/{report}', [ReportController::class, 'update']);
    Route::delete('reports/{report}', [ReportController::class, 'destroy']);
    Route::post('reports/{report}/run', [ReportController::class, 'runSaved']);
});
