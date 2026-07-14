package com.salesdata.controller;

import com.salesdata.entity.Customer;
import com.salesdata.entity.SalesRecord;
import com.salesdata.repository.CustomerRepository;
import com.salesdata.repository.SalesRecordRepository;
import com.salesdata.repository.SettingRepository;
import com.salesdata.entity.Setting;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.salesdata.dto.SalesmanReportDTO;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.util.Optional;

@RestController
@RequestMapping("/api/dashboard")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'DATA_ENTRY_MANAGER', 'ACCOUNT_MANAGER')")
public class DashboardController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SettingRepository settingRepository;

    private int getReminderIntervalDays() {
        Optional<Setting> opt = settingRepository.findById("reminderIntervalDays");
        if (opt.isPresent()) {
            try {
                return Integer.parseInt(opt.get().getValue());
            } catch (NumberFormatException e) {
                return 30; // Default to 30 days
            }
        }
        return 30;
    }

    private List<CustomerReminderDTO> calculateReminders(String type, List<SalesRecord> allRecords) {
        LocalDate today = LocalDate.now();
        int intervalDays = getReminderIntervalDays();

        Map<Customer, List<SalesRecord>> customerRecords = allRecords.stream()
                .filter(r -> r.getCustomer() != null)
                .collect(Collectors.groupingBy(SalesRecord::getCustomer));

        List<CustomerReminderDTO> reminders = new ArrayList<>();

        for (Map.Entry<Customer, List<SalesRecord>> entry : customerRecords.entrySet()) {
            Customer c = entry.getKey();
            List<SalesRecord> records = entry.getValue();

            BigDecimal totalCredit = records.stream()
                    .filter(r -> "CREDIT".equalsIgnoreCase(r.getBillType()) || "CREDIT_BILL".equalsIgnoreCase(r.getBillType()))
                    .map(r -> r.getCreditAmount() != null ? r.getCreditAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalDebit = records.stream()
                    .filter(r -> "DEBIT".equalsIgnoreCase(r.getBillType()) || "PAYMENT_RECEIVED".equalsIgnoreCase(r.getBillType()))
                    .map(r -> r.getNetAmount() != null ? r.getNetAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            BigDecimal pending = totalCredit.subtract(totalDebit);

            if (pending.compareTo(BigDecimal.ZERO) > 0) {
                LocalDate remDate = c.getNextReminderDate();
                if (remDate == null) {
                    LocalDate oldestCredit = records.stream()
                            .filter(r -> "CREDIT".equalsIgnoreCase(r.getBillType()) || "CREDIT_BILL".equalsIgnoreCase(r.getBillType()))
                            .filter(r -> r.getEntryDate() != null)
                            .map(SalesRecord::getEntryDate)
                            .min(LocalDate::compareTo)
                            .orElse(null);
                    if (oldestCredit != null) {
                        remDate = oldestCredit.plusDays(intervalDays);
                    }
                }

                if (remDate != null) {
                    boolean add = false;
                    if ("overdue".equalsIgnoreCase(type)) {
                        add = remDate.isBefore(today);
                    } else if ("today".equalsIgnoreCase(type)) {
                        add = remDate.isEqual(today);
                    } else if ("upcoming".equalsIgnoreCase(type)) {
                        add = remDate.isAfter(today) && (remDate.isBefore(today.plusDays(7)) || remDate.isEqual(today.plusDays(7)));
                    }

                    if (add) {
                        reminders.add(new CustomerReminderDTO(
                                c.getId(),
                                c.getCustomerName(),
                                c.getContactNumber(),
                                c.getCity(),
                                remDate
                        ));
                    }
                }
            }
        }
        return reminders.stream()
                .sorted((a, b) -> a.getReminderDate().compareTo(b.getReminderDate()))
                .collect(Collectors.toList());
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats() {
        List<SalesRecord> allRecords = salesRecordRepository.findByIsDeletedFalse();
        Map<String, Object> stats = new HashMap<>();

        long todayEntries = allRecords.stream()
                .filter(r -> LocalDate.now().equals(r.getEntryDate()))
                .count();
        stats.put("todayEntries", todayEntries);
        stats.put("overdueReminders", calculateReminders("overdue", allRecords).size());
        stats.put("todayReminders", calculateReminders("today", allRecords).size());
        stats.put("upcomingReminders", calculateReminders("upcoming", allRecords).size());
        stats.put("reminderIntervalDays", getReminderIntervalDays());
        

        // Today's Entries & Sales
        LocalDate today = LocalDate.now();
        List<SalesRecord> todayRecords = allRecords.stream()
                .filter(r -> r.getEntryDate() != null && r.getEntryDate().isEqual(today))
                .collect(Collectors.toList());
        stats.put("todayEntries", todayRecords.size());
        stats.put("todaySales", todayRecords.stream().map(r -> r.getNetAmount() != null ? r.getNetAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Weekly Sales
        List<SalesRecord> weeklyRecords = allRecords.stream()
                .filter(r -> r.getEntryDate() != null && (r.getEntryDate().isAfter(today.minusDays(7)) || r.getEntryDate().isEqual(today.minusDays(7))))
                .collect(Collectors.toList());
        stats.put("weeklySales", weeklyRecords.stream().map(r -> r.getNetAmount() != null ? r.getNetAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Monthly Sales
        List<SalesRecord> monthlyRecords = allRecords.stream()
                .filter(r -> r.getEntryDate() != null && r.getEntryDate().getMonth() == today.getMonth() && r.getEntryDate().getYear() == today.getYear())
                .collect(Collectors.toList());
        stats.put("monthlySales", monthlyRecords.stream().map(r -> r.getNetAmount() != null ? r.getNetAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Totals
        stats.put("totalCustomers", allRecords.stream().map(SalesRecord::getCustomerName).distinct().count());
        stats.put("totalQuantity", allRecords.stream().mapToInt(r -> r.getQuantity() != null ? r.getQuantity() : 0).sum());
        stats.put("totalDiscount", allRecords.stream().map(r -> r.getDiscount() != null ? r.getDiscount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add));

        // Top Salesman Today
        Map<String, Integer> salesmanSales = todayRecords.stream()
                .filter(r -> r.getSalesman() != null)
                .collect(Collectors.groupingBy(r -> r.getSalesman().getName(), Collectors.summingInt(r -> r.getQuantity() != null ? r.getQuantity() : 0)));
        
        String topSalesman = salesmanSales.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
        stats.put("topSalesman", topSalesman);

        // Recent Entries
        List<SalesRecord> recent = allRecords.stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .limit(5)
                .collect(Collectors.toList());
        stats.put("recentEntries", recent);

        return stats;
    }

    @GetMapping("/reminders")
    public List<CustomerReminderDTO> getReminders(@RequestParam String type) {
        List<SalesRecord> allRecords = salesRecordRepository.findByIsDeletedFalse();
        return calculateReminders(type, allRecords);
    }

    @PostMapping("/reminders/done/{customerId}")
    public void markReminderDone(@PathVariable Long customerId) {
        Optional<Customer> opt = customerRepository.findById(customerId);
        if (opt.isPresent()) {
            Customer c = opt.get();
            int interval = getReminderIntervalDays();
            c.setNextReminderDate(LocalDate.now().plusDays(interval));
            customerRepository.save(c);
        }
    }

    @GetMapping("/salesman-report")
    public List<SalesmanReportDTO> getSalesmanReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        List<SalesRecord> allRecords = salesRecordRepository.findByIsDeletedFalse();
        LocalDate today = LocalDate.now();
        LocalDate start = (startDate != null && !startDate.isEmpty()) ? LocalDate.parse(startDate) : null;
        LocalDate end = (endDate != null && !endDate.isEmpty()) ? LocalDate.parse(endDate) : null;

        Map<String, SalesmanReportDTO> reportMap = new HashMap<>();

        for (SalesRecord r : allRecords) {
            if (r.getSalesman() == null) continue;
            String sName = r.getSalesman().getName();
            SalesmanReportDTO dto = reportMap.computeIfAbsent(sName, k -> new SalesmanReportDTO(sName));

            LocalDate entryDate = r.getEntryDate();
            if (entryDate == null) continue;

            int qty = r.getQuantity() != null ? r.getQuantity() : 0;
            BigDecimal amt = r.getNetAmount() != null ? r.getNetAmount() : BigDecimal.ZERO;

            if (entryDate.isEqual(today)) {
                dto.setTodayQty(dto.getTodayQty() + qty);
                dto.setTodayAmt(dto.getTodayAmt().add(amt));
            }
            if (entryDate.isAfter(today.minusDays(7)) || entryDate.isEqual(today.minusDays(7))) {
                dto.setWeeklyQty(dto.getWeeklyQty() + qty);
                dto.setWeeklyAmt(dto.getWeeklyAmt().add(amt));
            }
            if (entryDate.getMonth() == today.getMonth() && entryDate.getYear() == today.getYear()) {
                dto.setMonthlyQty(dto.getMonthlyQty() + qty);
                dto.setMonthlyAmt(dto.getMonthlyAmt().add(amt));
            }
            if (start != null && end != null) {
                if ((entryDate.isEqual(start) || entryDate.isAfter(start)) && 
                    (entryDate.isEqual(end) || entryDate.isBefore(end))) {
                    dto.setCustomQty(dto.getCustomQty() + qty);
                    dto.setCustomAmt(dto.getCustomAmt().add(amt));
                }
            }
        }

        return new ArrayList<>(reportMap.values());
    }
}
