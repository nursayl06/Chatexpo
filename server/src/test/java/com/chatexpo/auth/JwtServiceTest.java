package com.chatexpo.auth;

import com.chatexpo.config.AppProperties;
import com.chatexpo.user.User;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "bJtqA7m6j/jPF53USEZsmYndbZx5tVLhT9Uj9opNQYaKUjPjiXMgIhNlEVJjkVL5";

    private JwtService service(Duration ttl) {
        var props = new AppProperties(new AppProperties.Jwt(SECRET, ttl, Duration.ofDays(30)),
                new AppProperties.Uploads("./uploads"), new AppProperties.Messages(30));
        return new JwtService(props);
    }

    @Test
    void validTokenReturnsUsername() {
        JwtService jwt = service(Duration.ofMinutes(15));
        String token = jwt.createAccessToken(new User("nurasyl", "hash"));
        assertThat(jwt.parseUsername(token)).contains("nurasyl");
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = service(Duration.ofSeconds(-1));
        String token = jwt.createAccessToken(new User("nurasyl", "hash"));
        assertThat(jwt.parseUsername(token)).isEmpty();
    }

    @Test
    void garbageIsRejected() {
        assertThat(service(Duration.ofMinutes(15)).parseUsername("not-a-jwt")).isEmpty();
    }
}
