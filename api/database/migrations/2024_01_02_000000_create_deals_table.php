<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `deals` table is the demo reporting dataset. It is intentionally a single,
 * lightly denormalized fact table: a mix of categorical dimensions (region,
 * product, stage, ...) and numeric measures (amount, quantity, probability),
 * plus date columns. This shape lets the report engine demonstrate detail,
 * summary (group-by), and matrix (pivot) reports without any joins.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deals', function (Blueprint $table) {
            $table->id();

            // Detail-level attributes
            $table->string('title');
            $table->string('customer');

            // Dimensions (categorical) — used for grouping, pivoting, filtering
            $table->string('region');
            $table->string('product');
            $table->string('source');
            $table->string('stage');
            $table->string('owner');

            // Measures (numeric) — used for aggregation
            $table->decimal('amount', 12, 2);
            $table->unsignedInteger('quantity');
            $table->unsignedTinyInteger('probability');

            // Date dimensions
            $table->date('opened_at');
            $table->date('closed_at')->nullable();

            $table->timestamps();

            // Indexes on the most commonly grouped/filtered dimensions
            $table->index('region');
            $table->index('product');
            $table->index('stage');
            $table->index('opened_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deals');
    }
};
