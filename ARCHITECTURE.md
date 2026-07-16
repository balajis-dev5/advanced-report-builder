# Advanced Report Builder — Architecture & Interview Deep-Dive

The document you study before interviews, and the design doc that guides the build.

## 1. The core idea

Every reporting product converges on the same three-part architecture:

```
┌─────────────┐    JSON     ┌──────────────────┐   SQL    ┌──────────┐
│  Builder UI  │ ──────────▶ │  Report Compiler │ ───────▶ │ Database │
│ (React 19)   │  definition │  (Laravel svc)   │          │(Postgres)│
└─────────────┘             └──────────────────┘          └──────────┘
       ▲                            │
       │   rows / chart data        ▼
       └──────────────────── Transformers (matrix pivot, chart series)
```

The **report definition** is the contract. The UI never builds SQL; the API never trusts the UI. Everything hard lives in the compiler.

## 2. Safety: why this is NOT SQL injection waiting to happen

This is the #1 interview question you'll get. The answer:

1. **Field whitelist (`FieldRegistry`)** — every module declares its reportable fields with type + allowed operators. `"field": "owner.name"` resolves through the registry to a known join + column; an unknown field is a 422, never interpolated.
2. **Operator whitelist** — `op` maps to a closed set (`=`, `!=`, `>`, `<`, `in`, `between`, `contains`, `relative_date`, …). Each maps to a query-builder call, never string concatenation.
3. **Values are always bound parameters** via Laravel's query builder.
4. **Structural limits** — max filter depth (3), max conditions (30), max group-by (3): protects against pathological definitions.

```php
// FilterCompiler::apply() — the shape interviewers ask you to whiteboard
private function applyCondition(Builder $q, Condition $c, string $boolean): void
{
    $column = $this->registry->resolve($c->field);   // throws on unknown field

    match ($c->op) {
        'in'            => $q->whereIn($column, $c->value, $boolean),
        'between'       => $q->whereBetween($column, $c->value, $boolean),
        'contains'      => $q->where($column, 'like', '%'.escapeLike($c->value).'%', $boolean),
        'relative_date' => $q->whereBetween($column, $this->dates->resolve($c->value), $boolean),
        default         => $q->where($column, $c->op, $c->value, $boolean),
    };
}
```

## 3. Compilation by report type

| Type | SQL shape | Notes |
|---|---|---|
| Detail | `SELECT cols … WHERE … ORDER BY … LIMIT/OFFSET` | Cursor pagination for deep pages |
| Summary | `SELECT groups, aggs … GROUP BY … ` | Multi-level group-by ordered by level |
| Matrix | Summary query + in-PHP pivot (`MatrixTransformer`) | Pivoting in PHP keeps SQL portable; column cardinality capped (e.g. 50) |

**Relative dates** resolve server-side at *run time*, not save time — "last 7 days" must mean the last 7 days from today, every time it runs. `RelativeDateResolver` takes the user's timezone and returns `[start, end]`.

## 4. Scheduling pipeline

```
schedule:work (every minute)
  └─ DueScheduleScanner: WHERE next_run_at <= now
       └─ dispatch RunScheduledReport (queue: reports)
            ├─ compile + run definition
            ├─ GenerateExport (xlsx/pdf/csv — chunked)
            ├─ Mail / WhatsApp notification with attachment
            └─ update last_run_at, compute next_run_at (timezone-aware)
```

**As built (slice 5):** the pipeline is the synchronous core of this design —
`reports:run-scheduled` (hourly via the Laravel scheduler) scans
`WHERE next_run_at <= now AND is_active`, and `ScheduleDispatcher` exports,
stores the file, records a `report_deliveries` row, and recomputes
`next_run_at`. A `POST /schedules/{id}/run` endpoint triggers the same
dispatcher on demand. Queued jobs, mail transport, and timezone handling are
the deliberate next steps below.

Design decisions to defend in interviews:
- **`next_run_at` precomputed column** instead of evaluating cron expressions on scan — the scanner is a single indexed range query.
- **Queue isolation** — reports run on their own queue so a heavy export can't starve transactional emails.
- **Idempotency** — job takes a `run_id`; retries won't email twice (unique constraint on `report_runs.run_id`).
- **Failure policy** — 3 tries, exponential backoff, then mark run failed + notify owner (not recipients).

