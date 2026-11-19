package com.codesync.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "code_files")
@Data
public class CodeFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String language;

    @Column(columnDefinition = "LONGTEXT")
    private String content;
}
