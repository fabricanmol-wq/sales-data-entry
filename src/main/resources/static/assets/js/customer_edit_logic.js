// Open Customer Edit Modal
window.editCustomer = function(id) {
    if (!uniqueCustomers) return;
    const c = uniqueCustomers.find(x => x.id === id);
    if (!c) return;
    
    document.getElementById('editCustomerId').value = c.id;
    document.getElementById('editCustomerName').value = c.customerName || '';
    document.getElementById('editCustomerContact').value = c.contactNumber || '';
    document.getElementById('editCustomerCity').value = c.city || '';
    document.getElementById('editCustomerDiscount').value = c.fixedDiscount || '';
    
    const sSelect = document.getElementById('editCustomerSalesman');
    sSelect.innerHTML = '<option value=\"\">Select Salesman...</option>';
    if (allSalesmen) {
        allSalesmen.forEach(s => {
            sSelect.innerHTML += `<option value=\"${s.id}\">${s.name}</option>`;
        });
    }
    
    if (c.nextSalesmanId) {
        sSelect.value = c.nextSalesmanId;
    }
    
    new bootstrap.Modal(document.getElementById('editCustomerModal')).show();
};

// Handle Customer Edit Form Submit
document.getElementById('editCustomerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (data.nextSalesmanId === "") data.nextSalesmanId = null;
    if (data.fixedDiscount === "") data.fixedDiscount = null;
    const id = data.id;
    try {
        const res = await fetch(`/api/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showNotification('Customer updated successfully', 'success');
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editCustomerModal')).hide();
            loadCustomers();
        } else {
            showNotification(await res.text(), 'danger');
        }
    } catch(err) {
        console.error(err);
        showNotification('Error updating customer', 'danger');
    }
});
