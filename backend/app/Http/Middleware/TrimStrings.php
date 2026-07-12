<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TrimStrings as Middleware;

/**
 * TrimStrings — automatically trims whitespace from all string inputs.
 * Prevents issues with email lookups failing due to leading/trailing spaces.
 * password fields are excluded to preserve intentional spaces in passwords.
 */
class TrimStrings extends Middleware
{
    /**
     * The names of the attributes that should not be trimmed.
     * @var array<int, string>
     */
    protected $except = [
        'current_password',
        'password',
        'password_confirmation',
    ];
}
