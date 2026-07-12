<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectMemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'role_in_project' => $this->pivot ? $this->pivot->role_in_project : null,
            'joined_at' => $this->pivot && $this->pivot->created_at ? $this->pivot->created_at->toIso8601String() : null,
        ];
    }
}
