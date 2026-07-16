<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An audit record for each time a schedule fires: what was generated, in which
 * format, where the file landed, and whether it succeeded. This is the honest
 * delivery log — actual emailing is a thin adapter over these records (wire an
 * SMTP mailer in .env to turn "generated" into "sent").
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('report_schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->string('format');
            $table->string('status');            // generated | sent | failed
            $table->string('file_path')->nullable();
            $table->unsignedInteger('row_bytes')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_deliveries');
    }
};
