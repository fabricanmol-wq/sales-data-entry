package com.salesdata.controller;

import java.time.LocalDate;

public class CustomerReminderDTO {
    private Long customerId;
    private String customerName;
    private String contactNumber;
    private String city;
    private LocalDate reminderDate;

    public CustomerReminderDTO(Long customerId, String customerName, String contactNumber, String city, LocalDate reminderDate) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.contactNumber = contactNumber;
        this.city = city;
        this.reminderDate = reminderDate;
    }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public LocalDate getReminderDate() { return reminderDate; }
    public void setReminderDate(LocalDate reminderDate) { this.reminderDate = reminderDate; }
}
