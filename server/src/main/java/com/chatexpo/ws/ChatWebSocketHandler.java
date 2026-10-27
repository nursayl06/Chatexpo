package com.chatexpo.ws;

import com.chatexpo.message.MessageDtos.MessageCreatedEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Map.Entry;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server -> app events:
 *   {"type":"message.new","message":{...}}   a message was saved (sent through REST)
 *   {"type":"presence","online":["ann","bob"]}  who is online right now
 *   {"type":"pong"}                             reply to {"type":"ping"} heartbeat
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private final ObjectMapper mapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    /** username -> number of open connections (one user can be online from two phones). */
    private final Map<String, Integer> online = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // WebSocketSession is not thread-safe; the decorator queues concurrent sends.
        sessions.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 5_000, 512 * 1024));
        online.merge(username(session), 1, Integer::sum);
        broadcastPresence();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode node = mapper.readTree(message.getPayload());
        if ("ping".equals(node.path("type").asText())) {
            send(sessions.get(session.getId()), Map.of("type", "pong"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        online.computeIfPresent(username(session), (name, count) -> count > 1 ? count - 1 : null);
        broadcastPresence();
    }

    @EventListener
    public void onMessageCreated(MessageCreatedEvent event) {
        broadcast(Map.of("type", "message.new", "message", event.message()));
    }

    private void broadcastPresence() {
        broadcast(Map.of("type", "presence", "online", new TreeSet<>(online.keySet())));
    }

    private void broadcast(Object payload) {
        for (Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            send(entry.getValue(), payload);
        }
    }

    private void send(WebSocketSession session, Object payload) {
        if (session == null || !session.isOpen()) return;
        try {
            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
        } catch (IOException | IllegalStateException e) {
            log.debug("Could not send to session {}: {}", session.getId(), e.getMessage());
        }
    }

    private static String username(WebSocketSession session) {
        return (String) session.getAttributes().get(JwtHandshakeInterceptor.USERNAME);
    }
}
