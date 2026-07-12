<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
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
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Scoped in the query, but we allow anyone authenticated to request the endpoint
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Project $project): bool
    {
        // Project Manager who created the project
        if ($user->isProjectManager() && $project->created_by === $user->id) {
            return true;
        }

        // Project Manager or Team Member who is a member of the project
        return $project->members()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isProjectManager();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Project $project): bool
    {
        return $user->isProjectManager() && $project->created_by === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Project $project): bool
    {
        return $user->isProjectManager() && $project->created_by === $user->id;
    }

    /**
     * Determine whether the user can manage (add/remove) project members.
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $user->isProjectManager() && $project->created_by === $user->id;
    }
}
