<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorized by Policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $startDate = $this->input('start_date');
        if (!$startDate && $this->route('project')) {
            $startDate = $this->route('project')->start_date;
        }

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'required', 'string', 'in:planning,active,on_hold,completed'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => [
                'sometimes',
                'required',
                'date',
                $startDate ? 'after_or_equal:' . (is_string($startDate) ? $startDate : $startDate->format('Y-m-d')) : 'after_or_equal:start_date'
            ],
        ];
    }
}
