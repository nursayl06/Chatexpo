package com.chatexpo.user;

import com.chatexpo.common.ApiException;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserRepository users;

    public MeController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    public UserDto me(Authentication auth) {
        return UserDto.from(currentUser(auth));
    }

    public record UpdateMeRequest(@Pattern(regexp = "^/uploads/[A-Za-z0-9._-]+$") String avatarUrl) {}

    @PatchMapping
    @Transactional
    public UserDto update(Authentication auth, @jakarta.validation.Valid @RequestBody UpdateMeRequest request) {
        User user = currentUser(auth);
        user.setAvatarUrl(request.avatarUrl());
        return UserDto.from(users.save(user));
    }

    private User currentUser(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
