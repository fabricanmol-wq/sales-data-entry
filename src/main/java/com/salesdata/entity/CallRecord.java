package com.salesdata.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "call_record")
public class CallRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String contactNumber;

    @Column(nullable = false)
    private LocalDateTime callDate;

    @Column(nullable = false)
    private String callStatus;

    @Column
    private String callOutcome;

    @Column
    private String reason;

    @Column(length = 1000)
    private String remarks;

    private LocalDate nextCallDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User calledBy;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public LocalDateTime getCallDate() { return callDate; }
    public void setCallDate(LocalDateTime callDate) { this.callDate = callDate; }

    public String getCallStatus() { return callStatus; }
    public void setCallStatus(String callStatus) { this.callStatus = callStatus; }

    public String getCallOutcome() { return callOutcome; }
    public void setCallOutcome(String callOutcome) { this.callOutcome = callOutcome; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDate getNextCallDate() { return nextCallDate; }
    public void setNextCallDate(LocalDate nextCallDate) { this.nextCallDate = nextCallDate; }

    public User getCalledBy() { return calledBy; }
    public void setCalledBy(User calledBy) { this.calledBy = calledBy; }
}
