<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A saved report definition owned by a user.
 *
 * `config` is a declarative definition (columns, filters, grouping, matrix axes)
 * that is validated and compiled by {@see \App\Services\Reporting\ReportCompiler}.
 * The report type must be one of TYPES.
 */
class Report extends Model
{
    public const TYPE_DETAIL = 'detail';

    public const TYPE_SUMMARY = 'summary';

    public const TYPE_MATRIX = 'matrix';

    public const TYPES = [
        self::TYPE_DETAIL,
        self::TYPE_SUMMARY,
        self::TYPE_MATRIX,
    ];

    protected $fillable = [
        'name',
        'description',
        'data_source',
        'type',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
