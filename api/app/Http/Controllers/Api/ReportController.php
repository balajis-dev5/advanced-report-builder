<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\RunReportRequest;
use App\Http\Requests\Report\SaveReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\Reporting\ReportCompiler;
use App\Services\Reporting\ReportDefinitionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD for saved reports plus report execution.
 *
 * Every action is scoped to the authenticated user — a user can only see and
 * run their own saved reports. Execution (ad-hoc or saved) is delegated to the
 * ReportCompiler, and any ReportDefinitionException becomes a 422.
 */
class ReportController extends Controller
{
    public function __construct(private readonly ReportCompiler $compiler)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $reports = $request->user()->reports()
            ->latest('updated_at')
            ->get();

        return response()->json(['data' => ReportResource::collection($reports)]);
    }

    public function store(SaveReportRequest $request): JsonResponse
    {
        $report = $request->user()->reports()->create($request->validated());

        return response()->json(['data' => new ReportResource($report)], 201);
    }

    public function show(Request $request, Report $report): JsonResponse
    {
        $this->authorizeOwnership($request, $report);

        return response()->json(['data' => new ReportResource($report)]);
    }

    public function update(SaveReportRequest $request, Report $report): JsonResponse
    {
        $this->authorizeOwnership($request, $report);

        $report->update($request->validated());

        return response()->json(['data' => new ReportResource($report)]);
    }

    public function destroy(Request $request, Report $report): JsonResponse
    {
        $this->authorizeOwnership($request, $report);

        $report->delete();

        return response()->json(status: 204);
    }

    /**
     * Run an ad-hoc definition without saving it — powers the live preview.
     */
    public function run(RunReportRequest $request): JsonResponse
    {
        try {
            $result = $this->compiler->run(
                $request->string('data_source')->value(),
                $request->string('type')->value(),
                $request->input('config', []),
            );
        } catch (ReportDefinitionException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $result]);
    }

    /**
     * Run a saved report by re-compiling its stored definition.
     */
    public function runSaved(Request $request, Report $report): JsonResponse
    {
        $this->authorizeOwnership($request, $report);

        try {
            $result = $this->compiler->run($report->data_source, $report->type, $report->config);
        } catch (ReportDefinitionException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $result]);
    }

    private function authorizeOwnership(Request $request, Report $report): void
    {
        abort_unless($report->user_id === $request->user()->id, 404);
    }
}
