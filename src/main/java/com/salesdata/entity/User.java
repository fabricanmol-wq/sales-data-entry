package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(255)")
    private Role role;

    @Column(name = "is_developer", nullable = false, columnDefinition = "boolean")
    private boolean isDeveloper;

    public boolean isDeveloper() {
        return isDeveloper;
    }

    public void setDeveloper(boolean isDeveloper) {
        this.isDeveloper = isDeveloper;
    }
}
