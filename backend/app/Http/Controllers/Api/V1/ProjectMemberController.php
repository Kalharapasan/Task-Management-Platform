<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectMemberRequest;
use App\Http\Resources\ProjectMemberResource;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ProjectMemberController extends Controller
{
   
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $members = $project->members()->paginate(15);
        return ProjectMemberResource::collection($members)->response();
    }

   
    public function store(StoreProjectMemberRequest $request, Project $project): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        $project->members()->attach($request->user_id, [
            'role_in_project' => $request->role_in_project,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $member = $project->members()->where('user_id', $request->user_id)->first();

        return (new ProjectMemberResource($member))
            ->response()
            ->setStatusCode(201);
    }

    
    public function destroy(Project $project, User $user): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        if (!$project->members()->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'User is not a member of this project.',
            ], 404);
        }

        $project->members()->detach($user->id);

        return response()->json([
            'message' => 'Member removed from project successfully.',
        ], 200);
    }
}
