<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * AuditLogService
 *
 * Centralised service for recording all compliance-significant actions.
 *
 * Why a dedicated service?
 *   - Ensures consistent log format across all controllers
 *   - Decouples logging logic from business logic (Single Responsibility)
 *   - Allows future extension (e.g., async logging, SIEM integration, Kafka publishing)
 *   - Makes it trivial to add logging to new features without boilerplate
 *
 * AML regulatory requirement:
 *   Under FATF Recommendation 10 and EU AMLD6, regulated entities must
 *   maintain records of all account actions and transaction decisions for
 *   a minimum of 5 years. This service is the mechanism for that requirement.
 *
 * Example actions logged:
 *   "user.login"             | "user.logout"
 *   "account.suspended"      | "account.activated"
 *   "transaction.blocked"    | "transaction.approved"
 *   "alert.assigned"         | "alert.resolved" | "alert.false_positive"
 *   "user.created"           | "user.role_changed"
 */
class AuditLogService
{
    /**
     * Record a compliance action to the audit log.
     *
     * @param string $action  Machine-readable action identifier (e.g., "account.suspended")
     * @param array  $details Contextual data to store (entity IDs, old/new values, IP, etc.)
     * @param int|null $userId Defaults to the currently authenticated user's ID
     */
    public function log(string $action, array $details = [], ?int $userId = null): AuditLog
    {
        // Use the authenticated user if no specific user ID is provided
        $resolvedUserId = $userId ?? Auth::id();

        // Enrich details with standard context fields for SIEM compatibility
        $enrichedDetails = array_merge([
            'timestamp' => now()->toIso8601String(),
            'ip'        => request()->ip(),
            'user_agent' => request()->userAgent(),
        ], $details);

        // Persist the audit record — this should be idempotent and never throw
        return AuditLog::create([
            'user_id' => $resolvedUserId,
            'action'  => $action,
            'details' => json_encode($enrichedDetails),
        ]);
    }

    /**
     * Log a user authentication event (login or logout).
     *
     * @param string $event  'login' or 'logout'
     * @param int    $userId The authenticating user's ID
     */
    public function logAuth(string $event, int $userId): AuditLog
    {
        return $this->log("user.{$event}", [
            'user_id' => $userId,
        ], $userId);
    }

    /**
     * Log an account status change (freeze / unfreeze / review).
     *
     * @param int    $accountId The account being modified
     * @param string $oldStatus Previous status value
     * @param string $newStatus New status value
     */
    public function logAccountStatusChange(int $accountId, string $oldStatus, string $newStatus): AuditLog
    {
        $action = match ($newStatus) {
            'suspended'    => 'account.suspended',
            'under_review' => 'account.under_review',
            'active'       => 'account.activated',
            default        => 'account.status_changed',
        };

        return $this->log($action, [
            'account_id' => $accountId,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);
    }

    /**
     * Log a transaction disposition decision (approve or block).
     *
     * @param int    $transactionId The transaction being actioned
     * @param string $newStatus     'approved' or 'blocked'
     */
    public function logTransactionDisposition(int $transactionId, string $newStatus): AuditLog
    {
        $action = $newStatus === 'blocked' ? 'transaction.blocked' : 'transaction.approved';

        return $this->log($action, [
            'transaction_id' => $transactionId,
            'new_status'     => $newStatus,
        ]);
    }

    /**
     * Log a GNN alert status change during the compliance review workflow.
     *
     * @param int    $alertId   The alert being updated
     * @param string $oldStatus Previous workflow status
     * @param string $newStatus New workflow status
     */
    public function logAlertStatusChange(int $alertId, string $oldStatus, string $newStatus): AuditLog
    {
        return $this->log("alert.{$newStatus}", [
            'alert_id'   => $alertId,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);
    }
}
