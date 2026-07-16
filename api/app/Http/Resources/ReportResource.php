<?php

namespace App\Http\Resources;

use App\Models\Report;
use App\Support\ReportAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Report
 */
class ReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'data_source' => $this->data_source,
            'type' => $this->type,
            'config' => $this->config,
            // The current user's relationship to this report: owner | edit | view.
            'access' => $user ? ReportAccess::label($user, $this->resource) : null,
            'owner' => $this->whenLoaded('user', fn () => [
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
