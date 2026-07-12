<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        $project = $task->project;

        // Project Manager who created the project
        if ($user->isProjectManager() && $project->created_by === $user->id) {
            return true;
        }

        // Must be a member of the project
        return $project->members()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user, Project $project): bool
    {
        return $user->isProjectManager() && $project->created_by === $user->id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        return $user->isProjectManager() && $task->project->created_by === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        return $user->isProjectManager() && $task->project->created_by === $user->id;
    }

    /**
     * Determine whether the user can update status/progress on the task.
     */
    public function updateStatus(User $user, Task $task): bool
    {
        if ($user->isProjectManager() && $task->project->created_by === $user->id) {
            return true;
        }

        // Team members can only update status if the task is assigned to them
        return $task->assigned_to === $user->id;
    }

    /**
     * Determine whether the user can comment on the task.
     */
    public function comment(User $user, Task $task): bool
    {
        if ($user->isProjectManager() && $task->project->created_by === $user->id) {
            return true;
        }

        // Team members can only comment if the task is assigned to them
        return $task->assigned_to === $user->id;
    }
}
