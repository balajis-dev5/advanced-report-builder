<?php

namespace App\Support;

use App\Models\Report;
use App\Models\ReportShare;
use App\Models\User;

/**
 * Central authority for "what can this user do with this report?".
 *
 * Three levels, each strictly containing the previous:
 *   - view:   owner, or anyone the report is shared with (view or edit)
 *   - edit:   owner, or a recipient shared at "edit"
 *   - manage: owner only (rename config aside — delete, share, schedule)
 *
 * Every controller routes its authorization through here so the rules live in
 * exactly one place.
 */
class ReportAccess
{
    public static function canView(User $user, Report $report): bool
    {
        return self::isOwner($user, $report) || self::shareLevel($user, $report) !== null;
    }

    public static function canEdit(User $user, Report $report): bool
    {
        return self::isOwner($user, $report)
            || self::shareLevel($user, $report) === ReportShare::PERMISSION_EDIT;
    }

    public static function canManage(User $user, Report $report): bool
    {
        return self::isOwner($user, $report);
    }

    /**
     * The access label to expose to the client: 'owner' | 'edit' | 'view' | null.
     */
    public static function label(User $user, Report $report): ?string
    {
        if (self::isOwner($user, $report)) {
            return 'owner';
        }

        return self::shareLevel($user, $report);
    }

    private static function isOwner(User $user, Report $report): bool
    {
        return $report->user_id === $user->id;
    }

    /**
     * The permission a share grants this user for this report, or null if none.
     * Uses the already-loaded shares relation when present to avoid extra queries.
     */
    private static function shareLevel(User $user, Report $report): ?string
    {
        $share = $report->relationLoaded('shares')
            ? $report->shares->firstWhere('user_id', $user->id)
            : $report->shares()->where('user_id', $user->id)->first();

        return $share?->permission;
    }
}
