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
            try (Connection conn = dataSource.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                String driver = metaData.getDriverName().toLowerCase();
                String schema = driver.contains("postgresql") ? "public" : null;
                try (ResultSet rs = metaData.getTables(null, schema, "%", new String[]{"TABLE"})) {
                    while (rs.next()) {
                        String tableName = rs.getString("TABLE_NAME");
                        if (tableName.startsWith("sqlite_") || tableName.startsWith("pg_")) continue;
                        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + tableName);
                        backupData.put(tableName, rows);
                    }
                }
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
            
            try (Connection conn = dataSource.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                String driver = metaData.getDriverName().toLowerCase();
                boolean isPostgres = driver.contains("postgresql");
                
                // Disable foreign key checks
                if (isPostgres) {
                    for (String tableName : backupData.keySet()) {
                        jdbcTemplate.execute("ALTER TABLE " + tableName + " DISABLE TRIGGER ALL;");
                    }
                } else {
                    jdbcTemplate.execute("PRAGMA foreign_keys = OFF;");
                }
                
                try {
                    for (Map.Entry<String, List<Map<String, Object>>> entry : backupData.entrySet()) {
                        String tableName = entry.getKey();
                        List<Map<String, Object>> rows = entry.getValue();
                        
                        // Clear existing data
                        jdbcTemplate.execute("DELETE FROM " + tableName);
                        
                        if (rows.isEmpty()) continue;
                        
                        // Insert rows
                        for (Map<String, Object> row : rows) {
                            StringBuilder sql = new StringBuilder("INSERT INTO ").append(tableName).append(" (");
                            StringBuilder values = new StringBuilder(" VALUES (");
                            Object[] params = new Object[row.size()];
                            int i = 0;
                            for (Map.Entry<String, Object> col : row.entrySet()) {
                                sql.append(col.getKey());
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
                                jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('" + tableName + "', 'id'), COALESCE((SELECT MAX(id)+1 FROM " + tableName + "), 1), false)");
                            } catch (Exception e) {
                                // Ignore if no sequence or id column
                            }
                        }
                    }
                } finally {
                    // Re-enable foreign key checks
                    if (isPostgres) {
                        for (String tableName : backupData.keySet()) {
                            jdbcTemplate.execute("ALTER TABLE " + tableName + " ENABLE TRIGGER ALL;");
                        }
                    } else {
                        jdbcTemplate.execute("PRAGMA foreign_keys = ON;");
                    }
                }
            }
            
            return ResponseEntity.ok("{\"message\": \"Database restored successfully from backup.\"}");
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"message\": \"Failed to restore database: " + e.getMessage().replaceAll("\"", "'") + "\"}");
        }
    }
}
