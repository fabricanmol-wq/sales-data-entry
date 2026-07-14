package com.salesdata.repository;

import com.salesdata.entity.CallRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CallRecordRepository extends JpaRepository<CallRecord, Long>, JpaSpecificationExecutor<CallRecord> {
    Optional<CallRecord> findFirstByCustomerNameAndContactNumberOrderByCallDateDesc(String customerName, String contactNumber);
}
