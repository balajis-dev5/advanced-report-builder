<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A recurring export schedule for a saved report.
 *
 * The schedule owns the cadence (frequency + hour of day) and computes its own
 * next run time; the {@see \App\Console\Commands\RunScheduledReports} command
 * fires anything that is due.
 */
class ReportSchedule extends Model
{
    public const FREQUENCIES = ['daily', 'weekly', 'monthly'];

    protected $fillable = [
        'report_id',
        'user_id',
        'frequency',
        'format',
        'hour',
        'recipients',
        'is_active',
        'last_run_at',
        'next_run_at',
    ];

    protected function casts(): array
    {
        return [
            'recipients' => 'array',
            'is_active' => 'boolean',
            'hour' => 'integer',
            'last_run_at' => 'datetime',
            'next_run_at' => 'datetime',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(ReportDelivery::class);
    }

    /**
     * The next time this schedule should run, at or after $from, honouring the
     * configured hour of day. Weekly runs on Mondays; monthly on the 1st.
     */
    public function computeNextRun(?Carbon $from = null): Carbon
    {
        $from ??= now();
        $candidate = $from->copy()->startOfDay()->setHour($this->hour);

        if ($candidate->lessThanOrEqualTo($from)) {
            $candidate->addDay();
        }

        return match ($this->frequency) {
            'weekly' => $candidate->next(Carbon::MONDAY)->setHour($this->hour),
            'monthly' => $candidate->day > 1
                ? $candidate->copy()->addMonthNoOverflow()->startOfMonth()->setHour($this->hour)
                : $candidate,
            default => $candidate, // daily
        };
    }
}
