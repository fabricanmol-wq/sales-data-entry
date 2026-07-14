package com.salesdata.controller;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class BillDTO {
    private String customerName;
    private String contactNumber;
    private String city;
    private Long salesmanId;
    
    private BigDecimal totalAmount;
    private BigDecimal discount;
    private BigDecimal expenses;
    private BigDecimal netAmount;
    private BigDecimal paidAmount;
    
    private List<BillItemDTO> items;
}
