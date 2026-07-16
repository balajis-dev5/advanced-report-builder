<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Fire due report schedules once an hour. In production this runs behind a
// single `php artisan schedule:run` cron entry (every minute).
Schedule::command('reports:run-scheduled')->hourly()->withoutOverlapping();
