package com.salesdata.controller;

import com.salesdata.entity.Customer;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
public class CustomerSummaryDTO {
    private Long id;
    private String customerName;
    private String contactNumber;
    private String city;
    private BigDecimal totalCredit;
    private Long lastSalesmanId;
    private Long nextSalesmanId;
    private Double fixedDiscount;

    public CustomerSummaryDTO(Customer customer, BigDecimal totalCredit, Long lastSalesmanId) {
        this.id = customer.getId();
        this.customerName = customer.getCustomerName();
        this.contactNumber = customer.getContactNumber();
        this.city = customer.getCity();
        this.totalCredit = totalCredit;
        this.lastSalesmanId = lastSalesmanId;
        this.nextSalesmanId = customer.getNextSalesman() != null ? customer.getNextSalesman().getId() : null;
        this.fixedDiscount = customer.getFixedDiscount();
    }
}
