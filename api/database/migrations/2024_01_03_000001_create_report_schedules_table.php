<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A recurring, automated export of a saved report. The scheduler command
 * (`reports:run-scheduled`) picks up rows whose next_run_at is due, generates
 * the file in the chosen format, and records a delivery.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // owner
            $table->string('frequency');            // daily | weekly | monthly
            $table->string('format');               // csv | xlsx | pdf
            $table->unsignedTinyInteger('hour')->default(7); // hour of day (0-23) to run
            $table->json('recipients')->nullable(); // list of email addresses
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_schedules');
    }
};
