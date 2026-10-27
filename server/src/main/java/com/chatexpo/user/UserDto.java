package com.chatexpo.user;

public record UserDto(Long id, String username, String avatarUrl) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getAvatarUrl());
    }
}
