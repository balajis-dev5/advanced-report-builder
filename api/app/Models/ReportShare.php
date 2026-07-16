<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Grants a user access to another user's report at a given permission level.
 */
class ReportShare extends Model
{
    public const PERMISSION_VIEW = 'view';

    public const PERMISSION_EDIT = 'edit';

    public const PERMISSIONS = [self::PERMISSION_VIEW, self::PERMISSION_EDIT];

    protected $fillable = [
        'report_id',
        'user_id',
        'permission',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
