package com.salesdata.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class CallingCustomerDTO {
    private String customerName;
    private String contactNumber;
    private LocalDateTime lastCallDate;
    private String callStatus;
    private String callOutcome;
    private LocalDate nextCallDate;
    private String remarks;
    private String reason;

    public CallingCustomerDTO(String customerName, String contactNumber, LocalDateTime lastCallDate, String callStatus, String callOutcome, LocalDate nextCallDate, String remarks, String reason) {
        this.customerName = customerName;
        this.contactNumber = contactNumber;
        this.lastCallDate = lastCallDate;
        this.callStatus = callStatus;
        this.callOutcome = callOutcome;
        this.nextCallDate = nextCallDate;
        this.remarks = remarks;
        this.reason = reason;
    }

    public String getCustomerName() { return customerName; }
    public String getContactNumber() { return contactNumber; }
    public LocalDateTime getLastCallDate() { return lastCallDate; }
    public String getCallStatus() { return callStatus; }
    public String getCallOutcome() { return callOutcome; }
    public LocalDate getNextCallDate() { return nextCallDate; }
    public String getRemarks() { return remarks; }
    public String getReason() { return reason; }
}
