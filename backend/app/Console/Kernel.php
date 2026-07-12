<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
   
    protected function schedule(Schedule $schedule): void
    {
        // Future: schedule GNN re-scoring pipeline
        // $schedule->command('gnn:rescore-accounts')->daily();

        // Future: weekly compliance report generation
        // $schedule->command('compliance:weekly-report')->weekly();

        // Clean up expired Sanctum tokens (prevents table bloat)
        // $schedule->command('sanctum:prune-expired --hours=24')->daily();
    }

    
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