## 5. Export memory model

Naive export: `Model::all()` → collection → array → xlsx = OOM at ~100k rows.

This project: `query->orderBy('id')->chunkById(2000)` → write rows to a streamed writer → constant memory regardless of row count. PDF caps at N rows with a "download Excel for full data" note (PDF is a layout format, not a data format — say this line in interviews).

## 6. Frontend architecture

- `types/report.ts` defines `ReportDefinition` — the same shape the server validates with its FormRequest; Zod schema mirrors it client-side. One contract, two validators.
- Builder state = one `useReducer` over the definition object. Every control (field picker, filter tree, group-by list, chart config) edits the definition; **preview is just `POST /reports/preview` with the current definition**, debounced 600ms, cached by TanStack Query on the serialized definition.
- Chart rendering reads the same summary rows as the table — a chart is a *view* of the result, not a different query.

## 7. Performance notes (real lessons, reproduced here)

1. Filter-heavy queries need **composite indexes matching (tenant/company_id, filter column, date)** — order matters; leftmost prefix rule.
2. `GROUP BY` on a low-cardinality column with a covering index avoids filesort — verify with `EXPLAIN FORMAT=json`.
3. Counting for pagination is often more expensive than the page itself — use `EXPLAIN`-estimated counts or "more than 10,000" UX beyond a threshold.
4. Picklist-history tracking is an append-only table `(record_id, field, old_value, new_value, changed_at)` with a compound index — never UPDATE-in-place if you need "stage movement" reports.

## 8. Technical challenges & solutions (README "war stories" section)

| Challenge | Solution |
|---|---|
| Users built reports that timed out | Structural limits + query timeout + EXPLAIN-based "this report may be slow" warning before save |
| Matrix pivot exploded with high-cardinality columns | Cap distinct column values (50) + "Other" bucket |
| Relative dates wrong for users in other timezones | Resolve ranges in the *user's* timezone, query in UTC |
| Scheduled reports drifting after DST | Store timezone + local time, recompute next_run_at per run |
| Duplicate emails on worker retry | Idempotent run IDs + unique constraint |

## 9. Interview Q&A (rehearse out loud)

**Q: Walk me through what happens when a user clicks "Run".**
Definition POSTs to `/reports/preview` → FormRequest validates shape → `ReportCompiler` resolves fields via registry, applies filter tree, group-bys, aggregates → paginated execution → transformer shapes rows (pivot for matrix) → JSON back → table + chart render the same payload.

**Q: How do you prevent SQL injection when users define queries?**
(Section 2 — whitelist fields, whitelist operators, bind values, cap structure.)

**Q: Why JSON definitions instead of saving raw SQL?**
Portability (the same definition compiles for Postgres in production or SQLite in local dev), safety (no SQL in DB), evolvability (migrate definitions), and the UI can re-open and edit a saved report — you can't reliably parse SQL back into UI state.

**Q: A customer says their report is slow. Debug it.**
Get the definition → reproduce → `EXPLAIN FORMAT=json` → look for full scans/filesort → check index vs filter+group columns → fix index or query shape → add regression test with seeded volume.

**Q: How would you scale this 10×?**
Read replica for report queries; result cache keyed on (definition hash, data version); pre-aggregation tables for common daily rollups; move exports to object storage with signed URLs; per-tenant rate limits on preview.

**Q: Why did you cap filter depth at 3?**
Real users never legitimately need more; unbounded recursion is a DoS vector; and the UI for deeper nesting is unusable anyway — product judgment, not just a technical guard.

## 10. Build order (maps to the repo's GitFlow branches)

1. `feature/field-registry` — module metadata + demo CRM seeders
2. `feature/filter-engine` — FilterCompiler + RelativeDateResolver (+ densest unit tests)
3. `feature/report-builder` — detail/summary compilation + preview endpoint
4. `feature/builder-ui` — React builder + preview table
5. `feature/charts` — chart config + rendering
6. `feature/matrix` — MatrixTransformer
7. `feature/export` — chunked exports
8. `feature/scheduler` — schedules + delivery
9. `feature/sharing` — RBAC
10. `release/v1.0.0`
