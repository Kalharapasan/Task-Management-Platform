<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class TaskController extends Controller
{
   
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $project->tasks()->paginate(15);
        return TaskResource::collection($tasks)->response();
    }

   
    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', [Task::class, $project]);

        $task = Task::create(array_merge(
            $request->validated(),
            [
                'project_id' => $project->id,
                'created_by' => $request->user()->id,
            ]
        ));

        return (new TaskResource($task))
            ->response()
            ->setStatusCode(201);
    }

   
    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return (new TaskResource($task->load(['project', 'assignee', 'creator'])))->response();
    }

   
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $task->update($request->validated());

        return (new TaskResource($task))->response();
    }

   
    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully (soft deleted).',
        ], 200);
    }
}
