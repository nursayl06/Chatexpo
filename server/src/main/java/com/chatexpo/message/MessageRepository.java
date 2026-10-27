package com.chatexpo.message;

import com.chatexpo.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findAllByOrderByIdDesc(Pageable pageable);

    List<Message> findByIdLessThanOrderByIdDesc(Long id, Pageable pageable);

    Optional<Message> findByAuthorAndClientId(User author, String clientId);
}
