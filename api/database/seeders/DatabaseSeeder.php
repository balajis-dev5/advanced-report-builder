<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
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

        // A few extra users so lists and "shared with" pickers have data to show.
        if (User::count() < 6) {
            User::factory(5)->create();
        }
    }
}
