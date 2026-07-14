package com.salesdata.repository;

import com.salesdata.entity.SalesRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import com.salesdata.entity.Customer;

@Repository
public interface SalesRecordRepository extends JpaRepository<SalesRecord, Long>, JpaSpecificationExecutor<SalesRecord> {
    Optional<SalesRecord> findFirstByCustomerAndIsDeletedFalseOrderByEntryDateDesc(Customer customer);
    List<SalesRecord> findByCustomerAndIsDeletedFalseOrderByEntryDateAsc(Customer customer);
    List<SalesRecord> findByIsDeletedFalse();
    Optional<SalesRecord> findByRemarksAndIsDeletedFalse(String remarks);
    
    @Query("SELECT DISTINCT s.customer FROM SalesRecord s WHERE s.isDeleted = false")
    List<Customer> findUniqueCustomersBasic();
}
