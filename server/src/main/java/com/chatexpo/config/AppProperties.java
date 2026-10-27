package com.chatexpo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Uploads uploads, Messages messages) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {}

    public record Uploads(String dir) {}

    public record Messages(int pageSize) {}
}
