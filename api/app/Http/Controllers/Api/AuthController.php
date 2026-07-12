<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * Stateless JWT authentication for the SPA.
 *
 * All tokens are signed with HS256 and carry only the user id in `sub`;
 * the client stores the token and sends it as `Authorization: Bearer <token>`.
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name')->value(),
            'email' => $request->string('email')->value(),
            'password' => Hash::make($request->string('password')->value()),
        ]);

        $token = auth()->login($user);

        return $this->respondWithToken($token, $user, 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $token = auth()->attempt($request->only('email', 'password'));

        if (! $token) {
            return response()->json(['message' => 'These credentials do not match our records.'], 401);
        }

        /** @var User $user */
        $user = auth()->user();

        return $this->respondWithToken($token, $user);
    }

    public function me(): JsonResponse
    {
        return response()->json(['data' => new UserResource(auth()->user())]);
    }

    public function logout(): JsonResponse
    {
        auth()->logout();

        return response()->json(['message' => 'Successfully logged out.']);
    }

    public function refresh(): JsonResponse
    {
        $token = auth()->refresh();

        /** @var User $user */
        $user = auth()->user();

        return $this->respondWithToken($token, $user);
    }

    private function respondWithToken(string $token, User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL() * 60,
            'user' => new UserResource($user),
        ], $status);
    }
}
