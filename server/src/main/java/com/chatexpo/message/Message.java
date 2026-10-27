package com.chatexpo.message;

import com.chatexpo.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "messages",
        uniqueConstraints = @UniqueConstraint(columnNames = {"author_id", "client_id"}))
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id generated on the phone. Lets the app retry a send safely: the same clientId is never saved twice. */
    @Column(name = "client_id", nullable = false, length = 64)
    private String clientId;

    @Column(length = 2000)
    private String text;

    private String imageUrl;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Message() {}

    public Message(String clientId, String text, String imageUrl, User author) {
        this.clientId = clientId;
        this.text = text;
        this.imageUrl = imageUrl;
        this.author = author;
    }

    public Long getId() { return id; }
    public String getClientId() { return clientId; }
    public String getText() { return text; }
    public String getImageUrl() { return imageUrl; }
    public User getAuthor() { return author; }
    public Instant getCreatedAt() { return createdAt; }
}
