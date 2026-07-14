package com.salesdata.service;

import com.salesdata.entity.CallRecord;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class CallRecordSpecification {

    public static Specification<CallRecord> hasCustomerName(String name) {
        return (root, query, cb) -> name == null || name.isEmpty() ? null : cb.like(cb.lower(root.get("customerName")), "%" + name.toLowerCase() + "%");
    }

    public static Specification<CallRecord> hasContactNumber(String number) {
        return (root, query, cb) -> number == null || number.isEmpty() ? null : cb.like(root.get("contactNumber"), "%" + number + "%");
    }

    public static Specification<CallRecord> hasCallStatus(String status) {
        return (root, query, cb) -> status == null || status.isEmpty() ? null : cb.equal(root.get("callStatus"), status);
    }

    public static Specification<CallRecord> hasCallOutcome(String outcome) {
        return (root, query, cb) -> outcome == null || outcome.isEmpty() ? null : cb.equal(root.get("callOutcome"), outcome);
    }

    public static Specification<CallRecord> hasReason(String reason) {
        return (root, query, cb) -> reason == null || reason.isEmpty() ? null : cb.equal(root.get("reason"), reason);
    }

    public static Specification<CallRecord> betweenDates(LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate != null && endDate != null) {
                LocalDateTime startOfDay = startDate.atStartOfDay();
                LocalDateTime endOfDay = endDate.atTime(23, 59, 59, 999999999);
                return cb.between(root.get("callDate"), startOfDay, endOfDay);
            }
            if (startDate != null) {
                return cb.greaterThanOrEqualTo(root.get("callDate"), startDate.atStartOfDay());
            }
            return cb.lessThanOrEqualTo(root.get("callDate"), endDate.atTime(23, 59, 59, 999999999));
        };
    }
}
