<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A single sales deal — one row of the demo reporting dataset.
 *
 * The report engine never touches this model directly for querying; it builds
 * queries against the `deals` table through the DataSourceRegistry so that every
 * column is validated against a whitelist. This model exists for seeding and for
 * any conventional Eloquent access.
 */
class Deal extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'customer',
        'region',
        'product',
        'source',
        'stage',
        'owner',
        'amount',
        'quantity',
        'probability',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'quantity' => 'integer',
            'probability' => 'integer',
            'opened_at' => 'date',
            'closed_at' => 'date',
        ];
    }
}
