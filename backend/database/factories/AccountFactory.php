<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;


class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'account_number' => 'ACC-TEST-' . strtoupper(fake()->unique()->lexify('??????')),
            'customer_name'  => fake()->company(),
            'risk_score'     => fake()->randomFloat(4, 0.0, 0.3), // Default: low risk
            'status'         => 'active',
        ];
    }

    
    public function highRisk(): static
    {
        return $this->state(fn () => [
            'risk_score' => fake()->randomFloat(4, 0.75, 0.99),
            'status'     => 'under_review',
        ]);
    }

 
    public function suspended(): static
    {
        return $this->state(fn () => [
            'risk_score' => fake()->randomFloat(4, 0.80, 0.99),
            'status'     => 'suspended',
        ]);
    }
}
