<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A saved report definition. The actual query is never stored — only its
 * declarative definition (`config`), which the ReportCompiler turns into a
 * validated query at run time. This keeps saved reports safe: even a tampered
 * config is re-validated against the DataSourceRegistry on every run.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('data_source');
            $table->string('type'); // detail | summary | matrix
            $table->json('config');
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
