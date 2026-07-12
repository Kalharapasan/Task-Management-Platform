<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\TaskCommentResource;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\JsonResponse;

class TaskCommentController extends Controller
{
    
    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $comments = $task->comments()->with('user')->paginate(15);
        return TaskCommentResource::collection($comments)->response();
    }

  
    public function store(StoreCommentRequest $request, Task $task): JsonResponse
    {
        $this->authorize('comment', $task);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'comment' => $request->comment,
        ]);

        return (new TaskCommentResource($comment->load('user')))
            ->response()
            ->setStatusCode(201);
    }
}
