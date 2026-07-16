<?php

namespace App\Services\Export;

/**
 * Writes a {@see FlatResult} as UTF-8 CSV. Numbers are emitted raw (unformatted)
 * so the file stays computable when opened in a spreadsheet. A BOM is prepended
 * so Excel detects UTF-8 correctly.
 */
class CsvExporter implements Exporter
{
    public function extension(): string
    {
        return 'csv';
    }

    public function mimeType(): string
    {
        return 'text/csv';
    }

    public function export(FlatResult $result): string
    {
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, $result->headers);

        foreach ($result->rows as $row) {
            fputcsv($handle, array_map([$this, 'cell'], $row));
        }

        if ($result->footer !== null) {
            fputcsv($handle, array_map([$this, 'cell'], $result->footer));
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        // UTF-8 BOM for correct Excel detection.
        return "\xEF\xBB\xBF" . $csv;
    }

    private function cell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return is_numeric($value) ? (string) $value : (string) $value;
    }
}
