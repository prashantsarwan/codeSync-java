package com.codesync.backend.controller;

import com.codesync.backend.model.Room;
import com.codesync.backend.model.User;
import com.codesync.backend.model.CodeFile;
import com.codesync.backend.repository.UserRepository;
import com.codesync.backend.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    @Autowired
    private RoomService roomService;
    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> body) {
        try {
            User user = getCurrentUser();
            Room room = roomService.createRoom(user, body.get("name"), body.get("language"));
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyRooms() {
        try {
            User user = getCurrentUser();
            List<Room> rooms = roomService.getMyRooms(user);
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> getRoom(@PathVariable String code) {
        try {
            return ResponseEntity.ok(roomService.getRoom(code));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String code) {
        try {
            User user = getCurrentUser();
            Room room = roomService.joinRoom(user, code);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{code}")
    public ResponseEntity<?> updateRoom(@PathVariable String code, @RequestBody Map<String, Object> body) {
        try {
            List<CodeFile> files = new ArrayList<>();
            if (body.get("files") instanceof List<?> rawFiles) {
                for (Object obj : rawFiles) {
                    if (obj instanceof Map<?, ?> fileMap) {
                        CodeFile f = new CodeFile();
                        f.setName((String) fileMap.get("name"));
                        f.setLanguage((String) fileMap.get("language"));
                        f.setContent((String) fileMap.get("content"));
                        files.add(f);
                    }
                }
            }
            String activeFile = (String) body.get("activeFile");
            return ResponseEntity.ok(roomService.updateRoom(code, files, activeFile));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{code}/files")
    public ResponseEntity<?> addFile(@PathVariable String code, @RequestBody Map<String, String> body) {
        try {
            String fileName = body.get("fileName");
            String language = body.get("language");
            return ResponseEntity.ok(roomService.addFile(code, fileName, language));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}