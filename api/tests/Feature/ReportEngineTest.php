<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Exercises the reporting engine end-to-end through the HTTP API: the three
 * report types produce correct aggregates, and the security guards reject
 * definitions that reference non-whitelisted fields or aggregations.
 */
class ReportEngineTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // A tiny, deterministic dataset so aggregates are exact.
        DB::table('deals')->insert([
            $this->deal(['region' => 'North', 'stage' => 'Won', 'amount' => 100, 'probability' => 100]),
            $this->deal(['region' => 'North', 'stage' => 'Lead', 'amount' => 200, 'probability' => 10]),
            $this->deal(['region' => 'South', 'stage' => 'Won', 'amount' => 400, 'probability' => 100]),
        ]);
    }

    public function test_summary_report_aggregates_by_dimension(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'summary',
            'config' => [
                'group_by' => ['region'],
                'measures' => [['field' => 'amount', 'agg' => 'sum']],
                'sort' => [['field' => 'region', 'direction' => 'asc']],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.rows.0.region', 'North');
        $response->assertJsonPath('data.rows.0.amount_sum', 300);
        $response->assertJsonPath('data.rows.1.amount_sum', 400);
        $response->assertJsonPath('data.meta.totals.amount_sum', 700);
    }

    public function test_matrix_report_pivots_two_dimensions(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'matrix',
            'config' => [
                'row' => 'region',
                'column' => 'stage',
                'measure' => ['field' => 'amount', 'agg' => 'sum'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.type', 'matrix');
        $response->assertJsonPath('data.grand_total', 700);
        // Two stage columns present (Won, Lead).
        $this->assertEqualsCanonicalizing(
            ['Lead', 'Won'],
            $response->json('data.column_values'),
        );
    }

    public function test_detail_report_applies_filters(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'detail',
            'config' => [
                'columns' => ['region', 'amount'],
                'filters' => [['field' => 'region', 'operator' => '=', 'value' => 'North']],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.meta.row_count', 2);
    }

    public function test_it_rejects_a_non_whitelisted_field(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'detail',
            'config' => ['columns' => ['amount; DROP TABLE deals']],
        ]);

        $response->assertStatus(422);
        // The table must still exist — nothing was executed.
        $this->assertDatabaseCount('deals', 3);
    }

    public function test_it_rejects_a_disallowed_aggregation(): void
    {
        $response = $this->actingAs($this->user, 'api')->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'summary',
            'config' => [
                'group_by' => ['region'],
                'measures' => [['field' => 'probability', 'agg' => 'sum']],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_it_requires_authentication(): void
    {
        $this->postJson('/api/reports/run', [
            'data_source' => 'deals',
            'type' => 'detail',
            'config' => ['columns' => ['region']],
        ])->assertStatus(401);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function deal(array $overrides): array
    {
        return array_merge([
            'title' => 'Test deal',
            'customer' => 'Acme Inc',
            'region' => 'North',
            'product' => 'Platform',
            'source' => 'Web',
            'stage' => 'Lead',
            'owner' => 'Ava Thompson',
            'amount' => 100,
            'quantity' => 1,
            'probability' => 10,
            'opened_at' => '2024-01-01',
            'closed_at' => null,
            'created_at' => '2024-01-01 00:00:00',
            'updated_at' => '2024-01-01 00:00:00',
        ], $overrides);
    }
}
