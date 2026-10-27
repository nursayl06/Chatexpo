package com.chatexpo.message;

import com.chatexpo.common.ApiException;
import com.chatexpo.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final Path dir;

    public UploadController(AppProperties props) throws IOException {
        this.dir = Path.of(props.uploads().dir()).toAbsolutePath().normalize();
        Files.createDirectories(dir);
    }

    /** Saves a photo and returns its public path, e.g. {"url": "/uploads/3f2a....jpg"}. */
    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String type = file.getContentType();
        String extension = switch (type == null ? "" : type) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG or WebP images");
        };
        String name = UUID.randomUUID() + extension;
        try (var in = file.getInputStream()) {
            Files.copy(in, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        }
        return Map.of("url", "/uploads/" + name);
    }
}
