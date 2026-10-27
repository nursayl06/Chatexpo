package com.chatexpo.auth;

import com.chatexpo.user.UserDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 32)
            @Pattern(regexp = "^[A-Za-z0-9_.]+$", message = "only letters, digits, _ and .")
            String username,
            @NotBlank @Size(min = 6, max = 72) String password) {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record AuthResponse(String accessToken, String refreshToken, long expiresIn, UserDto user) {}
}
