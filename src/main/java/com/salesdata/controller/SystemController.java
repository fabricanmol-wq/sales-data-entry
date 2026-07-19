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
    private ObjectMapper mapper;

    @GetMapping("/backup")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<Resource> backupDatabase() {
        try {
            Map<String, List<Map<String, Object>>> backupData = new HashMap<>();
            List<String> tableNames = new java.util.ArrayList<>();
            try (Connection conn = dataSource.getConnection()) {
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
            }

            for (String tableName : tableNames) {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM \"" + tableName + "\"");
                backupData.put(tableName, rows);
            }

            byte[] jsonBytes = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(backupData);
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

    @PostMapping("/restore")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'EDIT')")
    public ResponseEntity<?> restoreDatabase(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".json")) {
            return ResponseEntity.badRequest().body("{\"message\": \"Invalid file. Please upload a valid JSON backup.\"}");
        }
        
        try {
            Map<String, List<Map<String, Object>>> backupData = mapper.readValue(
                file.getInputStream(), 
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, List<Map<String, Object>>>>() {}
            );
            
            boolean isPostgres = false;
            try (Connection conn = dataSource.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                String driver = metaData.getDriverName().toLowerCase();
                isPostgres = driver.contains("postgresql");
            }

            // SQLite preserves case in table names, Postgres defaults to lowercase.
            // If restoring from SQLite to Postgres, convert all table names to lowercase.
            if (isPostgres) {
                Map<String, List<Map<String, Object>>> lowerCaseBackupData = new HashMap<>();
                for (Map.Entry<String, List<Map<String, Object>>> entry : backupData.entrySet()) {
                    lowerCaseBackupData.put(entry.getKey().toLowerCase(), entry.getValue());
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
                        
                    // Insert rows
                    for (Map<String, Object> row : rows) {
                        StringBuilder sql = new StringBuilder("INSERT INTO \"").append(tableName).append("\" (");
                        StringBuilder values = new StringBuilder(" VALUES (");
                        Object[] params = new Object[row.size()];
                        int i = 0;
                        for (Map.Entry<String, Object> col : row.entrySet()) {
                            sql.append("\"").append(col.getKey()).append("\"");
                            values.append("?");
                            params[i++] = col.getValue();
                            if (i < row.size()) {
                                sql.append(", ");
                                values.append(", ");
                            }
                        }
                        sql.append(")");
                        values.append(")");
                        jdbcTemplate.update(sql.toString() + values.toString(), params);
                    }
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
            
            return ResponseEntity.ok("{\"message\": \"Database restored successfully from backup.\"}");
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Failed to restore database: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }
}
