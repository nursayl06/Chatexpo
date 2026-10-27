package com.chatexpo.message;

import com.chatexpo.message.MessageDtos.MessageDto;
import com.chatexpo.message.MessageDtos.MessagesPage;
import com.chatexpo.message.MessageDtos.SendMessageRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService service;

    public MessageController(MessageService service) {
        this.service = service;
    }

    @GetMapping
    public MessagesPage list(@RequestParam(required = false) Long before,
                             @RequestParam(required = false) Integer limit) {
        return service.page(before, limit);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(Authentication auth, @Valid @RequestBody SendMessageRequest request) {
        return service.send(auth.getName(), request.clientId(), request.text(), request.imageUrl());
    }
}
