package com.codesync.backend.repository;

import com.codesync.backend.model.Room;
import com.codesync.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByCode(String code);
    List<Room> findByMembersContainingOrderByLastActivityDesc(User user);
}
