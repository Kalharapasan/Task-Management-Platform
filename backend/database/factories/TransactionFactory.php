<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;


class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        return [
            'source_account_id'      => Account::factory(),
            'destination_account_id' => Account::factory(),
            'amount'                 => fake()->randomFloat(2, 100, 50000),
            'transaction_type'       => fake()->randomElement(['transfer', 'deposit', 'withdrawal']),
            'status'                 => 'approved',
            'is_fraud_predicted'     => false,
        ];
    }

   
    public function flagged(): static
    {
        return $this->state(fn () => [
            'status'             => 'flagged',
            'is_fraud_predicted' => true,
        ]);
    }

   
    public function blocked(): static
    {
        return $this->state(fn () => [
            'status'             => 'blocked',
            'is_fraud_predicted' => true,
        ]);
    }

    
    public function fraudPredicted(): static
    {
        return $this->state(fn () => [
            'is_fraud_predicted' => true,
            'status'             => 'flagged',
        ]);
    }
}
