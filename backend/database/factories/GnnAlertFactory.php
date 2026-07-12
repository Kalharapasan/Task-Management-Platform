<?php

namespace Database\Factories;

use App\Models\GnnAlert;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;


class GnnAlertFactory extends Factory
{
    protected $model = GnnAlert::class;

    private array $patterns = [
        'layering', 'structuring', 'rapid_fan_out', 'rapid_fan_in', 'round_tripping', 'mule_network',
    ];

    public function definition(): array
    {
        return [
            'transaction_id'   => Transaction::factory(),
            'graph_node_id'    => 'TXN-' . fake()->numerify('####') . '-NODE-' . fake()->numerify('####'),
            'confidence_score' => fake()->randomFloat(4, 0.75, 0.99),
            'pattern_detected' => fake()->randomElement($this->patterns),
            'status'           => 'open',
            'assigned_to'      => null,
        ];
    }

    
    public function critical(): static
    {
        return $this->state(fn () => [
            'confidence_score' => fake()->randomFloat(4, 0.90, 0.99),
        ]);
    }

   
    public function investigating(): static
    {
        return $this->state(fn () => [
            'status' => 'investigating',
        ]);
    }

    
    public function resolved(): static
    {
        return $this->state(fn () => [
            'status' => 'resolved',
        ]);
    }
}
