<?php

namespace App\Services\Export;

/**
 * Formats raw cell values for human-readable output (PDF / on-screen).
 * CSV and XLSX deliberately keep numbers raw so spreadsheets stay computable.
 */
class ValueFormatter
{
    public static function display(mixed $value, ?string $format): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (! is_numeric($value)) {
            return (string) $value;
        }

        $number = (float) $value;

        return match ($format) {
            'currency' => '$' . number_format($number, 0),
            'percent' => number_format($number, 0) . '%',
            'number' => number_format($number, 0),
            default => rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.'),
        };
    }
}
