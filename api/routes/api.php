<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DataSourceController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReportScheduleController;
use App\Http\Controllers\Api\ReportShareController;
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
    Route::post('reports/run/export', [ExportController::class, 'runExport']);

    // Saved reports.
    Route::get('reports', [ReportController::class, 'index']);
    Route::post('reports', [ReportController::class, 'store']);
    Route::get('reports/{report}', [ReportController::class, 'show']);
    Route::put('reports/{report}', [ReportController::class, 'update']);
    Route::delete('reports/{report}', [ReportController::class, 'destroy']);
    Route::post('reports/{report}/run', [ReportController::class, 'runSaved']);
    Route::get('reports/{report}/export', [ExportController::class, 'exportSaved']);

    // Sharing (owner only).
    Route::get('reports/{report}/shares', [ReportShareController::class, 'index']);
    Route::post('reports/{report}/shares', [ReportShareController::class, 'store']);
    Route::delete('reports/{report}/shares/{user}', [ReportShareController::class, 'destroy']);

    // Scheduling.
    Route::get('schedules', [ReportScheduleController::class, 'all']);
    Route::get('reports/{report}/schedules', [ReportScheduleController::class, 'index']);
    Route::post('reports/{report}/schedules', [ReportScheduleController::class, 'store']);
    Route::put('schedules/{schedule}', [ReportScheduleController::class, 'update']);
    Route::delete('schedules/{schedule}', [ReportScheduleController::class, 'destroy']);
    Route::post('schedules/{schedule}/run', [ReportScheduleController::class, 'runNow']);
});
