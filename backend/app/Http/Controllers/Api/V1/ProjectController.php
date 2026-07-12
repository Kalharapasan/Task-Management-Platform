<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $user = $request->user();

        if ($user->isAdmin()) {
            $query = Project::query();
        } elseif ($user->isProjectManager()) {
            $query = Project::where('created_by', $user->id);
        } else {
            // Team Member sees projects they are assigned to
            $query = Project::whereHas('members', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $projects = $query->paginate(15);
        return ProjectResource::collection($projects)->response();
    }

    
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $project = Project::create(array_merge(
            $request->validated(),
            ['created_by' => $request->user()->id]
        ));

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode(201);
    }

   
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return (new ProjectResource($project->load(['creator', 'members'])))->response();
    }

    
    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update($request->validated());

        return (new ProjectResource($project))->response();
    }

   
    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully (soft deleted).',
        ], 200);
    }
}
