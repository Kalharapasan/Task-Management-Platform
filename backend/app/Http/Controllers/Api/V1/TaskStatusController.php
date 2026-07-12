<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTaskStatusRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class TaskStatusController extends Controller
{
    
    public function update(UpdateTaskStatusRequest $request, Task $task): JsonResponse
    {
        $this->authorize('updateStatus', $task);

        $task->update([
            'status' => $request->status,
        ]);

        return (new TaskResource($task))->response();
    }
}
