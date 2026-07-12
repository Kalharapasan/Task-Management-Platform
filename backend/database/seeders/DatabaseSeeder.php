<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
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
        $this->command->info('🚀 Starting Project & Task Management Platform database seeding...');

        // 1. Create Users
        $admin = User::create([
            'name' => 'Admin Operator',
            'email' => 'admin@taskplatform.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $pm1 = User::create([
            'name' => 'Project Manager Alice',
            'email' => 'pm1@taskplatform.com',
            'password' => Hash::make('password'),
            'role' => 'project_manager',
        ]);

        $pm2 = User::create([
            'name' => 'Project Manager Bob',
            'email' => 'pm2@taskplatform.com',
            'password' => Hash::make('password'),
            'role' => 'project_manager',
        ]);

        $team = [];
        for ($i = 1; $i <= 5; $i++) {
            $team[] = User::create([
                'name' => "Team Member {$i}",
                'email' => "member{$i}@taskplatform.com",
                'password' => Hash::make('password'),
                'role' => 'team_member',
            ]);
        }

        // 2. Create Projects
        // Project 1 - Managed by Alice (PM1)
        $project1 = Project::create([
            'name' => 'Project Alpha',
            'description' => 'First flagship development project.',
            'status' => 'active',
            'created_by' => $pm1->id,
            'start_date' => now()->subDays(10),
            'end_date' => now()->addDays(30),
        ]);
        // Add members
        $project1->members()->attach([
            $team[0]->id => ['role_in_project' => 'Lead Developer', 'created_at' => now(), 'updated_at' => now()],
            $team[1]->id => ['role_in_project' => 'QA Analyst', 'created_at' => now(), 'updated_at' => now()],
            $pm2->id => ['role_in_project' => 'Consultant PM', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Project 2 - Managed by Bob (PM2)
        $project2 = Project::create([
            'name' => 'Project Beta',
            'description' => 'Planning phase database migration.',
            'status' => 'planning',
            'created_by' => $pm2->id,
            'start_date' => now()->addDays(5),
            'end_date' => now()->addDays(45),
        ]);
        // Add members
        $project2->members()->attach([
            $team[2]->id => ['role_in_project' => 'Database Engineer', 'created_at' => now(), 'updated_at' => now()],
            $team[3]->id => ['role_in_project' => 'Security Specialist', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Project 3 - Managed by Alice (PM1)
        $project3 = Project::create([
            'name' => 'Project Gamma',
            'description' => 'Completed audit reporting dashboard.',
            'status' => 'completed',
            'created_by' => $pm1->id,
            'start_date' => now()->subDays(60),
            'end_date' => now()->subDays(5),
        ]);
        // Add members
        $project3->members()->attach([
            $team[4]->id => ['role_in_project' => 'UI Developer', 'created_at' => now(), 'updated_at' => now()],
            $team[0]->id => ['role_in_project' => 'Fullstack Developer', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 3. Create Tasks
        // Project Alpha Tasks
        $task1 = Task::create([
            'project_id' => $project1->id,
            'title' => 'Design API Endpoints',
            'description' => 'Draft the initial REST endpoints and request shapes.',
            'status' => 'done',
            'priority' => 'high',
            'assigned_to' => $team[0]->id,
            'created_by' => $pm1->id,
            'due_date' => now()->subDays(2),
        ]);

        $task2 = Task::create([
            'project_id' => $project1->id,
            'title' => 'Implement Auth System',
            'description' => 'Set up Laravel Sanctum token auth.',
            'status' => 'in_progress',
            'priority' => 'high',
            'assigned_to' => $team[0]->id,
            'created_by' => $pm1->id,
            'due_date' => now()->addDays(5),
        ]);

        $task3 = Task::create([
            'project_id' => $project1->id,
            'title' => 'Draft QA Test Suite',
            'description' => 'Write test scripts for verifying auth and RBAC.',
            'status' => 'todo',
            'priority' => 'medium',
            'assigned_to' => $team[1]->id,
            'created_by' => $pm1->id,
            'due_date' => now()->addDays(10),
        ]);

        // Project Beta Tasks
        $task4 = Task::create([
            'project_id' => $project2->id,
            'title' => 'Assess Schema Constraints',
            'description' => 'Map relational models and foreign keys.',
            'status' => 'in_review',
            'priority' => 'low',
            'assigned_to' => $team[2]->id,
            'created_by' => $pm2->id,
            'due_date' => now()->addDays(12),
        ]);

        // Project Gamma Tasks
        $task5 = Task::create([
            'project_id' => $project3->id,
            'title' => 'Release Deployment Audit',
            'description' => 'Perform production dry run audits.',
            'status' => 'done',
            'priority' => 'medium',
            'assigned_to' => $team[4]->id,
            'created_by' => $pm1->id,
            'due_date' => now()->subDays(6),
        ]);

        // 4. Create Task Comments
        TaskComment::create([
            'task_id' => $task2->id,
            'user_id' => $team[0]->id,
            'comment' => 'Auth is mostly done, wrapping up migration files tomorrow.',
        ]);

        TaskComment::create([
            'task_id' => $task2->id,
            'user_id' => $pm1->id,
            'comment' => 'Excellent progress, please add Sanctum token expiry tests.',
        ]);

        TaskComment::create([
            'task_id' => $task4->id,
            'user_id' => $team[2]->id,
            'comment' => 'Submitted schema for review, let me know if indices look good.',
        ]);

        $this->command->info('✅ Seeding completed successfully!');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Admin', 'admin@taskplatform.com', 'password'],
                ['Project Manager 1', 'pm1@taskplatform.com', 'password'],
                ['Project Manager 2', 'pm2@taskplatform.com', 'password'],
                ['Team Member 1', 'member1@taskplatform.com', 'password'],
                ['Team Member 2', 'member2@taskplatform.com', 'password'],
                ['Team Member 3', 'member3@taskplatform.com', 'password'],
                ['Team Member 4', 'member4@taskplatform.com', 'password'],
                ['Team Member 5', 'member5@taskplatform.com', 'password'],
            ]
        );
    }
}
