<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportSchedule;
use App\Services\Export\ReportExportService;
use App\Services\Scheduling\ScheduleDispatcher;
use App\Support\ReportAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CRUD for a report's delivery schedules, plus an on-demand "run now". Only the
 * report owner may manage schedules.
 */
class ReportScheduleController extends Controller
{
    public function __construct(private readonly ScheduleDispatcher $dispatcher)
    {
    }

    /**
     * Every schedule owned by the current user, across all their reports.
     */
    public function all(Request $request): JsonResponse
    {
        $schedules = ReportSchedule::where('user_id', $request->user()->id)
            ->with('report:id,name,type')
            ->latest()
            ->get()
            ->map(fn (ReportSchedule $s) => $this->present($s));

        return response()->json(['data' => $schedules]);
    }

    public function index(Request $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

        $schedules = $report->schedules()->latest()->get()
            ->map(fn (ReportSchedule $s) => $this->present($s));

        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

        $data = $this->validateSchedule($request);

        $schedule = $report->schedules()->make($data);
        $schedule->user_id = $request->user()->id;
        $schedule->next_run_at = $schedule->computeNextRun(now());
        $schedule->save();

        return response()->json(['data' => $this->present($schedule)], 201);
    }

    public function update(Request $request, ReportSchedule $schedule): JsonResponse
    {
        abort_unless($schedule->user_id === $request->user()->id, 404);

        $data = $this->validateSchedule($request);
        $schedule->fill($data);
        $schedule->next_run_at = $schedule->computeNextRun(now());
        $schedule->save();

        return response()->json(['data' => $this->present($schedule)]);
    }

    public function destroy(Request $request, ReportSchedule $schedule): JsonResponse
    {
        abort_unless($schedule->user_id === $request->user()->id, 404);

        $schedule->delete();

        return response()->json(status: 204);
    }

    /**
     * Generate a delivery immediately, without waiting for the schedule to fall due.
     */
    public function runNow(Request $request, ReportSchedule $schedule): JsonResponse
    {
        abort_unless($schedule->user_id === $request->user()->id, 404);

        $delivery = $this->dispatcher->dispatch($schedule->load('report'));

        return response()->json([
            'data' => [
                'status' => $delivery->status,
                'file_path' => $delivery->file_path,
                'bytes' => $delivery->row_bytes,
                'message' => $delivery->message,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSchedule(Request $request): array
    {
        return $request->validate([
            'frequency' => ['required', Rule::in(ReportSchedule::FREQUENCIES)],
            'format' => ['required', Rule::in(ReportExportService::FORMATS)],
            'hour' => ['required', 'integer', 'min:0', 'max:23'],
            'recipients' => ['nullable', 'array'],
            'recipients.*' => ['email'],
            'is_active' => ['boolean'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ReportSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'report_id' => $schedule->report_id,
            'report_name' => $schedule->relationLoaded('report') ? $schedule->report?->name : null,
            'frequency' => $schedule->frequency,
            'format' => $schedule->format,
            'hour' => $schedule->hour,
            'recipients' => $schedule->recipients ?? [],
            'is_active' => $schedule->is_active,
            'last_run_at' => $schedule->last_run_at?->toIso8601String(),
            'next_run_at' => $schedule->next_run_at?->toIso8601String(),
        ];
    }
}
