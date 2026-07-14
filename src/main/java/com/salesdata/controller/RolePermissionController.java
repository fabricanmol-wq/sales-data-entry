package com.salesdata.controller;

import com.salesdata.entity.Role;
import com.salesdata.entity.RolePermission;
import com.salesdata.entity.User;
import com.salesdata.repository.RolePermissionRepository;
import com.salesdata.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/permissions")
public class RolePermissionController {

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RolePermission>> getAllPermissions() {
        return ResponseEntity.ok(rolePermissionRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> savePermissions(@RequestBody List<RolePermission> permissions) {
        for (RolePermission p : permissions) {
            Optional<RolePermission> existingOpt = rolePermissionRepository.findByRoleAndModuleName(p.getRole(), p.getModuleName());
            if (existingOpt.isPresent()) {
                RolePermission existing = existingOpt.get();
                existing.setCanView(p.isCanView());
                existing.setCanCreate(p.isCanCreate());
                existing.setCanEdit(p.isCanEdit());
                existing.setCanDelete(p.isCanDelete());
                existing.setCanExport(p.isCanExport());
                existing.setCanPrint(p.isCanPrint());
                existing.setCanRestore(p.isCanRestore());
                existing.setCanApprove(p.isCanApprove());
                existing.setCanManageSettings(p.isCanManageSettings());
                existing.setCanViewAnalytics(p.isCanViewAnalytics());
                existing.setCanBackup(p.isCanBackup());
                existing.setCanViewFund(p.isCanViewFund());
                rolePermissionRepository.save(existing);
            } else {
                rolePermissionRepository.save(p);
            }
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<List<RolePermission>> getMyPermissions(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        Optional<User> optUser = userRepository.findByUsername(auth.getName());
        if (optUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Role role = optUser.get().getRole();
        // If ADMIN, the frontend doesn't necessarily need the full matrix if it assumes ADMIN can do everything, 
        // but it's cleaner to just return the matrix for the admin as well.
        return ResponseEntity.ok(rolePermissionRepository.findByRole(role));
    }
}
