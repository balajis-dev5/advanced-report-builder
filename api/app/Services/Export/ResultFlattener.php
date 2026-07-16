<?php

namespace App\Services\Export;

/**
 * Normalises a compiled report result (detail / summary / matrix) into a
 * {@see FlatResult} table so the exporters can stay format-agnostic.
 */
class ResultFlattener
{
    /**
     * @param  array<string, mixed>  $result  as returned by ReportCompiler::run()
     */
    public function flatten(array $result, string $title): FlatResult
    {
        return match ($result['type']) {
            'detail' => $this->flattenColumnar($result, $title, withTotals: false),
            'summary' => $this->flattenColumnar($result, $title, withTotals: true),
            'matrix' => $this->flattenMatrix($result, $title),
            default => new FlatResult($title, [], [], [], []),
        };
    }

    /**
     * Detail and summary share the same {columns, rows} shape.
     *
     * @param  array<string, mixed>  $result
     */
    private function flattenColumnar(array $result, string $title, bool $withTotals): FlatResult
    {
        $columns = $result['columns'];

        $headers = array_map(fn ($c) => $c['label'], $columns);
        $aligns = array_map(fn ($c) => $this->isNumeric($c) ? 'right' : 'left', $columns);
        $formats = array_map(fn ($c) => $c['format'] ?? null, $columns);

        $rows = [];
        foreach ($result['rows'] as $row) {
            $rows[] = array_map(fn ($c) => $row[$c['key']] ?? null, $columns);
        }

        $footer = null;
        if ($withTotals) {
            $totals = $result['meta']['totals'] ?? [];
            if ($totals !== []) {
                $footer = [];
                foreach ($columns as $i => $c) {
                    if ($i === 0) {
                        $footer[] = 'Total';
                    } else {
                        $footer[] = $totals[$c['key']] ?? null;
                    }
                }
            }
        }

        return new FlatResult($title, $headers, $aligns, $formats, $rows, $footer);
    }

    /**
     * A matrix pivots one measure across a row and a column dimension. The flat
     * form is: [rowDimension, ...columnValues, Total], with a trailing totals row.
     *
     * @param  array<string, mixed>  $result
     */
    private function flattenMatrix(array $result, string $title): FlatResult
    {
        $columnValues = $result['column_values'];
        $format = $result['measure']['format'] ?? null;

        $headers = array_merge(
            [$result['row']['label']],
            array_map(fn ($v) => (string) $v, $columnValues),
            ['Total'],
        );

        $aligns = array_merge(['left'], array_fill(0, count($columnValues) + 1, 'right'));
        $formats = array_merge([null], array_fill(0, count($columnValues) + 1, $format));

        $rows = [];
        foreach ($result['rows'] as $matrixRow) {
            $line = [$matrixRow['row_value']];
            foreach ($columnValues as $colValue) {
                $line[] = $matrixRow['cells'][$colValue] ?? null;
            }
            $line[] = $matrixRow['total'];
            $rows[] = $line;
        }

        $footer = ['Total'];
        foreach ($columnValues as $colValue) {
            $footer[] = $result['column_totals'][$colValue] ?? 0;
        }
        $footer[] = $result['grand_total'];

        return new FlatResult($title, $headers, $aligns, $formats, $rows, $footer);
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function isNumeric(array $column): bool
    {
        return ($column['type'] ?? null) === 'measure';
    }
}
