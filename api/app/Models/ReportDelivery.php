<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single generated delivery of a scheduled report.
 */
class ReportDelivery extends Model
{
    public const STATUS_GENERATED = 'generated';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'report_schedule_id',
        'report_id',
        'format',
        'status',
        'file_path',
        'row_bytes',
        'message',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'delivered_at' => 'datetime',
            'row_bytes' => 'integer',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ReportSchedule::class, 'report_schedule_id');
    }
}
