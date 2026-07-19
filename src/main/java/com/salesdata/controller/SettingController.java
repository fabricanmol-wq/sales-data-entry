package com.salesdata.controller;

import com.salesdata.entity.Setting;
import com.salesdata.repository.SettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    @Autowired
    private SettingRepository settingRepository;

    @Autowired(required = false)
    private com.salesdata.service.AutoBackupScheduler autoBackupScheduler;

    @GetMapping
    public ResponseEntity<Map<String, String>> getAllSettings() {
        List<Setting> settings = settingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        
        // Default settings if empty
        map.put("companyName", "Sales Data Entry");
        map.put("gstNumber", "");
        map.put("companyAddress", "");
        map.put("financialYearStart", "4");
        map.put("invoicePrefix", "INV-");
        map.put("currencySymbol", "₹");
        map.put("reminderDays", "60");
        map.put("taxRate", "0");
        map.put("theme", "light");
        map.put("printBankDetails", "");
        map.put("printTermsConditions", "1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.");
        map.put("printSignatory", "Authorized Signatory");
        map.put("printPaperSize", "A4");
        map.put("printShowTax", "YES");
        map.put("reminderIntervalMonths", "1");

        // Override with DB values
        for (Setting s : settings) {
            map.put(s.getKey(), s.getValue());
        }

        return ResponseEntity.ok(map);
    }

    @PostMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<?> saveSettings(@RequestBody Map<String, String> newSettings) {
        for (Map.Entry<String, String> entry : newSettings.entrySet()) {
            Optional<Setting> opt = settingRepository.findById(entry.getKey());
            Setting s = opt.orElse(new Setting());
            s.setKey(entry.getKey());
            s.setValue(entry.getValue());
            settingRepository.save(s);
        }
        
        // Trigger auto backup scheduler reload in case backup settings changed
        if (autoBackupScheduler != null) {
            autoBackupScheduler.scheduleBackupTask();
        }
        
        return ResponseEntity.ok("{\"message\": \"Settings updated successfully\"}");
    }
}
