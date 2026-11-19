package com.codesync.backend.service;

import com.codesync.backend.model.CodeFile;
import com.codesync.backend.model.Room;
import com.codesync.backend.model.User;
import com.codesync.backend.repository.RoomRepository;
import com.codesync.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Random;

@Service
public class RoomService {
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private UserRepository userRepository;

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public Room createRoom(User user, String name, String language) {
        String code;
        do {
            StringBuilder sb = new StringBuilder();
            Random rnd = new Random();
            for (int i = 0; i < 6; i++) sb.append(CHARS.charAt(rnd.nextInt(CHARS.length())));
            code = sb.toString();
        } while (roomRepository.findByCode(code).isPresent());

        CodeFile defaultFile = new CodeFile();
        defaultFile.setName(getFileName(language));
        defaultFile.setLanguage(language);
        defaultFile.setContent(getStarterCode(language));

        Room room = new Room();
        room.setCode(code);
        room.setName(name != null && !name.isEmpty() ? name : "Untitled Room");
        room.setHost(user);
        room.setMembers(new ArrayList<>(List.of(user)));
        room.setFiles(new ArrayList<>(List.of(defaultFile)));
        room.setActiveFile(defaultFile.getName());

        return roomRepository.save(room);
    }

    public Room getRoom(String code) {
        return roomRepository.findByCode(code.toUpperCase()).orElseThrow(() -> new RuntimeException("Room not found"));
    }

    public Room joinRoom(User user, String code) {
        Room room = getRoom(code);
        if (room.getIsActive() == null || !room.getIsActive()) throw new RuntimeException("Room is closed");

        boolean isAlreadyMember = room.getMembers() != null && room.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));

        if (!isAlreadyMember) {
            if (room.getMembers() == null) {
                room.setMembers(new ArrayList<>());
            }
            room.getMembers().add(user);
            room.setLastActivity(new Date());
            roomRepository.save(room);
        }
        return room;
    }

    public List<Room> getMyRooms(User user) {
        return roomRepository.findByMembersContainingOrderByLastActivityDesc(user);
    }

    public Room updateRoom(String code, List<CodeFile> files, String activeFile) {
        Room room = getRoom(code);
        if (files != null) room.setFiles(files);
        if (activeFile != null) room.setActiveFile(activeFile);
        room.setLastActivity(new Date());
        return roomRepository.save(room);
    }

    // NAYA METHOD: Naya file add karne ke liye
    public Room addFile(String code, String fileName, String language) {
        Room room = getRoom(code);
        if (room.getFiles() == null) {
            room.setFiles(new ArrayList<>());
        }

        CodeFile newFile = new CodeFile();
        newFile.setName(fileName);
        newFile.setLanguage(language);
        newFile.setContent(getStarterCode(language)); // Hello World default code

        room.getFiles().add(newFile);
        room.setActiveFile(fileName);
        room.setLastActivity(new Date());

        return roomRepository.save(room);
    }

    private String getFileName(String lang) {
        switch (lang) {
            case "python": return "main.py";
            case "java": return "Main.java";
            case "cpp": return "main.cpp";
            case "c": return "main.c";
            case "typescript": return "main.ts";
            default: return "main.js";
        }
    }

    private String getStarterCode(String lang) {
        switch (lang) {
            case "javascript":
            case "typescript":
                return "// Welcome to CodeSync!\n// Start coding together in real-time\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\"CodeSync\"));";
            case "python":
                return "# Welcome to CodeSync!\n# Start coding together in real-time\n\ndef greet(name):\n    return f\"Hello, {name}!\"\n\nprint(greet(\"CodeSync\"))";
            case "java":
                return "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, CodeSync!\");\n  }\n}";
            case "cpp":
                return "#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << \"Hello, CodeSync!\" << endl;\n  return 0;\n}";
            case "c":
                return "#include <stdio.h>\n\nint main() {\n  printf(\"Hello, CodeSync!\\n\");\n  return 0;\n}";
            default:
                return "";
        }
    }
}