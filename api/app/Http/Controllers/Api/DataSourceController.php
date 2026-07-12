<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Reporting\DataSourceRegistry;
use Illuminate\Http\JsonResponse;

/**
 * Exposes the reporting metadata the builder UI needs: which data sources exist
 * and, for each, the fields (dimensions/measures), their data types, permitted
 * aggregations, and permitted filter operators.
 */
class DataSourceController extends Controller
{
    public function __construct(private readonly DataSourceRegistry $registry)
    {
    }

    public function index(): JsonResponse
    {
        $sources = array_map(function (array $source): array {
            return [
                'key' => $source['key'],
                'label' => $source['label'],
                'description' => $source['description'] ?? null,
                'fields' => array_values(array_map(function (array $column): array {
                    return [
                        'key' => $column['key'],
                        'label' => $column['label'],
                        'type' => $column['type'],
                        'data_type' => $column['data_type'],
                        'aggregations' => $column['aggregations'] ?? [],
                        'operators' => DataSourceRegistry::OPERATORS[$column['data_type']] ?? [],
                        'format' => $column['format'] ?? null,
                    ];
                }, $source['columns'])),
            ];
        }, $this->registry->all());

        return response()->json(['data' => array_values($sources)]);
    }
}
