<?php

namespace App\Services\Reporting;

/**
 * The single source of truth for what the report engine is allowed to query.
 *
 * Every table name, column name, aggregation, and filter operator that the
 * compiler emits must originate here — never from raw user input. This is the
 * security boundary of the whole engine: user requests reference fields by key,
 * and those keys are resolved against this registry before any SQL is built.
 */
class DataSourceRegistry
{
    public const TYPE_DIMENSION = 'dimension';

    public const TYPE_MEASURE = 'measure';

    /** Synthetic measure key meaning COUNT(*). */
    public const COUNT_FIELD = '__count__';

    /** Aggregations the compiler knows how to emit safely. */
    public const AGGREGATIONS = ['sum', 'avg', 'min', 'max', 'count'];

    /** Filter operators the compiler knows how to emit safely, per data type. */
    public const OPERATORS = [
        'string' => ['=', '!=', 'contains', 'starts_with', 'in'],
        'integer' => ['=', '!=', '>', '>=', '<', '<=', 'between'],
        'decimal' => ['=', '!=', '>', '>=', '<', '<=', 'between'],
        'date' => ['=', '!=', '>', '>=', '<', '<=', 'between'],
    ];

    /**
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        return [
            'deals' => [
                'key' => 'deals',
                'label' => 'Deals',
                'table' => 'deals',
                'description' => 'Sales pipeline — one row per deal.',
                'columns' => $this->dealColumns(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function source(string $key): ?array
    {
        return $this->all()[$key] ?? null;
    }

    /**
     * Resolve a single column definition within a source, or null if the key is
     * not whitelisted for that source.
     *
     * @return array<string, mixed>|null
     */
    public function column(string $sourceKey, string $columnKey): ?array
    {
        $source = $this->source($sourceKey);

        return $source['columns'][$columnKey] ?? null;
    }

    /**
     * Operators permitted for a given column, derived from its data type.
     *
     * @return array<int, string>
     */
    public function operatorsFor(string $sourceKey, string $columnKey): array
    {
        $column = $this->column($sourceKey, $columnKey);

        if ($column === null) {
            return [];
        }

        return self::OPERATORS[$column['data_type']] ?? [];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function dealColumns(): array
    {
        return [
            'title' => ['key' => 'title', 'label' => 'Title', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'customer' => ['key' => 'customer', 'label' => 'Customer', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'region' => ['key' => 'region', 'label' => 'Region', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'product' => ['key' => 'product', 'label' => 'Product', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'source' => ['key' => 'source', 'label' => 'Source', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'stage' => ['key' => 'stage', 'label' => 'Stage', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'owner' => ['key' => 'owner', 'label' => 'Owner', 'type' => self::TYPE_DIMENSION, 'data_type' => 'string'],
            'opened_at' => ['key' => 'opened_at', 'label' => 'Opened Date', 'type' => self::TYPE_DIMENSION, 'data_type' => 'date'],
            'closed_at' => ['key' => 'closed_at', 'label' => 'Closed Date', 'type' => self::TYPE_DIMENSION, 'data_type' => 'date'],

            'amount' => [
                'key' => 'amount', 'label' => 'Amount', 'type' => self::TYPE_MEASURE, 'data_type' => 'decimal',
                'aggregations' => ['sum', 'avg', 'min', 'max'], 'format' => 'currency',
            ],
            'quantity' => [
                'key' => 'quantity', 'label' => 'Quantity', 'type' => self::TYPE_MEASURE, 'data_type' => 'integer',
                'aggregations' => ['sum', 'avg', 'min', 'max'], 'format' => 'number',
            ],
            'probability' => [
                'key' => 'probability', 'label' => 'Probability', 'type' => self::TYPE_MEASURE, 'data_type' => 'integer',
                'aggregations' => ['avg', 'min', 'max'], 'format' => 'percent',
            ],

            // Synthetic measure — COUNT(*). Special-cased by the compiler so that
            // "number of records" is available without binding it to a column.
            self::COUNT_FIELD => [
                'key' => self::COUNT_FIELD, 'label' => 'Record Count', 'type' => self::TYPE_MEASURE,
                'data_type' => 'integer', 'aggregations' => ['count'], 'format' => 'number',
            ],
        ];
    }
}
