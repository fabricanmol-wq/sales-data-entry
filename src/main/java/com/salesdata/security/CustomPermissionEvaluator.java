package com.salesdata.security;

import com.salesdata.entity.Role;
import com.salesdata.entity.RolePermission;
import com.salesdata.entity.User;
import com.salesdata.repository.RolePermissionRepository;
import com.salesdata.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("customPermissionEvaluator")
public class CustomPermissionEvaluator {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    public boolean hasAccess(Authentication authentication, String moduleName, String action) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        Optional<User> optUser = userRepository.findByUsername(authentication.getName());
        if (optUser.isEmpty()) return false;
        
        User user = optUser.get();
        Role role = user.getRole();
        
        // Admin always has full access
        if (role == Role.ADMIN) return true;
        
        Optional<RolePermission> optPerm = rolePermissionRepository.findByRoleAndModuleName(role, moduleName);
        if (optPerm.isEmpty()) return false;
        
        RolePermission perm = optPerm.get();
        
        return switch (action.toUpperCase()) {
            case "VIEW" -> perm.isCanView();
            case "CREATE" -> perm.isCanCreate();
            case "EDIT" -> perm.isCanEdit();
            case "DELETE" -> perm.isCanDelete();
            case "EXPORT" -> perm.isCanExport();
            case "PRINT" -> perm.isCanPrint();
            case "RESTORE" -> perm.isCanRestore();
            case "APPROVE" -> perm.isCanApprove();
            case "SETTINGS" -> perm.isCanManageSettings();
            case "ANALYTICS" -> perm.isCanViewAnalytics();
            case "BACKUP" -> perm.isCanBackup();
            default -> false;
        };
    }
}
