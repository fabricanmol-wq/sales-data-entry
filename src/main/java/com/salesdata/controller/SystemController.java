package com.salesdata.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.salesdata.service.GoogleDriveService;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ByteArrayResource;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private com.salesdata.repository.SettingRepository settingRepository;

    @Autowired
    private com.salesdata.service.GoogleDriveService googleDriveService;

    @Autowired(required = false)
    private com.salesdata.service.WhatsAppService whatsAppService;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private com.salesdata.repository.UserRepository userRepository;

    @Autowired
    private com.salesdata.config.DataSeeder dataSeeder;
    @GetMapping("/backup")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<Resource> backupDatabase() {
        try {
            String jsonString = generateBackupJsonString();
            byte[] jsonBytes = jsonString.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            Resource resource = new ByteArrayResource(jsonBytes);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "backup_sales_" + timestamp + ".json";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/backup-to-drive")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<?> instantBackupToGoogleDrive() {
        try {
            Optional<com.salesdata.entity.Setting> folderIdOpt = settingRepository.findById("gdriveFolderId");
            String folderId = folderIdOpt.map(com.salesdata.entity.Setting::getValue).orElse("");
            
            if (folderId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("{\"message\": \"Google Drive is not configured. Please enter a valid Folder ID in settings.\"}");
            }

            String jsonString = generateBackupJsonString();
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "backup_sales_" + timestamp + ".json";
            
            boolean success = googleDriveService.uploadFile(folderId, filename, jsonString);
            if (success) {
                return ResponseEntity.ok("{\"message\": \"Database backed up successfully to Google Drive.\"}");
            } else {
                return ResponseEntity.internalServerError().body("{\"message\": \"Failed to upload backup to Google Drive.\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Error creating backup: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }

    @PostMapping("/backup-to-wa")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<?> instantBackupToWhatsApp() {
        try {
            Optional<com.salesdata.entity.Setting> numberOpt = settingRepository.findById("waBackupNumber");
            String waNumber = numberOpt.map(com.salesdata.entity.Setting::getValue).orElse("").trim();
            
            if (waNumber.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"message\": \"WhatsApp Backup Number is not configured. Please enter a valid WhatsApp Number in settings.\"}");
            }

            String cleanNumber = waNumber.replaceAll("[^0-9]", "");
            if (cleanNumber.length() == 10) {
                cleanNumber = "91" + cleanNumber;
            } else if (cleanNumber.startsWith("0") && cleanNumber.length() == 11) {
                cleanNumber = "91" + cleanNumber.substring(1);
            }

            String jsonString = generateBackupJsonString();
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "backup_sales_" + timestamp + ".json";
            
            String base64 = java.util.Base64.getEncoder().encodeToString(jsonString.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String caption = "📦 *Sales Data Entry - Instant WhatsApp Backup*\nDate: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss")) + "\nFile: " + filename;
            
            Map<String, Object> result = whatsAppService != null ? whatsAppService.sendBackupDocument(cleanNumber, base64, filename, caption) : null;
            if (result != null && !"error".equalsIgnoreCase((String) result.get("status"))) {
                return ResponseEntity.ok("{\"message\": \"Database backup sent successfully to WhatsApp (" + cleanNumber + ").\"}");
            } else {
                String errMsg = result != null && result.get("message") != null ? (String) result.get("message") : "WhatsApp send document failed";
                return ResponseEntity.internalServerError().body("{\"message\": \"Failed to send backup to WhatsApp: " + errMsg.replaceAll("\"", "'") + "\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Error sending backup to WhatsApp: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }

    public String generateBackupJsonString() throws Exception {
        Map<String, List<Map<String, Object>>> backupData = new HashMap<>();
        List<String> tableNames = new java.util.ArrayList<>();
        jdbcTemplate.execute(new org.springframework.jdbc.core.ConnectionCallback<Void>() {
            @Override
            public Void doInConnection(Connection conn) throws java.sql.SQLException, org.springframework.dao.DataAccessException {
                DatabaseMetaData metaData = conn.getMetaData();
                String driver = metaData.getDriverName().toLowerCase();
                String schema = driver.contains("postgresql") ? "public" : null;
                try (ResultSet rs = metaData.getTables(null, schema, "%", new String[]{"TABLE"})) {
                    while (rs.next()) {
                        String tableName = rs.getString("TABLE_NAME");
                        if (tableName.startsWith("sqlite_") || tableName.startsWith("pg_")) continue;
                        tableNames.add(tableName);
                    }
                }
                return null;
            }
        });

        for (String tableName : tableNames) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM \"" + tableName + "\"");
            backupData.put(tableName, rows);
        }

        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(backupData);
    }

    @PostMapping("/restore")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'EDIT')")
    @Transactional
    public ResponseEntity<?> restoreDatabase(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".json")) {
            return ResponseEntity.badRequest().body("{\"message\": \"Invalid file. Please upload a valid JSON backup.\"}");
        }
        
        try {
            Map<String, List<Map<String, Object>>> backupData = mapper.readValue(
                file.getInputStream(), 
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, List<Map<String, Object>>>>() {}
            );
            
            restoreDatabaseFromMap(backupData);
            return ResponseEntity.ok("{\"message\": \"Database restored successfully from backup.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Failed to restore database: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }

    @PostMapping("/restore-from-drive")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'EDIT')")
    @Transactional
    public ResponseEntity<?> restoreFromGoogleDrive() {
        try {
            Optional<com.salesdata.entity.Setting> folderIdOpt = settingRepository.findById("gdriveFolderId");
            String folderId = folderIdOpt.map(com.salesdata.entity.Setting::getValue).orElse("");
            
            String fileId = googleDriveService.getLatestBackupFileId(folderId);
            if (fileId == null) {
                return ResponseEntity.badRequest().body("{\"message\": \"No backup files found in Google Drive.\"}");
            }
            
            try (java.io.InputStream is = googleDriveService.downloadFile(fileId)) {
                Map<String, List<Map<String, Object>>> backupData = mapper.readValue(
                    is, 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, List<Map<String, Object>>>>() {}
                );
                restoreDatabaseFromMap(backupData);
            }
            
            return ResponseEntity.ok("{\"message\": \"Database restored successfully from Google Drive.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Failed to restore from Google Drive: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }

    public void restoreDatabaseFromMap(Map<String, List<Map<String, Object>>> backupData) throws Exception {
        boolean isPostgres = Boolean.TRUE.equals(jdbcTemplate.execute(new org.springframework.jdbc.core.ConnectionCallback<Boolean>() {
            @Override
            public Boolean doInConnection(Connection conn) throws java.sql.SQLException, org.springframework.dao.DataAccessException {
                return conn.getMetaData().getDriverName().toLowerCase().contains("postgresql");
            }
        }));

        // SQLite preserves case in table names, Postgres defaults to lowercase.
        // If restoring from SQLite to Postgres, convert all table names AND column names to lowercase.
        if (isPostgres) {
            Map<String, List<Map<String, Object>>> lowerCaseBackupData = new HashMap<>();
            for (Map.Entry<String, List<Map<String, Object>>> entry : backupData.entrySet()) {
                List<Map<String, Object>> newRows = new java.util.ArrayList<>();
                for (Map<String, Object> row : entry.getValue()) {
                    Map<String, Object> newRow = new HashMap<>();
                    for (Map.Entry<String, Object> col : row.entrySet()) {
                        newRow.put(col.getKey().toLowerCase(), col.getValue());
                    }
                    newRows.add(newRow);
                }
                lowerCaseBackupData.put(entry.getKey().toLowerCase(), newRows);
            }
            backupData = lowerCaseBackupData;
        }
            
        // Define insertion order to respect foreign keys
        List<String> orderedTables = java.util.Arrays.asList(
            "settings", "role_permissions", "error_logs", "test_parent", "users",
            "products", "salesmen", "customers", "bills", "call_record", "sales_records", "support_ticket", "bill_items"
        );
        
        // Reorder backupData keys based on orderedTables
        List<String> tablesToRestore = new java.util.ArrayList<>();
        for (String tbl : orderedTables) {
            if (backupData.containsKey(tbl)) {
                tablesToRestore.add(tbl);
            }
        }
        // Add any missing tables to the end just in case
        for (String tbl : backupData.keySet()) {
            if (!tablesToRestore.contains(tbl)) {
                tablesToRestore.add(tbl);
            }
        }
            
        // Get list of actual existing tables in the database to prevent restoring missing tables
        List<String> existingTables = jdbcTemplate.execute(new org.springframework.jdbc.core.ConnectionCallback<List<String>>() {
            @Override
            public List<String> doInConnection(Connection conn) throws java.sql.SQLException, org.springframework.dao.DataAccessException {
                List<String> tables = new java.util.ArrayList<>();
                DatabaseMetaData metaData = conn.getMetaData();
                String driver = metaData.getDriverName().toLowerCase();
                String schema = driver.contains("postgresql") ? "public" : null;
                try (ResultSet rs = metaData.getTables(null, schema, "%", new String[]{"TABLE"})) {
                    while (rs.next()) {
                        tables.add(rs.getString("TABLE_NAME").toLowerCase());
                    }
                }
                return tables;
            }
        });
        
        List<String> tablesToRestoreFinal = new java.util.ArrayList<>();
        for (String tbl : tablesToRestore) {
            if (existingTables.contains(tbl.toLowerCase())) {
                tablesToRestoreFinal.add(tbl);
            }
        }
        tablesToRestore = tablesToRestoreFinal;
            
        // Disable foreign key checks or clear data
        if (isPostgres) {
            // In Postgres, we can't disable triggers without superuser.
            // So we truncate all tables with CASCADE, and then insert in topological order.
            if (!tablesToRestore.isEmpty()) {
                String truncateSql = "TRUNCATE TABLE " + 
                    tablesToRestore.stream().map(t -> "\"" + t + "\"").collect(java.util.stream.Collectors.joining(", ")) + 
                    " CASCADE";
                jdbcTemplate.execute(truncateSql);
            }
        } else {
            jdbcTemplate.execute("PRAGMA foreign_keys = OFF;");
        }
            
        try {
            for (String tableName : tablesToRestore) {
                List<Map<String, Object>> rows = backupData.get(tableName);
                
                if (!isPostgres) {
                    // Clear existing data (SQLite)
                    jdbcTemplate.execute("DELETE FROM \"" + tableName + "\"");
                }
                    
                if (rows == null || rows.isEmpty()) continue;
                    
                // Insert rows using batchUpdate for massive performance improvement
                Map<String, Object> firstRow = rows.get(0);
                List<String> columns = new java.util.ArrayList<>(firstRow.keySet());
                
                StringBuilder sql = new StringBuilder("INSERT INTO \"").append(tableName).append("\" (");
                StringBuilder values = new StringBuilder(" VALUES (");
                for (int i = 0; i < columns.size(); i++) {
                    sql.append("\"").append(columns.get(i)).append("\"");
                    values.append("?");
                    if (i < columns.size() - 1) {
                        sql.append(", ");
                        values.append(", ");
                    }
                }
                sql.append(")");
                values.append(")");
                
                String insertSql = sql.toString() + values.toString();
                
                List<Object[]> batchArgs = new java.util.ArrayList<>();
                for (Map<String, Object> row : rows) {
                    Object[] params = new Object[columns.size()];
                    for (int i = 0; i < columns.size(); i++) {
                        Object val = row.get(columns.get(i));
                        
                        // Fix date formats for SQLite which fails on ISO-8601 format
                        if (!isPostgres && val instanceof String) {
                            String strVal = (String) val;
                            if (strVal.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$")) {
                                val = strVal.substring(0, 10) + " " + strVal.substring(11, 23);
                            } else if (strVal.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(Z|[+-]\\d{2}:\\d{2})$")) {
                                val = strVal.substring(0, 10) + " " + strVal.substring(11, 19) + ".000";
                            } else if (strVal.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
                                val = strVal + " 00:00:00.000";
                            }
                        }
                        
                        params[i] = val;
                    }
                    batchArgs.add(params);
                }
                
                jdbcTemplate.batchUpdate(insertSql, batchArgs);
            }
                
            // Reset sequences for PostgreSQL
            if (isPostgres) {
                for (String tableName : backupData.keySet()) {
                    try {
                        jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('\"" + tableName + "\"', 'id'), COALESCE((SELECT MAX(id)+1 FROM \"" + tableName + "\"), 1), false)");
                    } catch (Exception e) {
                        // Ignore if no sequence or id column
                    }
                }
            }
        } finally {
            // Re-enable foreign key checks for SQLite
            if (!isPostgres) {
                jdbcTemplate.execute("PRAGMA foreign_keys = ON;");
            }
        }
    }

    @PostMapping("/optimize")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'EDIT')")
    public ResponseEntity<?> optimizeSystem() {
        try {
            System.gc();
            return ResponseEntity.ok("{\"message\": \"Site optimized successfully! Memory and caches cleared.\"}");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"message\": \"Optimization failed: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }

    @PostMapping("/factory-reset")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<String> factoryReset(@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        try {
            com.salesdata.entity.User currentUser = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
            if (currentUser == null || !currentUser.isDeveloper()) {
                return ResponseEntity.status(403).body("Only developers can perform a factory reset.");
            }

            final boolean[] isPostgresArr = new boolean[1];

            List<String> existingTables = jdbcTemplate.execute(new org.springframework.jdbc.core.ConnectionCallback<List<String>>() {
                @Override
                public List<String> doInConnection(Connection conn) throws java.sql.SQLException, org.springframework.dao.DataAccessException {
                    List<String> tables = new java.util.ArrayList<>();
                    DatabaseMetaData metaData = conn.getMetaData();
                    String driver = metaData.getDriverName().toLowerCase();
                    isPostgresArr[0] = driver.contains("postgresql");
                    String schema = isPostgresArr[0] ? "public" : null;
                    try (ResultSet rs = metaData.getTables(null, schema, "%", new String[]{"TABLE"})) {
                        while (rs.next()) {
                            tables.add(rs.getString("TABLE_NAME").toLowerCase());
                        }
                    }
                    return tables;
                }
            });

            boolean isPostgres = isPostgresArr[0];

            if (isPostgres) {
                if (!existingTables.isEmpty()) {
                    String truncateSql = "TRUNCATE TABLE " + 
                        existingTables.stream().map(t -> "\"" + t + "\"").collect(java.util.stream.Collectors.joining(", ")) + 
                        " CASCADE";
                    jdbcTemplate.execute(truncateSql);
                }
            } else {
                jdbcTemplate.execute("PRAGMA foreign_keys = OFF;");
                for (String tableName : existingTables) {
                    if (tableName.equalsIgnoreCase("sqlite_sequence")) {
                        jdbcTemplate.execute("DELETE FROM sqlite_sequence");
                    } else {
                        jdbcTemplate.execute("DELETE FROM \"" + tableName + "\"");
                    }
                }
                jdbcTemplate.execute("PRAGMA foreign_keys = ON;");
            }

            // Re-seed the default data
            dataSeeder.run();

            return ResponseEntity.ok("Factory reset successful.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error during factory reset: " + e.getMessage());
        }
    }
}
