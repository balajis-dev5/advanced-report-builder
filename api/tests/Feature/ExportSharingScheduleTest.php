<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\ReportSchedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Covers Slice 5: exporting reports (CSV / XLSX / PDF), sharing a report with
 * another user at view/edit permissions, and scheduling automated deliveries.
 */
class ExportSharingScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $teammate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->teammate = User::factory()->create(['email' => 'teammate@test.local']);

        DB::table('deals')->insert([
            $this->deal(['region' => 'North', 'amount' => 100]),
            $this->deal(['region' => 'South', 'amount' => 400]),
        ]);
    }

    public function test_csv_export_streams_with_headers_and_totals(): void
    {
        $response = $this->actingAs($this->owner, 'api')->post('/api/reports/run/export', [
            'data_source' => 'deals',
            'type' => 'summary',
            'format' => 'csv',
            'name' => 'Revenue',
            'config' => [
                'group_by' => ['region'],
                'measures' => [['field' => 'amount', 'agg' => 'sum']],
                'sort' => [['field' => 'region', 'direction' => 'asc']],
            ],
        ]);

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=utf-8');

        $body = $response->streamedContent();
        $this->assertStringContainsString('Region', $body);
        $this->assertStringContainsString('North,100', $body);
        $this->assertStringContainsString('Total,500', $body);
    }

    public function test_xlsx_export_is_a_valid_zip_package(): void
    {
        $response = $this->actingAs($this->owner, 'api')->post('/api/reports/run/export', [
            'data_source' => 'deals',
            'type' => 'summary',
            'format' => 'xlsx',
            'config' => ['group_by' => ['region'], 'measures' => [['field' => 'amount', 'agg' => 'sum']]],
        ]);

        $response->assertOk();
        // xlsx is a ZIP — it must start with the PK signature.
        $this->assertSame('PK', substr($response->streamedContent(), 0, 2));
    }

    public function test_pdf_export_returns_a_pdf_document(): void
    {
        $response = $this->actingAs($this->owner, 'api')->post('/api/reports/run/export', [
            'data_source' => 'deals',
            'type' => 'matrix',
            'format' => 'pdf',
            'config' => ['row' => 'region', 'column' => 'stage', 'measure' => ['field' => 'amount', 'agg' => 'sum']],
        ]);

        $response->assertOk();
        $this->assertSame('%PDF', substr($response->streamedContent(), 0, 4));
    }

    public function test_owner_can_share_and_recipient_sees_the_report(): void
    {
        $report = $this->ownedReport();

        $this->actingAs($this->owner, 'api')
            ->postJson("/api/reports/{$report->id}/shares", [
                'email' => $this->teammate->email,
                'permission' => 'view',
            ])
            ->assertCreated();

        $list = $this->actingAs($this->teammate, 'api')->getJson('/api/reports')->json('data');

        $this->assertCount(1, $list);
        $this->assertSame('view', $list[0]['access']);
        $this->assertSame($this->owner->email, $list[0]['owner']['email']);
    }

    public function test_view_share_cannot_edit_or_delete(): void
    {
        $report = $this->ownedReport();
        $report->shares()->create(['user_id' => $this->teammate->id, 'permission' => 'view']);

        // A view-only recipient may run it…
        $this->actingAs($this->teammate, 'api')
            ->postJson("/api/reports/{$report->id}/run")
            ->assertOk();

        // …but cannot edit or delete it.
        $this->actingAs($this->teammate, 'api')
            ->putJson("/api/reports/{$report->id}", [
                'name' => 'Hijacked',
                'data_source' => 'deals',
                'type' => 'summary',
                'config' => $report->config,
            ])
            ->assertNotFound();

        $this->actingAs($this->teammate, 'api')
            ->deleteJson("/api/reports/{$report->id}")
            ->assertNotFound();
    }

    public function test_schedule_can_be_created_and_run_now(): void
    {
        $report = $this->ownedReport();

        $create = $this->actingAs($this->owner, 'api')->postJson("/api/reports/{$report->id}/schedules", [
            'frequency' => 'daily',
            'format' => 'csv',
            'hour' => 7,
            'recipients' => ['ops@test.local'],
        ]);

        $create->assertCreated();
        $create->assertJsonPath('data.next_run_at', fn ($v) => $v !== null);

        $scheduleId = $create->json('data.id');

        $run = $this->actingAs($this->owner, 'api')->postJson("/api/schedules/{$scheduleId}/run");
        $run->assertOk();
        $run->assertJsonPath('data.status', 'generated');

        $schedule = ReportSchedule::find($scheduleId);
        $this->assertNotNull($schedule->last_run_at);
        $this->assertDatabaseHas('report_deliveries', [
            'report_schedule_id' => $scheduleId,
            'status' => 'generated',
        ]);
    }

    public function test_non_owner_cannot_manage_schedules(): void
    {
        $report = $this->ownedReport();
        $report->shares()->create(['user_id' => $this->teammate->id, 'permission' => 'edit']);

        $this->actingAs($this->teammate, 'api')
            ->postJson("/api/reports/{$report->id}/schedules", [
                'frequency' => 'daily',
                'format' => 'csv',
                'hour' => 7,
            ])
            ->assertNotFound();
    }

    private function ownedReport(): Report
    {
        return $this->owner->reports()->create([
            'name' => 'Revenue by region',
            'data_source' => 'deals',
            'type' => 'summary',
            'config' => ['group_by' => ['region'], 'measures' => [['field' => 'amount', 'agg' => 'sum']]],
        ]);
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
