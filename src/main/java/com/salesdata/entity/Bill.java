package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "bills")
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class Bill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDateTime billDate;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
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
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "salesman_id")
    private Salesman salesman;
    
    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<BillItem> items;
    
    @Column(nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "DECIMAL(12,2)")
    private BigDecimal expenses = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal netAmount = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private BigDecimal paidAmount = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private BigDecimal creditAmount = BigDecimal.ZERO;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User createdBy;

    @Column(nullable = false, columnDefinition = "BOOLEAN")
    private boolean isDeleted = false;
}
