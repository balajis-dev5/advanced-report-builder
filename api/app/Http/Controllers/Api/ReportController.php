<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\RunReportRequest;
use App\Http\Requests\Report\SaveReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use App\Services\Reporting\ReportCompiler;
use App\Services\Reporting\ReportDefinitionException;
use App\Support\ReportAccess;
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
        $user = $request->user();

        // Reports the user owns, plus reports shared with them — de-duplicated
        // and newest-first. Shares are eager-loaded so the access label on each
        // resource resolves without an extra query per row.
        $owned = $user->reports()->with('shares')->get();
        $shared = $user->sharedReports()->with(['shares', 'user'])->get();

        $reports = $owned->concat($shared)
            ->unique('id')
            ->sortByDesc('updated_at')
            ->values();

        return response()->json(['data' => ReportResource::collection($reports)]);
    }

    public function store(SaveReportRequest $request): JsonResponse
    {
        $report = $request->user()->reports()->create($request->validated());

        return response()->json(['data' => new ReportResource($report)], 201);
    }

    public function show(Request $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canView($request->user(), $report), 404);

        return response()->json(['data' => new ReportResource($report)]);
    }

    public function update(SaveReportRequest $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canEdit($request->user(), $report), 404);

        $report->update($request->validated());

        return response()->json(['data' => new ReportResource($report)]);
    }

    public function destroy(Request $request, Report $report): JsonResponse
    {
        // Only the owner may delete a report — an "edit" share cannot.
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

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
        abort_unless(ReportAccess::canView($request->user(), $report), 404);

        try {
            $result = $this->compiler->run($report->data_source, $report->type, $report->config);
        } catch (ReportDefinitionException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $result]);
    }
}
