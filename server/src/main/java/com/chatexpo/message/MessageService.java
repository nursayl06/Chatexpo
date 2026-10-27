package com.chatexpo.message;

import com.chatexpo.common.ApiException;
import com.chatexpo.config.AppProperties;
import com.chatexpo.message.MessageDtos.MessageCreatedEvent;
import com.chatexpo.message.MessageDtos.MessageDto;
import com.chatexpo.message.MessageDtos.MessagesPage;
import com.chatexpo.user.User;
import com.chatexpo.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messages;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final int defaultPageSize;

    public MessageService(MessageRepository messages, UserRepository users,
                          ApplicationEventPublisher events, AppProperties props) {
        this.messages = messages;
        this.users = users;
        this.events = events;
        this.defaultPageSize = props.messages().pageSize();
    }

    @Transactional(readOnly = true)
    public MessagesPage page(Long before, Integer limit) {
        int size = Math.min(Math.max(limit == null ? defaultPageSize : limit, 1), 100);
        PageRequest pageable = PageRequest.of(0, size);
        List<Message> found = before == null
                ? messages.findAllByOrderByIdDesc(pageable)
                : messages.findByIdLessThanOrderByIdDesc(before, pageable);
        Long nextCursor = found.size() == size ? found.get(found.size() - 1).getId() : null;
        return new MessagesPage(found.stream().map(MessageDto::from).toList(), nextCursor);
    }

    /** Idempotent: sending the same clientId twice returns the already saved message and broadcasts nothing new. */
    @Transactional
    public MessageDto send(String username, String clientId, String text, String imageUrl) {
        String cleanText = text == null ? null : text.strip();
        if ((cleanText == null || cleanText.isEmpty()) && imageUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message must contain text or a photo");
        }
        User author = users.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        return messages.findByAuthorAndClientId(author, clientId)
                .map(MessageDto::from)
                .orElseGet(() -> {
                    Message saved = messages.save(new Message(clientId,
                            cleanText == null || cleanText.isEmpty() ? null : cleanText, imageUrl, author));
                    MessageDto dto = MessageDto.from(saved);
                    events.publishEvent(new MessageCreatedEvent(dto));
                    return dto;
                });
    }
}
