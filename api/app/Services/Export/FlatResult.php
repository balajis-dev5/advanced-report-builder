<?php

namespace App\Services\Export;

/**
 * A report result normalised into a plain table: a title, typed column headers,
 * raw row values, and an optional totals footer. Every exporter (CSV / XLSX /
 * PDF) consumes this shape, so the format-specific writers never need to know
 * whether the source was a detail, summary, or matrix report.
 */
class FlatResult
{
    /**
     * @param  array<int, string>  $headers
     * @param  array<int, string>  $aligns  'left' | 'right', parallel to $headers
     * @param  array<int, string|null>  $formats  currency|number|percent|null, parallel to $headers
     * @param  array<int, array<int, scalar|null>>  $rows  raw cell values
     * @param  array<int, scalar|null>|null  $footer  totals row, or null when the report has no totals
     */
    public function __construct(
        public readonly string $title,
        public readonly array $headers,
        public readonly array $aligns,
        public readonly array $formats,
        public readonly array $rows,
        public readonly ?array $footer = null,
    ) {
    }
}
