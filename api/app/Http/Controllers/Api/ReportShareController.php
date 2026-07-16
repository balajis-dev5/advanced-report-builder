<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportShare;
use App\Models\User;
use App\Support\ReportAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Manage who a report is shared with. Only the report owner may view or change
 * the share list.
 */
class ReportShareController extends Controller
{
    public function index(Request $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

        $shares = $report->shares()->with('user:id,name,email')->get()
            ->map(fn (ReportShare $s) => [
                'user_id' => $s->user_id,
                'name' => $s->user->name,
                'email' => $s->user->email,
                'permission' => $s->permission,
            ]);

        return response()->json(['data' => $shares]);
    }

    public function store(Request $request, Report $report): JsonResponse
    {
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'permission' => ['required', Rule::in(ReportShare::PERMISSIONS)],
        ]);

        $recipient = User::where('email', $validated['email'])->first();

        if ($recipient === null) {
            throw ValidationException::withMessages([
                'email' => 'No user with that email exists.',
            ]);
        }

        if ($recipient->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'email' => 'You already own this report.',
            ]);
        }

        $report->shares()->updateOrCreate(
            ['user_id' => $recipient->id],
            ['permission' => $validated['permission']],
        );

        return response()->json([
            'data' => [
                'user_id' => $recipient->id,
                'name' => $recipient->name,
                'email' => $recipient->email,
                'permission' => $validated['permission'],
            ],
        ], 201);
    }

    public function destroy(Request $request, Report $report, User $user): JsonResponse
    {
        abort_unless(ReportAccess::canManage($request->user(), $report), 404);

        $report->shares()->where('user_id', $user->id)->delete();

        return response()->json(status: 204);
    }
}
