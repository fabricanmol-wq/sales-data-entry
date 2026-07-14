package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "role_permissions")
@Getter
@Setter
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String moduleName;

    private boolean canView;
    private boolean canCreate;
    private boolean canEdit;
    private boolean canDelete;
    private boolean canExport;
    private boolean canPrint;
    private boolean canRestore;
    private boolean canApprove;
    private boolean canManageSettings;
    private boolean canViewAnalytics;
    private boolean canBackup;
    private boolean canViewFund;
}
