package com.codesync.backend.socket;

import com.corundumstudio.socketio.AckRequest;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.listener.ConnectListener;
import com.corundumstudio.socketio.listener.DataListener;
import com.corundumstudio.socketio.listener.DisconnectListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SocketHandler {

    @Autowired
    private SocketIOServer server;

    private final Map<String, RoomState> roomStates = new ConcurrentHashMap<>();

    private static class RoomState {
        Map<String, UserInfo> users = new ConcurrentHashMap<>();
        String hostId = null;
        Set<String> voiceUsers = ConcurrentHashMap.newKeySet();
        Object docState = null;
    }

    private static class UserInfo {
        String id, name, color, socketId;
        boolean muted = false, speaking = false;

        UserInfo(String id, String name, String color, String socketId) {
            this.id = id; this.name = name; this.color = color; this.socketId = socketId;
        }
    }

    private RoomState getRoomState(String roomCode) {
        return roomStates.computeIfAbsent(roomCode, k -> new RoomState());
    }

    public void registerEvents() {
        server.addConnectListener(client -> System.out.println("Socket connected: " + client.getSessionId()));

        server.addEventListener("join-room", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");

            // YAHAN CHANGE HUA HAI: userId ko String.valueOf se read kar rahe hain
            String userId = String.valueOf(data.get("userId"));

            String userName = (String) data.get("userName");
            String userColor = (String) data.get("userColor");

            client.joinRoom(roomCode);
            RoomState state = getRoomState(roomCode);

            UserInfo user = new UserInfo(userId, userName, userColor, client.getSessionId().toString());
            state.users.put(client.getSessionId().toString(), user);

            if (state.hostId == null) {
                state.hostId = userId;
            }

            broadcastRoomUsers(roomCode, state);
            server.getRoomOperations(roomCode).sendEvent("user-joined", Map.of("name", userName));

            if (state.docState != null) {
                client.sendEvent("doc-state", state.docState);
            }
        });

        server.addEventListener("doc-update", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            RoomState state = getRoomState(roomCode);
            state.docState = data.get("update");
            server.getRoomOperations(roomCode).sendEvent("doc-update", state.docState);
        });

        server.addEventListener("cursor-update", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("cursor-update", data);
        });

        server.addEventListener("file-change", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("file-change", data);
        });

        server.addEventListener("file-created", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("file-created", data.get("file"));
        });

        server.addEventListener("file-deleted", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("file-deleted", data.get("fileName"));
        });

        server.addEventListener("active-file-change", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("active-file-change", data.get("fileName"));
        });

        server.addEventListener("chat-message", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("chat-message", data);
        });

        server.addEventListener("typing", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            server.getRoomOperations(roomCode).sendEvent("typing", data);
        });

        // Voice
        server.addEventListener("voice-join", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String userName = (String) data.get("userName");
            RoomState state = getRoomState(roomCode);
            state.voiceUsers.add(client.getSessionId().toString());
            server.getRoomOperations(roomCode).sendEvent("voice-users", new ArrayList<>(state.voiceUsers));
            server.getRoomOperations(roomCode).sendEvent("voice-notification", Map.of("type", "join", "userName", userName));
        });

        server.addEventListener("voice-leave", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String userName = (String) data.get("userName");
            RoomState state = getRoomState(roomCode);
            state.voiceUsers.remove(client.getSessionId().toString());
            server.getRoomOperations(roomCode).sendEvent("voice-users", new ArrayList<>(state.voiceUsers));
            server.getRoomOperations(roomCode).sendEvent("voice-notification", Map.of("type", "leave", "userName", userName));
        });

        server.addEventListener("voice-signal", Map.class, (client, data, ack) -> {
            String to = (String) data.get("to");
            server.getClient(UUID.fromString(to)).sendEvent("voice-signal", data);
        });

        server.addEventListener("voice-mute-toggle", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String socketId = (String) data.get("socketId");

            // Yahan bhi safe cast kiya gaya hai
            boolean muted = Boolean.parseBoolean(String.valueOf(data.get("muted")));

            RoomState state = getRoomState(roomCode);
            if (state.users.containsKey(socketId)) {
                state.users.get(socketId).muted = muted;
            }
            broadcastRoomUsers(roomCode, state);
        });

        server.addEventListener("host-mute-user", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String targetSocketId = (String) data.get("targetSocketId");

            // Yahan bhi safe cast
            boolean muted = Boolean.parseBoolean(String.valueOf(data.get("muted")));

            RoomState state = getRoomState(roomCode);
            if (state.users.containsKey(targetSocketId)) {
                state.users.get(targetSocketId).muted = muted;
            }
            server.getClient(UUID.fromString(targetSocketId)).sendEvent("force-mute", muted);
            broadcastRoomUsers(roomCode, state);
        });

        server.addEventListener("host-kick-user", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String targetSocketId = (String) data.get("targetSocketId");
            RoomState state = getRoomState(roomCode);
            state.users.remove(targetSocketId);
            server.getClient(UUID.fromString(targetSocketId)).sendEvent("kicked", new Object());
            broadcastRoomUsers(roomCode, state);
        });

        server.addEventListener("speaking", Map.class, (client, data, ack) -> {
            String roomCode = (String) data.get("roomCode");
            String socketId = (String) data.get("socketId");

            // Yahan bhi safe cast
            boolean speaking = Boolean.parseBoolean(String.valueOf(data.get("speaking")));

            RoomState state = getRoomState(roomCode);
            if (state.users.containsKey(socketId)) {
                state.users.get(socketId).speaking = speaking;
            }
            broadcastRoomUsers(roomCode, state);
        });

        server.addDisconnectListener(client -> {
            roomStates.forEach((roomCode, state) -> {
                if (state.users.containsKey(client.getSessionId().toString())) {
                    UserInfo user = state.users.remove(client.getSessionId().toString());
                    state.voiceUsers.remove(client.getSessionId().toString());
                    broadcastRoomUsers(roomCode, state);
                    server.getRoomOperations(roomCode).sendEvent("voice-users", new ArrayList<>(state.voiceUsers));
                    server.getRoomOperations(roomCode).sendEvent("user-left", Map.of("name", user.name));
                }
            });
        });
    }

    private void broadcastRoomUsers(String roomCode, RoomState state) {
        List<Map<String, Object>> usersList = new ArrayList<>();
        for (UserInfo u : state.users.values()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.id);
            map.put("name", u.name);
            map.put("color", u.color);
            map.put("socketId", u.socketId);
            map.put("muted", u.muted);
            map.put("speaking", u.speaking);
            usersList.add(map);
        }
        server.getRoomOperations(roomCode).sendEvent("room-users", usersList);
    }
}