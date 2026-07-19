package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "sales_records")
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class SalesRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Acts as S.No

    @Column(nullable = false)
    private LocalDate entryDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Customer customer;

    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public String getCustomerName() {
        return customer != null ? customer.getCustomerName() : null;
    }

    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public String getContactNumber() {
        return customer != null ? customer.getContactNumber() : null;
    }

    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public String getCity() {
        return customer != null ? customer.getCity() : null;
    }

    @Transient
    @JsonProperty(value = "customerName", access = JsonProperty.Access.WRITE_ONLY)
    private String tempCustomerName;

    @Transient
    @JsonProperty(value = "contactNumber", access = JsonProperty.Access.WRITE_ONLY)
    private String tempContactNumber;

    @Transient
    @JsonProperty(value = "city", access = JsonProperty.Access.WRITE_ONLY)
    private String tempCity;

    @Column(nullable = false)
    private BigDecimal billAmount = BigDecimal.ZERO;

    @ManyToOne
    @JoinColumn(name = "salesman_id")
    private Salesman salesman;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "DECIMAL(12,2)")
    private BigDecimal expenses = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal netAmount = BigDecimal.ZERO; // Auto Calculate

    @Column(nullable = false, columnDefinition = "DECIMAL(12,2)")
    private BigDecimal creditAmount = BigDecimal.ZERO;

    private String remarks;

    @Column(nullable = false, columnDefinition = "VARCHAR(20)")
    private String billType = "CREDIT";

    @Column(nullable = false)
    private LocalDate reminderDate; // Auto Entry Date + 60 Days
    
    @ManyToOne
    @JoinColumn(name = "created_by_user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User createdBy;

    @Column(nullable = false, columnDefinition = "BOOLEAN")
    private boolean isDeleted = false;
}
