package com.chatexpo.ws;

import com.chatexpo.auth.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Optional;

/** The app connects to ws://host/ws?token=<jwt>. Browsers and React Native cannot set headers on a WebSocket,
 *  so the access token travels in the query string and is checked before the connection is accepted. */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String USERNAME = "username";
    private final JwtService jwt;

    public JwtHandshakeInterceptor(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler handler, Map<String, Object> attributes) {
        String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
        Optional<String> username = token == null ? Optional.empty() : jwt.parseUsername(token);
        if (username.isEmpty()) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        attributes.put(USERNAME, username.get());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler handler, Exception exception) {}
}
