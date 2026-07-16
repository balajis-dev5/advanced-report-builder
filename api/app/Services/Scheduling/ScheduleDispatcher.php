<?php

namespace App\Services\Scheduling;

use App\Models\ReportDelivery;
use App\Models\ReportSchedule;
use App\Services\Export\ReportExportService;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Runs a single report schedule: compiles + exports the report, stores the
 * generated file, and records a delivery. This is the seam where real emailing
 * would attach — today it generates and persists the file and marks the
 * delivery "generated"; wiring an SMTP mailer turns that into "sent".
 */
class ScheduleDispatcher
{
    public function __construct(private readonly ReportExportService $exporter)
    {
    }

    public function dispatch(ReportSchedule $schedule): ReportDelivery
    {
        $report = $schedule->report;

        try {
            $file = $this->exporter->export(
                $report->data_source,
                $report->type,
                $report->config,
                $schedule->format,
                $report->name,
            );

            $path = 'exports/' . $schedule->id . '/' . now()->format('Ymd_His') . '_' . $file->filename;
            Storage::disk('local')->put($path, $file->contents);

            $delivery = $schedule->deliveries()->create([
                'report_id' => $report->id,
                'format' => $schedule->format,
                'status' => ReportDelivery::STATUS_GENERATED,
                'file_path' => $path,
                'row_bytes' => strlen($file->contents),
                'message' => $this->deliveryNote($schedule),
                'delivered_at' => now(),
            ]);
        } catch (Throwable $e) {
            $delivery = $schedule->deliveries()->create([
                'report_id' => $report->id,
                'format' => $schedule->format,
                'status' => ReportDelivery::STATUS_FAILED,
                'message' => $e->getMessage(),
                'delivered_at' => now(),
            ]);
        }

        $schedule->forceFill([
            'last_run_at' => now(),
            'next_run_at' => $schedule->computeNextRun(now()),
        ])->save();

        return $delivery;
    }

    private function deliveryNote(ReportSchedule $schedule): string
    {
        $recipients = $schedule->recipients ?? [];

        if ($recipients === []) {
            return 'Generated and stored. No recipients configured.';
        }

        return 'Generated for ' . implode(', ', $recipients)
            . '. Configure a mail transport in .env to deliver by email.';
    }
}
