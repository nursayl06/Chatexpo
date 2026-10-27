package com.chatexpo.auth;

import com.chatexpo.auth.AuthDtos.AuthResponse;
import com.chatexpo.common.ApiException;
import com.chatexpo.config.AppProperties;
import com.chatexpo.user.User;
import com.chatexpo.user.UserDto;
import com.chatexpo.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class AuthService {

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final Duration refreshTtl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwordEncoder, JwtService jwt, AppProperties props) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.refreshTtl = props.jwt().refreshTtl();
    }

    @Transactional
    public AuthResponse register(String username, String password) {
        if (users.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username is already taken");
        }
        User user = users.save(new User(username, passwordEncoder.encode(password)));
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(String username, String password) {
        User user = users.findByUsername(username)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Wrong username or password"));
        return issueTokens(user);
    }

    /** Refresh token rotation: the old token is deleted and a new pair is issued. */
    @Transactional
    public AuthResponse refresh(String token) {
        RefreshToken stored = refreshTokens.findByToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired, please log in again"));
        refreshTokens.delete(stored);
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Session expired, please log in again");
        }
        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(String token) {
        refreshTokens.findByToken(token).ifPresent(refreshTokens::delete);
    }

    private AuthResponse issueTokens(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String refresh = HexFormat.of().formatHex(bytes);
        refreshTokens.save(new RefreshToken(refresh, user, Instant.now().plus(refreshTtl)));
        return new AuthResponse(jwt.createAccessToken(user), refresh, jwt.accessTtlSeconds(), UserDto.from(user));
    }
}
