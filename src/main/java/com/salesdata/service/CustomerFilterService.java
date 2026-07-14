package com.salesdata.service;

import com.salesdata.controller.CustomerSummaryDTO;
import com.salesdata.entity.Customer;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CustomerFilterService {

    @PersistenceContext
    private EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<CustomerSummaryDTO> getFilteredCustomers(Map<String, String> filters) {
        StringBuilder jpql = new StringBuilder(
            "SELECT new com.salesdata.controller.CustomerSummaryDTO(c, COALESCE(SUM(s.creditAmount), 0), MAX(s.salesman.id)) " +
            "FROM Customer c " +
            "LEFT JOIN SalesRecord s ON s.customer = c AND s.isDeleted = false "
        );
        
        jpql.append("WHERE c.isDeleted = false ");
        
        if (filters.containsKey("salesmanId") && !filters.get("salesmanId").isEmpty()) {
            jpql.append(" AND EXISTS (SELECT 1 FROM SalesRecord s2 WHERE s2.customer = c AND s2.salesman.id = :salesmanId AND s2.isDeleted = false) ");
        }
        
        // Customer specific filters
        if (filters.containsKey("city") && !filters.get("city").isEmpty()) {
            jpql.append(" AND LOWER(c.city) LIKE LOWER(:city) ");
        }
        if (filters.containsKey("globalSearch") && !filters.get("globalSearch").isEmpty()) {
            jpql.append(" AND (LOWER(c.customerName) LIKE LOWER(:globalSearch) " +
                        " OR LOWER(c.contactNumber) LIKE LOWER(:globalSearch) " +
                        " OR LOWER(c.city) LIKE LOWER(:globalSearch)) ");
        }
        
        jpql.append("GROUP BY c ");
        
        boolean hasHaving = false;
        if (filters.containsKey("minAmount") && !filters.get("minAmount").isEmpty()) {
            jpql.append("HAVING COALESCE(SUM(s.creditAmount), 0) >= :minAmount ");
            hasHaving = true;
        }
        if (filters.containsKey("maxAmount") && !filters.get("maxAmount").isEmpty()) {
            if (hasHaving) {
                jpql.append(" AND COALESCE(SUM(s.creditAmount), 0) <= :maxAmount ");
            } else {
                jpql.append("HAVING COALESCE(SUM(s.creditAmount), 0) <= :maxAmount ");
            }
        }
        
        jpql.append(" ORDER BY c.id DESC");
        
        Query query = entityManager.createQuery(jpql.toString());
        
        // Set Parameters
        if (filters.containsKey("salesmanId") && !filters.get("salesmanId").isEmpty()) {
            query.setParameter("salesmanId", Long.parseLong(filters.get("salesmanId")));
        }
        
        if (filters.containsKey("city") && !filters.get("city").isEmpty()) {
            query.setParameter("city", "%" + filters.get("city") + "%");
        }
        if (filters.containsKey("globalSearch") && !filters.get("globalSearch").isEmpty()) {
            query.setParameter("globalSearch", "%" + filters.get("globalSearch") + "%");
        }
        
        if (filters.containsKey("minAmount") && !filters.get("minAmount").isEmpty()) {
            query.setParameter("minAmount", new BigDecimal(filters.get("minAmount").replace(",", "")));
        }
        if (filters.containsKey("maxAmount") && !filters.get("maxAmount").isEmpty()) {
            query.setParameter("maxAmount", new BigDecimal(filters.get("maxAmount").replace(",", "")));
        }

        return query.getResultList();
    }
}
