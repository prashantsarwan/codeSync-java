package com.codesync.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SocketModule {
    @Autowired
    private SocketIOServer server;
    @Autowired
    private SocketHandler handler;

    @PostConstruct
    public void start() {
        server.start();
        handler.registerEvents();
    }

    @PreDestroy
    public void stop() {
        server.stop();
    }
}
