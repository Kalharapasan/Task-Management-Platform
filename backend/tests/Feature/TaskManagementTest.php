<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test the authentication flow.
     */
    public function test_auth_flow(): void
    {
        // 1. Register
        $registerResponse = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $registerResponse->assertStatus(201);
        $registerResponse->assertJsonStructure(['user', 'token']);
        $this->assertDatabaseHas('users', ['email' => 'john@example.com']);

        // 2. Login
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertStatus(200);
        $loginResponse->assertJsonStructure(['user', 'token']);
        $token = $loginResponse->json('token');

        // 3. Me (GET Auth User Details)
        $meResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/me');

        $meResponse->assertStatus(200);
        $meResponse->assertJsonFragment(['email' => 'john@example.com']);

        // 4. Logout
        $logoutResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/logout');

        $logoutResponse->assertStatus(200);
    }

    /**
     * Test role-based access control restrictions.
     */
    public function test_role_based_access_denials(): void
    {
        $member = User::factory()->create(['role' => 'team_member']);
        $token = $member->createToken('auth_token')->plainTextToken;

        // 1. Team Member tries to access admin-only Users list (Should be 403)
        $usersResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/users');

        $usersResponse->assertStatus(403);

        // 2. Team Member tries to create a project (Should be 403)
        $projectResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/projects', [
            'name' => 'Forbidden Project',
            'status' => 'planning',
            'start_date' => '2026-07-01',
            'end_date' => '2026-08-01',
        ]);

        $projectResponse->assertStatus(403);
    }

    /**
     * Test CRUD happy paths for projects and tasks.
     */
    public function test_crud_happy_paths_for_projects_and_tasks(): void
    {
        // 1. Create PM and authenticate
        $pm = User::factory()->create(['role' => 'project_manager']);
        $member = User::factory()->create(['role' => 'team_member']);
        $token = $pm->createToken('auth_token')->plainTextToken;

        // 2. PM creates a project
        $projectResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/projects', [
            'name' => 'PM Managed Project',
            'description' => 'Test project description.',
            'status' => 'planning',
            'start_date' => '2026-07-01',
            'end_date' => '2026-08-01',
        ]);

        $projectResponse->assertStatus(201);
        $projectId = $projectResponse->json('data.id');

        // 3. PM adds a member to the project
        $memberResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/v1/projects/{$projectId}/members", [
            'user_id' => $member->id,
            'role_in_project' => 'Developer',
        ]);

        $memberResponse->assertStatus(201);
        $this->assertDatabaseHas('project_members', [
            'project_id' => $projectId,
            'user_id' => $member->id,
        ]);

        // 4. PM creates a task inside the project
        $taskResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/v1/projects/{$projectId}/tasks", [
            'title' => 'Sample Task',
            'description' => 'Detailed description.',
            'status' => 'todo',
            'priority' => 'high',
            'assigned_to' => $member->id,
            'due_date' => '2026-07-15',
        ]);

        $taskResponse->assertStatus(201);
        $taskId = $taskResponse->json('data.id');

        // 5. Assigned Developer (Team Member) logs in and updates status
        $memberToken = $member->createToken('auth_token')->plainTextToken;
        $statusResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $memberToken,
        ])->patchJson("/api/v1/tasks/{$taskId}/status", [
            'status' => 'in_progress',
        ]);

        $statusResponse->assertStatus(200);
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'status' => 'in_progress',
        ]);
    }
}
