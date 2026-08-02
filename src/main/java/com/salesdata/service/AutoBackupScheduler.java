package com.salesdata.service;

import com.salesdata.controller.SystemController;
import com.salesdata.entity.Setting;
import com.salesdata.repository.SettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Optional;
import java.util.concurrent.ScheduledFuture;
import java.util.logging.Logger;

@Configuration
@EnableScheduling
@Service
public class AutoBackupScheduler implements SchedulingConfigurer {

    private static final Logger logger = Logger.getLogger(AutoBackupScheduler.class.getName());

    @Autowired
    private SettingRepository settingRepository;

    @Autowired
    private SystemController systemController;

    @Autowired
    private GoogleDriveService googleDriveService;

    @Autowired(required = false)
    private WhatsAppService whatsAppService;

    private ScheduledTaskRegistrar taskRegistrar;
    private ScheduledFuture<?> scheduledFuture;
    private ScheduledFuture<?> scheduledWaFuture;
    private Long nextBackupTime = null;
    private Long nextWaBackupTime = null;

    public Long getNextBackupTime() {
        return nextBackupTime;
    }

    public Long getNextWaBackupTime() {
        return nextWaBackupTime;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        this.taskRegistrar = taskRegistrar;
        scheduleBackupTask();
    }

    public void scheduleBackupTask() {
        if (taskRegistrar == null) return;
        
        if (scheduledFuture != null) {
            scheduledFuture.cancel(false);
        }
        if (scheduledWaFuture != null) {
            scheduledWaFuture.cancel(false);
        }
        nextBackupTime = null;
        nextWaBackupTime = null;

        // 1. Google Drive Auto-Backup
        boolean enabled = "true".equalsIgnoreCase(getSetting("autoBackupEnabled", "false"));
        if (!enabled) {
            logger.info("Auto Backup to Google Drive is DISABLED.");
        } else {
            int frequencyPerDay;
            try {
                frequencyPerDay = Integer.parseInt(getSetting("autoBackupFrequency", "2"));
            } catch (NumberFormatException e) {
                frequencyPerDay = 2;
            }
            if (frequencyPerDay <= 0) frequencyPerDay = 1;
            long intervalMs = (24 * 60 * 60 * 1000L) / frequencyPerDay;
            logger.info("Auto Backup to Google Drive is ENABLED. Frequency: " + frequencyPerDay + " times/day.");
            
            long startTime = System.currentTimeMillis() + intervalMs;
            nextBackupTime = startTime;

            scheduledFuture = taskRegistrar.getScheduler().scheduleWithFixedDelay(() -> {
                performBackup();
                nextBackupTime = System.currentTimeMillis() + intervalMs;
            }, new Date(startTime), intervalMs);
        }

        // 2. WhatsApp Auto-Backup
        boolean waEnabled = "true".equalsIgnoreCase(getSetting("waAutoBackupEnabled", "false"));
        if (!waEnabled) {
            logger.info("Auto Backup to WhatsApp is DISABLED.");
        } else {
            int waFreq;
            try {
                waFreq = Integer.parseInt(getSetting("waAutoBackupFrequency", "2"));
            } catch (NumberFormatException e) {
                waFreq = 2;
            }
            if (waFreq <= 0) waFreq = 1;
            long waIntervalMs = (24 * 60 * 60 * 1000L) / waFreq;
            logger.info("Auto Backup to WhatsApp is ENABLED. Frequency: " + waFreq + " times/day.");
            
            long waStartTime = System.currentTimeMillis() + waIntervalMs;
            nextWaBackupTime = waStartTime;

            scheduledWaFuture = taskRegistrar.getScheduler().scheduleWithFixedDelay(() -> {
                performWaBackup();
                nextWaBackupTime = System.currentTimeMillis() + waIntervalMs;
            }, new Date(waStartTime), waIntervalMs);
        }
    }

    private void performBackup() {
        logger.info("Starting scheduled Auto Backup to Google Drive...");
        try {
            String jsonContent = systemController.generateBackupJsonString();
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "backup_sales_" + timestamp + ".json";
            String folderId = getSetting("gdriveFolderId", "");
            
            boolean success = googleDriveService.uploadFile(folderId, fileName, jsonContent);
            if (success) {
                logger.info("Scheduled backup completed successfully.");
            } else {
                logger.warning("Scheduled backup failed during upload.");
            }
        } catch (Exception e) {
            logger.severe("Scheduled backup failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void performWaBackup() {
        logger.info("Starting scheduled Auto Backup to WhatsApp...");
        try {
            String jsonContent = systemController.generateBackupJsonString();
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "backup_sales_" + timestamp + ".json";
            String waNumber = getSetting("waBackupNumber", "").trim();
            if (waNumber.isEmpty()) {
                logger.warning("Scheduled WA backup failed: WhatsApp Backup Number is not configured.");
                return;
            }
            if (whatsAppService == null) {
                logger.warning("Scheduled WA backup failed: WhatsAppService not available.");
                return;
            }
            String cleanNumber = waNumber.replaceAll("[^0-9]", "");
            if (cleanNumber.length() == 10) {
                cleanNumber = "91" + cleanNumber;
            } else if (cleanNumber.startsWith("0") && cleanNumber.length() == 11) {
                cleanNumber = "91" + cleanNumber.substring(1);
            }
            String base64 = java.util.Base64.getEncoder().encodeToString(jsonContent.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String caption = "📦 *Sales Data Entry - Auto Backup*\nDate: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss")) + "\nFile: " + fileName;
            java.util.Map<String, Object> result = whatsAppService.sendBackupDocument(cleanNumber, base64, fileName, caption);
            logger.info("Scheduled WA backup completed. Result: " + result);
        } catch (Exception e) {
            logger.severe("Scheduled WA backup failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String getSetting(String key, String defaultValue) {
        Optional<Setting> opt = settingRepository.findById(key);
        return opt.map(Setting::getValue).orElse(defaultValue);
    }
}
