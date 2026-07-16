<?php

namespace App\Console\Commands;

use App\Models\ReportSchedule;
use App\Services\Scheduling\ScheduleDispatcher;
use Illuminate\Console\Command;

/**
 * Fires every active schedule whose next_run_at is due. Intended to be run
 * hourly by the framework scheduler (see routes/console.php).
 */
class RunScheduledReports extends Command
{
    protected $signature = 'reports:run-scheduled {--force : Run every active schedule regardless of due time}';

    protected $description = 'Generate and deliver any report schedules that are due.';

    public function handle(ScheduleDispatcher $dispatcher): int
    {
        $query = ReportSchedule::query()
            ->where('is_active', true)
            ->with('report');

        if (! $this->option('force')) {
            $query->where(function ($q): void {
                $q->whereNull('next_run_at')->orWhere('next_run_at', '<=', now());
            });
        }

        $due = $query->get();

        if ($due->isEmpty()) {
            $this->info('No schedules are due.');

            return self::SUCCESS;
        }

        $this->info("Dispatching {$due->count()} schedule(s)…");

        foreach ($due as $schedule) {
            $delivery = $dispatcher->dispatch($schedule);
            $this->line(sprintf(
                '  #%d %s [%s] → %s',
                $schedule->id,
                $schedule->report?->name ?? 'report',
                $schedule->format,
                $delivery->status,
            ));
        }

        return self::SUCCESS;
    }
}
