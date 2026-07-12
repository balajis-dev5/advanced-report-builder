<?php

namespace App\Http\Requests\Report;

use App\Models\Report;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates saving (create/update) a report definition. Used for both store and
 * update; on update the `sometimes` rules let clients send partial payloads.
 */
class SaveReportRequest extends FormRequest
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
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'data_source' => [$required, 'string'],
            'type' => [$required, Rule::in(Report::TYPES)],
            'config' => [$required, 'array'],
        ];
    }
}
