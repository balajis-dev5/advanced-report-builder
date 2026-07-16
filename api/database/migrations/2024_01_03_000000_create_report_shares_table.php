<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A report can be shared with other users at a "view" or "edit" permission.
 * Ownership always stays with reports.user_id; a share only ever grants access,
 * never transfers it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_shares', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // the recipient
            $table->string('permission')->default('view'); // view | edit
            $table->timestamps();

            $table->unique(['report_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_shares');
    }
};
