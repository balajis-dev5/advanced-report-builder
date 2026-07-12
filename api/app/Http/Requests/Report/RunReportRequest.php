<?php

namespace App\Http\Requests\Report;

use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the *shape* of an ad-hoc report run. The deep semantic validation
 * (are these columns/aggregations/operators actually permitted?) is the
 * ReportCompiler's job, driven by the DataSourceRegistry.
 */
class RunReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'data_source' => ['required', 'string'],
            'type' => ['required', Rule::in(Report::TYPES)],
            'config' => ['required', 'array'],
        ];
    }
}
