<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Stable demo account so anyone cloning the repo can log in immediately.
        User::updateOrCreate(
            ['email' => 'demo@arb.test'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        // A second known account so report sharing is demoable end-to-end
        // (share demo@arb.test's report with teammate@arb.test, log in as them).
        User::updateOrCreate(
            ['email' => 'teammate@arb.test'],
            [
                'name' => 'Priya Teammate',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        // A few extra users so lists and "shared with" pickers have data to show.
        if (User::count() < 6) {
            User::factory(5)->create();
        }

        // Demo reporting dataset (only seed once — the seeder is not idempotent).
        if (DB::table('deals')->count() === 0) {
            $this->call(DealSeeder::class);
        }
    }
}
