package com.salesdata.controller;

import com.salesdata.entity.CallRecord;
import com.salesdata.entity.User;
import com.salesdata.entity.Customer;
import com.salesdata.repository.CallRecordRepository;
import com.salesdata.repository.SalesRecordRepository;
import com.salesdata.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import com.salesdata.service.SalesRecordSpecification;
import com.salesdata.entity.SalesRecord;

@RestController
@RequestMapping("/api/calling")
public class CallingController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private CallRecordRepository callRecordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.salesdata.repository.CustomerRepository customerRepository;

    @GetMapping("/customers")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling List', 'VIEW')")
    public ResponseEntity<List<CallingCustomerDTO>> getCallingCustomers(@RequestParam Map<String, String> filters) {
        String globalSearch = filters.get("globalSearch");
        filters.remove("globalSearch");
        
        boolean showAll = "true".equals(filters.get("allCustomers"));
        filters.remove("allCustomers");
        
        List<Customer> uniqueCustomers = new ArrayList<>();
        
        if (showAll) {
            uniqueCustomers = customerRepository.findByIsDeletedFalse();
        } else {
            // If there are specific sales filters, we must filter through SalesRecords
            boolean hasFilter = false;
            String[] salesFilters = {"startDate", "endDate", "salesmanId", "city", "billType", "minAmount", "maxAmount"};
            for (String k : salesFilters) {
                if (filters.containsKey(k) && filters.get(k) != null && !filters.get(k).trim().isEmpty()) {
                    hasFilter = true;
                    break;
                }
            }
            
            if (hasFilter) {
                List<SalesRecord> records = salesRecordRepository.findAll(SalesRecordSpecification.getFilterSpecification(filters));
                Map<String, Customer> uniqueMap = new HashMap<>();
                for (SalesRecord r : records) {
                    if (r.getCustomer() != null && r.getCustomer().getCustomerName() != null && !r.getCustomer().getCustomerName().trim().isEmpty()) {
                        String key = r.getCustomer().getCustomerName().toLowerCase() + "_" + r.getCustomer().getContactNumber();
                        if (!uniqueMap.containsKey(key)) {
                            uniqueMap.put(key, r.getCustomer());
                        }
                    }
                }
                uniqueCustomers.addAll(uniqueMap.values());
            } else {
                uniqueCustomers = salesRecordRepository.findUniqueCustomersBasic();
            }
        }

        List<CallingCustomerDTO> result = new ArrayList<>();

        for (Customer c : uniqueCustomers) {
            String name = c.getCustomerName();
            String phone = c.getContactNumber();
            if (name == null || name.trim().isEmpty()) continue;
            
            if (globalSearch != null && !globalSearch.isEmpty()) {
                String searchLower = globalSearch.toLowerCase();
                boolean matchesName = name.toLowerCase().contains(searchLower);
                boolean matchesPhone = (phone != null && phone.toLowerCase().contains(searchLower));
                if (!matchesName && !matchesPhone) {
                    continue;
                }
            }

            Optional<CallRecord> latestCallOpt = callRecordRepository.findFirstByCustomerNameAndContactNumberOrderByCallDateDesc(name, phone);
            
            if (latestCallOpt.isPresent()) {
                CallRecord latestCall = latestCallOpt.get();
                
                if (!showAll && "Not Satisfied".equals(latestCall.getCallOutcome()) && 
                   ("Not Interested for Calling".equals(latestCall.getReason()) || "Job Quit".equals(latestCall.getReason()))) {
                    continue; // Skip adding to calling list
                }

                if (!showAll && (latestCall.getCallDate().getMonthValue() != LocalDate.now().getMonthValue() ||
                    latestCall.getCallDate().getYear() != LocalDate.now().getYear())) {
                    result.add(new CallingCustomerDTO(name, phone, null, null, null, null, null, null));
                } else {
                    result.add(new CallingCustomerDTO(
                        name, 
                        phone, 
                        latestCall.getCallDate(), 
                        latestCall.getCallStatus(),
                        latestCall.getCallOutcome(), 
                        latestCall.getNextCallDate(),
                        latestCall.getRemarks(),
                        latestCall.getReason()
                    ));
                }
            } else {
                result.add(new CallingCustomerDTO(name, phone, null, null, null, null, null, null));
            }
        }

        // Sorting logic based on priority:
        // Priority 1: Never called (lastCallDate == null) -> sort val 0
        // Priority 2: Next call date is today or past -> sort val 1
        // Priority 3: Next call date is in future -> sort val 2
        // Priority 4: Recently called (Attended) but no next date -> sort val 3
        result.sort((a, b) -> {
            int priorityA = getPriority(a);
            int priorityB = getPriority(b);
            if (priorityA != priorityB) {
                return Integer.compare(priorityA, priorityB);
            }
            // If same priority, sort by nextCallDate ascending (earliest first), then by lastCallDate ascending
            if (a.getNextCallDate() != null && b.getNextCallDate() != null) {
                return a.getNextCallDate().compareTo(b.getNextCallDate());
            }
            if (a.getLastCallDate() != null && b.getLastCallDate() != null) {
                return a.getLastCallDate().compareTo(b.getLastCallDate());
            }
            return 0;
        });

        return ResponseEntity.ok(result);
    }

    private int getPriority(CallingCustomerDTO c) {
        if (c.getLastCallDate() == null) return 0;
        if (c.getNextCallDate() != null) {
            if (!c.getNextCallDate().isAfter(LocalDate.now())) {
                return 1; // Past or today
            } else {
                return 2; // Future
            }
        }
        return 3; // Attended without follow-up
    }

    @PostMapping("/record")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling List', 'CREATE')")
    public ResponseEntity<?> logCall(@RequestBody CallRecord callRecord, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        
        Optional<CallRecord> existingOpt = callRecordRepository.findFirstByCustomerNameAndContactNumberOrderByCallDateDesc(callRecord.getCustomerName(), callRecord.getContactNumber());
        if (existingOpt.isPresent()) {
            CallRecord existing = existingOpt.get();
            existing.setCallStatus(callRecord.getCallStatus());
            existing.setCallOutcome(callRecord.getCallOutcome());
            existing.setReason(callRecord.getReason());
            existing.setRemarks(callRecord.getRemarks());
            existing.setNextCallDate(callRecord.getNextCallDate());
            existing.setCalledBy(user);
            existing.setCallDate(LocalDateTime.now());
            callRecordRepository.save(existing);
        } else {
            callRecord.setCalledBy(user);
            callRecord.setCallDate(LocalDateTime.now());
            callRecordRepository.save(callRecord);
        }
        
        return ResponseEntity.ok().build();
    }

    @GetMapping("/dashboard-details")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling Dashboard', 'VIEW')")
    public ResponseEntity<List<CallRecord>> getCallingDashboardDetails(
            @RequestParam String cardType,
            @RequestParam(required = false, defaultValue = "today") String filterType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        LocalDate today = LocalDate.now();
        
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        LocalDate startDateFilter = null;
        LocalDate endDateFilter = null;
        
        if ("today".equals(filterType)) {
            startDateTime = today.atStartOfDay();
            endDateTime = today.atTime(23, 59, 59);
            startDateFilter = today;
            endDateFilter = today;
        } else if ("weekly".equals(filterType)) {
            startDateTime = today.minusDays(7).atStartOfDay();
            endDateTime = today.atTime(23, 59, 59);
            startDateFilter = today.minusDays(7);
            endDateFilter = today;
        } else if ("custom".equals(filterType) && startDate != null && endDate != null) {
            startDateFilter = LocalDate.parse(startDate);
            endDateFilter = LocalDate.parse(endDate);
            startDateTime = startDateFilter.atStartOfDay();
            endDateTime = endDateFilter.atTime(23, 59, 59);
        }

        final LocalDateTime finalStart = startDateTime;
        final LocalDateTime finalEnd = endDateTime;
        final LocalDate finalStartDate = startDateFilter;
        final LocalDate finalEndDate = endDateFilter;

        org.springframework.data.jpa.domain.Specification<CallRecord> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            
            if ("Total Calls".equals(cardType)) {
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Pending Follow-ups".equals(cardType)) {
                if (finalStartDate != null) predicates.add(cb.between(root.get("nextCallDate"), finalStartDate, finalEndDate));
                else predicates.add(cb.lessThanOrEqualTo(root.get("nextCallDate"), today));
            } else if ("Satisfied".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Satisfied"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Not Satisfied".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Not Satisfied"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Change Salesmen".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Not Satisfied"));
                predicates.add(cb.equal(root.get("reason"), "Change Salesmen"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Product Issues".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Not Satisfied"));
                predicates.add(cb.equal(root.get("reason"), "Product Issues"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Product Quality".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Not Satisfied"));
                predicates.add(cb.equal(root.get("reason"), "Product Quality"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            } else if ("Product Expensive".equals(cardType)) {
                predicates.add(cb.equal(root.get("callOutcome"), "Not Satisfied"));
                predicates.add(cb.equal(root.get("reason"), "Product Expensive"));
                if (finalStart != null) predicates.add(cb.between(root.get("callDate"), finalStart, finalEnd));
            }
            
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        List<CallRecord> records = callRecordRepository.findAll(spec, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "callDate"));
        return ResponseEntity.ok(records);
    }

    @GetMapping("/stats")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling Dashboard', 'VIEW')")
    public ResponseEntity<java.util.Map<String, Object>> getCallingStats(
            @RequestParam(required = false, defaultValue = "today") String filterType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        LocalDate today = LocalDate.now();
        
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        LocalDate startDateFilter = null;
        LocalDate endDateFilter = null;
        
        if ("today".equals(filterType)) {
            startDateTime = today.atStartOfDay();
            endDateTime = today.atTime(23, 59, 59);
            startDateFilter = today;
            endDateFilter = today;
        } else if ("weekly".equals(filterType)) {
            startDateTime = today.minusDays(7).atStartOfDay();
            endDateTime = today.atTime(23, 59, 59);
            startDateFilter = today.minusDays(7);
            endDateFilter = today;
        } else if ("custom".equals(filterType) && startDate != null && endDate != null) {
            startDateFilter = LocalDate.parse(startDate);
            endDateFilter = LocalDate.parse(endDate);
            startDateTime = startDateFilter.atStartOfDay();
            endDateTime = endDateFilter.atTime(23, 59, 59);
        } // "all_time" leaves them null

        final LocalDateTime finalStart = startDateTime;
        final LocalDateTime finalEnd = endDateTime;
        final LocalDate finalStartDate = startDateFilter;
        final LocalDate finalEndDate = endDateFilter;

        long totalCallsToday = callRecordRepository.count((root, query, cb) -> {
            if (finalStart == null) return cb.isNotNull(root.get("callDate"));
            return cb.between(root.get("callDate"), finalStart, finalEnd);
        });
        
        long pendingFollowupsToday = callRecordRepository.count((root, query, cb) -> {
            if (finalStartDate == null) return cb.lessThanOrEqualTo(root.get("nextCallDate"), today);
            return cb.between(root.get("nextCallDate"), finalStartDate, finalEndDate);
        });
        
        long satisfiedCalls = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.equal(root.get("callOutcome"), "Satisfied");
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });
        
        long notSatisfiedCalls = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.equal(root.get("callOutcome"), "Not Satisfied");
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });
        
        long reasonChangeSalesmen = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.and(cb.equal(root.get("callOutcome"), "Not Satisfied"), cb.equal(root.get("reason"), "Change Salesmen"));
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });
        
        long reasonProductIssues = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.and(cb.equal(root.get("callOutcome"), "Not Satisfied"), cb.equal(root.get("reason"), "Product Issues"));
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });
        
        long reasonProductQuality = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.and(cb.equal(root.get("callOutcome"), "Not Satisfied"), cb.equal(root.get("reason"), "Product Quality"));
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });

        long reasonProductExpensive = callRecordRepository.count((root, query, cb) -> {
            var pred = cb.and(cb.equal(root.get("callOutcome"), "Not Satisfied"), cb.equal(root.get("reason"), "Product Expensive"));
            if (finalStart != null) return cb.and(pred, cb.between(root.get("callDate"), finalStart, finalEnd));
            return pred;
        });

        stats.put("totalCallsToday", totalCallsToday);
        stats.put("pendingFollowupsToday", pendingFollowupsToday);
        stats.put("satisfiedCalls", satisfiedCalls);
        stats.put("notSatisfiedCalls", notSatisfiedCalls);
        stats.put("reasonChangeSalesmen", reasonChangeSalesmen);
        stats.put("reasonProductIssues", reasonProductIssues);
        stats.put("reasonProductQuality", reasonProductQuality);
        stats.put("reasonProductExpensive", reasonProductExpensive);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling Reports', 'VIEW')")
    public ResponseEntity<List<CallRecord>> getCallingReports(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String contactNumber,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String reason) {

        LocalDate start = (startDate != null && !startDate.isEmpty()) ? LocalDate.parse(startDate) : null;
        LocalDate end = (endDate != null && !endDate.isEmpty()) ? LocalDate.parse(endDate) : null;

        org.springframework.data.jpa.domain.Specification<CallRecord> spec = org.springframework.data.jpa.domain.Specification.where(com.salesdata.service.CallRecordSpecification.betweenDates(start, end))
                .and(com.salesdata.service.CallRecordSpecification.hasCustomerName(customerName))
                .and(com.salesdata.service.CallRecordSpecification.hasContactNumber(contactNumber))
                .and(com.salesdata.service.CallRecordSpecification.hasCallStatus(status))
                .and(com.salesdata.service.CallRecordSpecification.hasCallOutcome(outcome))
                .and(com.salesdata.service.CallRecordSpecification.hasReason(reason));

        List<CallRecord> records = callRecordRepository.findAll(spec, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "callDate"));
        return ResponseEntity.ok(records);
    }

    @DeleteMapping("/record/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling List', 'DELETE')")
    public ResponseEntity<?> deleteCallRecord(@PathVariable Long id) {
        return callRecordRepository.findById(id)
                .map(record -> {
                    callRecordRepository.delete(record);
                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }
}
