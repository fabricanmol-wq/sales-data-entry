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

    private ScheduledTaskRegistrar taskRegistrar;
    private ScheduledFuture<?> scheduledFuture;
    private Long nextBackupTime = null;

    public Long getNextBackupTime() {
        return nextBackupTime;
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
        nextBackupTime = null;

        boolean enabled = "true".equalsIgnoreCase(getSetting("autoBackupEnabled", "false"));
        if (!enabled) {
            logger.info("Auto Backup to Google Drive is DISABLED.");
            return;
        }

        int frequencyPerDay;
        try {
            frequencyPerDay = Integer.parseInt(getSetting("autoBackupFrequency", "2"));
        } catch (NumberFormatException e) {
            frequencyPerDay = 2;
        }

        if (frequencyPerDay <= 0) frequencyPerDay = 1;

        long intervalMs = (24 * 60 * 60 * 1000L) / frequencyPerDay;
        logger.info("Auto Backup to Google Drive is ENABLED. Frequency: " + frequencyPerDay + " times/day (Every " + (intervalMs / 3600000) + " hours).");
        
        long startTime = System.currentTimeMillis() + intervalMs;
        nextBackupTime = startTime;

        scheduledFuture = taskRegistrar.getScheduler().scheduleWithFixedDelay(() -> {
            performBackup();
            nextBackupTime = System.currentTimeMillis() + intervalMs;
        }, new Date(startTime), intervalMs); // Start after first interval
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

    private String getSetting(String key, String defaultValue) {
        Optional<Setting> opt = settingRepository.findById(key);
        return opt.map(Setting::getValue).orElse(defaultValue);
    }
}
