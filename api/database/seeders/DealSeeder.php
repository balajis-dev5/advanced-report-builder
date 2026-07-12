<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the demo `deals` dataset with realistic, weighted-random data so that
 * grouped and pivoted reports produce meaningful, non-uniform results.
 *
 * The randomness is seeded (mt_srand) so repeated runs of `migrate:fresh --seed`
 * produce the same dataset — handy for screenshots and demos.
 */
class DealSeeder extends Seeder
{
    private const REGIONS = ['North', 'South', 'East', 'West'];

    private const PRODUCTS = ['Analytics', 'Platform', 'Support', 'Training'];

    private const SOURCES = ['Web', 'Referral', 'Partner', 'Outbound', 'Event'];

    /** Stage => weight. Later pipeline stages are rarer, mirroring a real funnel. */
    private const STAGES = [
        'Lead' => 26,
        'Qualified' => 22,
        'Proposal' => 18,
        'Negotiation' => 12,
        'Won' => 14,
        'Lost' => 8,
    ];

    private const OWNERS = [
        'Ava Thompson', 'Liam Carter', 'Noah Patel', 'Mia Rodriguez',
        'Ethan Nguyen', 'Sophia Khan', 'Lucas Silva', 'Isabella Rossi',
    ];

    private const CUSTOMER_PREFIXES = [
        'Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Vandelay',
        'Wayne', 'Stark', 'Wonka', 'Hooli', 'Pied Piper', 'Cyberdyne',
        'Massive Dynamic', 'Gekko', 'Oscorp', 'Tyrell', 'Nakatomi', 'Aperture',
    ];

    private const CUSTOMER_SUFFIXES = ['Inc', 'LLC', 'Group', 'Labs', 'Systems', 'Corp'];

    public function run(): void
    {
        mt_srand(20240102);

        $count = 800;
        $now = Carbon::create(2024, 12, 31);
        $rows = [];

        for ($i = 0; $i < $count; $i++) {
            $region = self::REGIONS[array_rand(self::REGIONS)];
            $product = self::PRODUCTS[array_rand(self::PRODUCTS)];
            $source = self::SOURCES[array_rand(self::SOURCES)];
            $stage = $this->weightedStage();
            $owner = self::OWNERS[array_rand(self::OWNERS)];
            $customer = self::CUSTOMER_PREFIXES[array_rand(self::CUSTOMER_PREFIXES)]
                . ' ' . self::CUSTOMER_SUFFIXES[array_rand(self::CUSTOMER_SUFFIXES)];

            // Amount depends on product so summaries differ by dimension.
            $base = match ($product) {
                'Platform' => mt_rand(15000, 90000),
                'Analytics' => mt_rand(8000, 55000),
                'Support' => mt_rand(3000, 20000),
                'Training' => mt_rand(2000, 12000),
            };
            $amount = round($base + mt_rand(0, 5000), 2);

            $quantity = mt_rand(1, 25);
            $probability = $this->stageProbability($stage);

            // Opened somewhere in the last ~2 years.
            $opened = $now->copy()->subDays(mt_rand(0, 720));
            $closed = in_array($stage, ['Won', 'Lost'], true)
                ? $opened->copy()->addDays(mt_rand(5, 120))
                : null;

            $rows[] = [
                'title' => "{$product} deal — {$customer}",
                'customer' => $customer,
                'region' => $region,
                'product' => $product,
                'source' => $source,
                'stage' => $stage,
                'owner' => $owner,
                'amount' => $amount,
                'quantity' => $quantity,
                'probability' => $probability,
                'opened_at' => $opened->toDateString(),
                'closed_at' => $closed?->toDateString(),
                'created_at' => $opened,
                'updated_at' => $closed ?? $opened,
            ];
        }

        // Chunked insert keeps memory flat and is fast on SQLite/Postgres alike.
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('deals')->insert($chunk);
        }

        mt_srand();
    }

    private function weightedStage(): string
    {
        $total = array_sum(self::STAGES);
        $roll = mt_rand(1, $total);
        $acc = 0;

        foreach (self::STAGES as $stage => $weight) {
            $acc += $weight;
            if ($roll <= $acc) {
                return $stage;
            }
        }

        return array_key_first(self::STAGES);
    }

    private function stageProbability(string $stage): int
    {
        return match ($stage) {
            'Lead' => mt_rand(5, 20),
            'Qualified' => mt_rand(20, 40),
            'Proposal' => mt_rand(40, 60),
            'Negotiation' => mt_rand(60, 85),
            'Won' => 100,
            'Lost' => 0,
        };
    }
}
