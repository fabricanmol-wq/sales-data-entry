package com.salesdata.service;

import com.salesdata.entity.SalesRecord;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class SalesRecordSpecification {

    public static Specification<SalesRecord> betweenDates(LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null) return null;
            if (startDate != null && endDate != null) {
                return cb.between(root.get("entryDate"), startDate, endDate);
            } else if (startDate != null) {
                return cb.greaterThanOrEqualTo(root.get("entryDate"), startDate);
            } else {
                return cb.lessThanOrEqualTo(root.get("entryDate"), endDate);
            }
        };
    }

    public static Specification<SalesRecord> hasCustomerName(String customerName) {
        return (root, query, cb) -> customerName == null || customerName.isEmpty() ? null : cb.like(cb.lower(root.get("customer").get("customerName")), "%" + customerName.toLowerCase() + "%");
    }

    public static Specification<SalesRecord> hasContactNumber(String contactNumber) {
        return (root, query, cb) -> contactNumber == null || contactNumber.isEmpty() ? null : cb.like(root.get("customer").get("contactNumber"), "%" + contactNumber + "%");
    }

    public static Specification<SalesRecord> hasCity(String city) {
        return (root, query, cb) -> city == null || city.isEmpty() ? null : cb.like(cb.lower(root.get("customer").get("city")), "%" + city.toLowerCase() + "%");
    }

    public static Specification<SalesRecord> hasSalesman(Long salesmanId) {
        return (root, query, cb) -> salesmanId == null ? null : cb.equal(root.get("salesman").get("id"), salesmanId);
    }

    public static Specification<SalesRecord> isNotDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    public static Specification<SalesRecord> getFilterSpecification(java.util.Map<String, String> filters) {
        Specification<SalesRecord> spec = Specification.where(isNotDeleted());
        if (filters.containsKey("customerName") && !filters.get("customerName").isEmpty()) {
            spec = spec.and(hasCustomerName(filters.get("customerName")));
        }
        if (filters.containsKey("contactNumber") && !filters.get("contactNumber").isEmpty()) {
            spec = spec.and(hasContactNumber(filters.get("contactNumber")));
        }
        if (filters.containsKey("city") && !filters.get("city").isEmpty()) {
            spec = spec.and(hasCity(filters.get("city")));
        }
        if (filters.containsKey("salesmanId") && !filters.get("salesmanId").isEmpty()) {
            spec = spec.and(hasSalesman(Long.parseLong(filters.get("salesmanId"))));
        }
        
        if (filters.containsKey("minAmount") && !filters.get("minAmount").isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("netAmount"), new java.math.BigDecimal(filters.get("minAmount").replace(",", ""))));
        }
        if (filters.containsKey("maxAmount") && !filters.get("maxAmount").isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("netAmount"), new java.math.BigDecimal(filters.get("maxAmount").replace(",", ""))));
        }
        
        LocalDate start = null;
        LocalDate end = null;
        if (filters.containsKey("startDate") && !filters.get("startDate").isEmpty()) {
            start = LocalDate.parse(filters.get("startDate"));
        }
        if (filters.containsKey("endDate") && !filters.get("endDate").isEmpty()) {
            end = LocalDate.parse(filters.get("endDate"));
        }
        spec = spec.and(betweenDates(start, end));

        if (filters.containsKey("globalSearch") && !filters.get("globalSearch").isEmpty()) {
            String gs = filters.get("globalSearch").toLowerCase();
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("customer").get("customerName")), "%" + gs + "%"),
                cb.like(cb.lower(root.get("customer").get("contactNumber")), "%" + gs + "%"),
                cb.like(cb.lower(root.get("customer").get("city")), "%" + gs + "%")
            ));
        }

        if (filters.containsKey("billType") && !filters.get("billType").isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("billType"), filters.get("billType")));
        }
        
        return spec;
    }
}
