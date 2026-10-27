package com.chatexpo.common;

import org.springframework.http.HttpStatus;

/** Business error that is returned to the client as {"error": "..."} with the given HTTP status. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
