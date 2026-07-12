<?php

namespace App\Services\Reporting;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Turns a declarative report definition into a validated SQL query and runs it.
 *
 * Security model: the definition references columns/aggregations/operators by
 * key. Every key is resolved against the {@see DataSourceRegistry} before it is
 * used, and identifiers are additionally sanity-checked against a strict pattern.
 * User-supplied *values* are always passed as query bindings, never interpolated.
 * Nothing from the request is ever concatenated into raw SQL.
 */
class ReportCompiler
{
    /** Detail reports are capped to protect the API and the browser. */
    private const MAX_DETAIL_ROWS = 500;

    private const DEFAULT_DETAIL_ROWS = 100;

    public function __construct(private readonly DataSourceRegistry $registry)
    {
    }

    /**
     * Compile and execute a report.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     *
     * @throws ReportDefinitionException
     */
    public function run(string $dataSource, string $type, array $config): array
    {
        $source = $this->registry->source($dataSource);

        if ($source === null) {
            throw new ReportDefinitionException("Unknown data source: {$dataSource}");
        }

        return match ($type) {
            'detail' => $this->runDetail($source, $config),
            'summary' => $this->runSummary($source, $config),
            'matrix' => $this->runMatrix($source, $config),
            default => throw new ReportDefinitionException("Unknown report type: {$type}"),
        };
    }

