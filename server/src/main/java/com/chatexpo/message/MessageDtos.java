package com.chatexpo.message;

import com.chatexpo.user.UserDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class MessageDtos {
    private MessageDtos() {}

    public record MessageDto(Long id, String clientId, String text, String imageUrl, UserDto author, Instant createdAt) {
        public static MessageDto from(Message m) {
            return new MessageDto(m.getId(), m.getClientId(), m.getText(), m.getImageUrl(),
                    UserDto.from(m.getAuthor()), m.getCreatedAt());
        }
    }

    /** Cursor pagination: nextCursor is the id to pass as ?before= for older messages, null when there are none. */
    public record MessagesPage(List<MessageDto> items, Long nextCursor) {}

    public record SendMessageRequest(
            @NotBlank @Size(max = 64) String clientId,
            @Size(max = 2000) String text,
            @Pattern(regexp = "^/uploads/[A-Za-z0-9._-]+$") String imageUrl) {}

    /** Published after a message is saved; the WebSocket handler pushes it to everyone online. */
    public record MessageCreatedEvent(MessageDto message) {}
}