    // ---------------------------------------------------------------------
    // Detail
    // ---------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function runDetail(array $source, array $config): array
    {
        $columnKeys = $this->requireArray($config, 'columns');

        if ($columnKeys === []) {
            throw new ReportDefinitionException('A detail report needs at least one column.');
        }

        $columns = [];
        foreach ($columnKeys as $key) {
            $columns[] = $this->requireColumn($source, $key, allowSynthetic: false);
        }

        $query = DB::table($source['table']);
        $query->select(array_map(fn ($c) => $c['key'], $columns));

        $this->applyFilters($query, $source, $config['filters'] ?? []);

        foreach ($this->parseSort($config, $source, array_column($columns, 'key')) as $sort) {
            $query->orderBy($sort['field'], $sort['direction']);
        }

        $limit = $this->resolveLimit($config['limit'] ?? self::DEFAULT_DETAIL_ROWS);
        $query->limit($limit);

        $rows = $query->get()->map(fn ($r) => (array) $r)->all();

        return [
            'type' => 'detail',
            'columns' => array_map(fn ($c) => $this->columnMeta($c), $columns),
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'truncated' => count($rows) >= $limit,
                'limit' => $limit,
            ],
        ];
    }

    // ---------------------------------------------------------------------
    // Summary (group-by + aggregations)
    // ---------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function runSummary(array $source, array $config): array
    {
        $groupKeys = $this->requireArray($config, 'group_by');
        $measures = $this->parseMeasures($source, $this->requireArray($config, 'measures'));

        if ($groupKeys === []) {
            throw new ReportDefinitionException('A summary report needs at least one group-by field.');
        }
        if ($measures === []) {
            throw new ReportDefinitionException('A summary report needs at least one measure.');
        }

        $groups = [];
        foreach ($groupKeys as $key) {
            $column = $this->requireColumn($source, $key, allowSynthetic: false);
            if ($column['type'] !== DataSourceRegistry::TYPE_DIMENSION) {
                throw new ReportDefinitionException("Cannot group by a measure: {$key}");
            }
            $groups[] = $column;
        }

        $query = DB::table($source['table']);

        $selects = [];
        foreach ($groups as $group) {
            $selects[] = $group['key'];
        }
        foreach ($measures as $measure) {
            $selects[] = DB::raw($this->aggregateExpression($measure) . ' as ' . $measure['alias']);
        }
        $query->select($selects);

        $this->applyFilters($query, $source, $config['filters'] ?? []);
        $query->groupBy(array_column($groups, 'key'));

        // Sort may reference a group dimension key or a measure alias.
        $sortable = array_merge(array_column($groups, 'key'), array_column($measures, 'alias'));
        foreach ($this->parseSort($config, $source, $sortable, validateAgainstSource: false) as $sort) {
            $query->orderBy($sort['field'], $sort['direction']);
        }

        $rows = $query->get()->map(fn ($r) => (array) $r)->all();

        // Column metadata: dimensions first, then measures.
        $columnMeta = [];
        foreach ($groups as $group) {
            $columnMeta[] = $this->columnMeta($group);
        }
        foreach ($measures as $measure) {
            $columnMeta[] = [
                'key' => $measure['alias'],
                'label' => $measure['label'],
                'format' => $measure['format'],
                'aggregation' => $measure['agg'],
            ];
        }

        return [
            'type' => 'summary',
            'columns' => $columnMeta,
            'rows' => $rows,
            'meta' => [
                'row_count' => count($rows),
                'group_by' => array_column($groups, 'key'),
                'totals' => $this->summaryTotals($rows, $measures),
            ],
        ];
    }

    // ---------------------------------------------------------------------
    // Matrix (pivot)
    // ---------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function runMatrix(array $source, array $config): array
    {
        $rowDim = $this->requireColumn($source, $config['row'] ?? '', allowSynthetic: false);
        $colDim = $this->requireColumn($source, $config['column'] ?? '', allowSynthetic: false);

        foreach ([$rowDim, $colDim] as $dim) {
            if ($dim['type'] !== DataSourceRegistry::TYPE_DIMENSION) {
                throw new ReportDefinitionException("Matrix axes must be dimensions: {$dim['key']}");
            }
        }
        if ($rowDim['key'] === $colDim['key']) {
            throw new ReportDefinitionException('Matrix row and column must be different fields.');
        }

        $measure = $this->parseMeasures($source, [$config['measure'] ?? []])[0]
            ?? throw new ReportDefinitionException('A matrix report needs a measure.');

        $query = DB::table($source['table'])
            ->select([
                $rowDim['key'] . ' as row_value',
                $colDim['key'] . ' as col_value',
                DB::raw($this->aggregateExpression($measure) . ' as value'),
            ]);

        $this->applyFilters($query, $source, $config['filters'] ?? []);
        $query->groupBy($rowDim['key'], $colDim['key']);

        $raw = $query->get();

        // Pivot the flat (row_value, col_value, value) triples into a grid.
        $columnValues = [];
        $grid = [];       // rowValue => [colValue => number]
        $rowTotals = [];
        $columnTotals = [];
        $grandTotal = 0.0;

        foreach ($raw as $record) {
            $rowValue = $this->stringifyDimension($record->row_value);
            $colValue = $this->stringifyDimension($record->col_value);
            $value = (float) $record->value;

            $columnValues[$colValue] = true;
            $grid[$rowValue][$colValue] = $value;
            $rowTotals[$rowValue] = ($rowTotals[$rowValue] ?? 0) + $value;
            $columnTotals[$colValue] = ($columnTotals[$colValue] ?? 0) + $value;
            $grandTotal += $value;
        }

        $columnValues = array_keys($columnValues);
        sort($columnValues);
        ksort($grid);

        $matrixRows = [];
        foreach ($grid as $rowValue => $cells) {
            $matrixRows[] = [
                'row_value' => $rowValue,
                'cells' => $cells,
                'total' => $rowTotals[$rowValue],
            ];
        }

        return [
            'type' => 'matrix',
            'row' => $this->columnMeta($rowDim),
            'column' => $this->columnMeta($colDim),
            'measure' => [
                'key' => $measure['alias'],
                'label' => $measure['label'],
                'format' => $measure['format'],
                'aggregation' => $measure['agg'],
            ],
            'column_values' => $columnValues,
            'rows' => $matrixRows,
            'column_totals' => $columnTotals,
            'grand_total' => $grandTotal,
            'meta' => [
                'row_count' => count($matrixRows),
            ],
        ];
    }

    // ---------------------------------------------------------------------
    // Shared building blocks
    // ---------------------------------------------------------------------

    /**
     * Apply a list of filters to a query. Field, operator, and value are all
     * validated against the registry; values are bound, never interpolated.
     *
     * @param  array<string, mixed>  $source
     * @param  array<int, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $source, array $filters): void
    {
        if (! is_array($filters)) {
            throw new ReportDefinitionException('Filters must be a list.');
        }

        foreach ($filters as $filter) {
            if (! is_array($filter)) {
                throw new ReportDefinitionException('Each filter must be an object.');
            }

            $column = $this->requireColumn($source, $filter['field'] ?? '', allowSynthetic: false);
            $operator = $filter['operator'] ?? '=';
            $allowed = DataSourceRegistry::OPERATORS[$column['data_type']] ?? [];

            if (! in_array($operator, $allowed, true)) {
                throw new ReportDefinitionException(
                    "Operator '{$operator}' is not allowed for field '{$column['key']}'."
                );
            }

            $value = $this->coerceValue($column['data_type'], $filter['value'] ?? null);
            $this->applyOperator($query, $column['key'], $operator, $value);
        }
    }

    /**
     * Coerce a filter value to match the column's data type so that comparisons
     * behave correctly on strongly-typed engines like PostgreSQL (where a numeric
     * column compared against a text binding would otherwise error). Recurses
     * into arrays for the `in` / `between` operators.
     */
    private function coerceValue(string $dataType, mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(fn ($v) => $this->coerceValue($dataType, $v), $value);
        }

        if ($value === null) {
            return null;
        }

        return match ($dataType) {
            'integer' => is_numeric($value) ? (int) $value : $value,
            'decimal' => is_numeric($value) ? (float) $value : $value,
            default => $value, // string and date stay as-is
        };
    }

    private function applyOperator(Builder $query, string $field, string $operator, mixed $value): void
    {
        switch ($operator) {
            case 'contains':
                $query->where($field, 'like', '%' . $this->escapeLike($this->scalar($value)) . '%');
                break;
            case 'starts_with':
                $query->where($field, 'like', $this->escapeLike($this->scalar($value)) . '%');
                break;
            case 'in':
                $values = is_array($value) ? array_values($value) : [$value];
                if ($values === []) {
                    throw new ReportDefinitionException("Operator 'in' needs at least one value.");
                }
                $query->whereIn($field, $values);
                break;
            case 'between':
                if (! is_array($value) || count($value) !== 2) {
                    throw new ReportDefinitionException("Operator 'between' needs exactly two values.");
                }
                $query->whereBetween($field, [$value[0], $value[1]]);
                break;
            default: // = != > >= < <=
                $query->where($field, $operator, $this->scalar($value));
        }
    }

    /**
     * Build a validated aggregate SQL expression such as `sum("amount")`.
     * The column identifier is whitelisted; the aggregate is whitelisted.
     *
     * @param  array<string, mixed>  $measure
     */
    private function aggregateExpression(array $measure): string
    {
        if ($measure['field'] === DataSourceRegistry::COUNT_FIELD) {
            return 'count(*)';
        }

        $wrapped = DB::connection()->getQueryGrammar()->wrap($measure['field']);

        return "{$measure['agg']}({$wrapped})";
    }

    /**
     * Validate and normalize a list of measure definitions.
     *
     * @param  array<string, mixed>  $source
     * @param  array<int, mixed>  $measures
     * @return array<int, array<string, mixed>>
     */
    private function parseMeasures(array $source, array $measures): array
    {
        $parsed = [];

        foreach ($measures as $measure) {
            if (! is_array($measure) || ! isset($measure['field'])) {
                throw new ReportDefinitionException('Each measure needs a field and an aggregation.');
            }

            $column = $this->requireColumn($source, $measure['field'], allowSynthetic: true);
            if ($column['type'] !== DataSourceRegistry::TYPE_MEASURE) {
                throw new ReportDefinitionException("Field '{$column['key']}' is not a measure.");
            }

            $agg = $measure['agg'] ?? 'sum';
            $allowed = $column['aggregations'] ?? [];
            if (! in_array($agg, $allowed, true)) {
                throw new ReportDefinitionException(
                    "Aggregation '{$agg}' is not allowed for '{$column['key']}'."
                );
            }

            $isCount = $column['key'] === DataSourceRegistry::COUNT_FIELD;
            $parsed[] = [
                'field' => $column['key'],
                'agg' => $agg,
                'alias' => $isCount ? 'record_count' : "{$column['key']}_{$agg}",
                'label' => $isCount ? 'Record Count' : ucfirst($agg) . ' of ' . $column['label'],
                'format' => $column['format'] ?? 'number',
            ];
        }

        return $parsed;
    }

    /**
     * Resolve and validate a column key against the source whitelist.
     *
     * @param  array<string, mixed>  $source
     * @return array<string, mixed>
     */
    private function requireColumn(array $source, string $key, bool $allowSynthetic): array
    {
        // Defense in depth: even though keys come from the registry, reject
        // anything that isn't a plain identifier before it can reach SQL.
        if ($key === '' || ! preg_match('/^[a-z_][a-z0-9_]*$/i', $key)) {
            throw new ReportDefinitionException("Invalid field name: '{$key}'.");
        }

        $column = $source['columns'][$key] ?? null;
        if ($column === null) {
            throw new ReportDefinitionException("Unknown field '{$key}' for source '{$source['key']}'.");
        }

        if (! $allowSynthetic && $key === DataSourceRegistry::COUNT_FIELD) {
            throw new ReportDefinitionException("Field '{$key}' can only be used as a measure.");
        }

        return $column;
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $source
     * @param  array<int, string>  $allowedFields
     * @return array<int, array{field: string, direction: string}>
     */
    private function parseSort(array $config, array $source, array $allowedFields, bool $validateAgainstSource = true): array
    {
        $sort = $config['sort'] ?? [];
        if (! is_array($sort)) {
            throw new ReportDefinitionException('Sort must be a list.');
        }

        $result = [];
        foreach ($sort as $item) {
            $field = is_array($item) ? ($item['field'] ?? null) : null;
            $direction = strtolower((string) (is_array($item) ? ($item['direction'] ?? 'asc') : 'asc'));

            if ($field === null || ! in_array($field, $allowedFields, true)) {
                throw new ReportDefinitionException("Cannot sort by '{$field}' — it is not part of the report.");
            }
            if (! in_array($direction, ['asc', 'desc'], true)) {
                throw new ReportDefinitionException("Invalid sort direction '{$direction}'.");
            }

            $result[] = ['field' => $field, 'direction' => $direction];
        }

        return $result;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array<string, mixed>>  $measures
     * @return array<string, float>
     */
    private function summaryTotals(array $rows, array $measures): array
    {
        $totals = [];
        foreach ($measures as $measure) {
            // Only sums and counts total meaningfully across groups.
            if (! in_array($measure['agg'], ['sum', 'count'], true)) {
                continue;
            }
            $totals[$measure['alias']] = array_sum(array_column($rows, $measure['alias']));
        }

        return $totals;
    }

    /**
     * @param  array<string, mixed>  $column
     * @return array<string, mixed>
     */
    private function columnMeta(array $column): array
    {
        return [
            'key' => $column['key'],
            'label' => $column['label'],
            'type' => $column['type'],
            'data_type' => $column['data_type'],
            'format' => $column['format'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<int, mixed>
     */
    private function requireArray(array $config, string $key): array
    {
        $value = $config[$key] ?? [];
        if (! is_array($value)) {
            throw new ReportDefinitionException("'{$key}' must be a list.");
        }

        return array_values($value);
    }

    private function resolveLimit(mixed $limit): int
    {
        $limit = (int) $limit;
        if ($limit <= 0) {
            $limit = self::DEFAULT_DETAIL_ROWS;
        }

        return min($limit, self::MAX_DETAIL_ROWS);
    }

    private function stringifyDimension(mixed $value): string
    {
        return $value === null ? '—' : (string) $value;
    }

    private function scalar(mixed $value): string|int|float
    {
        if (is_array($value) || is_object($value) || is_bool($value) || $value === null) {
            throw new ReportDefinitionException('Expected a single scalar value for this operator.');
        }

        return $value;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
