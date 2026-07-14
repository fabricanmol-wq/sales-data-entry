// Handle Outcome Change in Modal
window.handleOutcomeChange = function(outcome) {
    const reasonDiv = document.getElementById('reasonDiv');
    const reasonSelect = document.getElementById('callReason');
    
    if (outcome === 'Not Satisfied' || outcome === 'Not Interested') {
        reasonDiv.style.display = 'block';
        reasonSelect.innerHTML = '<option value=\"\">Select Reason</option>';
        if (outcome === 'Not Satisfied') {
            reasonSelect.innerHTML += '<option value=\"Change Salesmen\">Change Salesmen</option>';
            reasonSelect.innerHTML += '<option value=\"Product Issues\">Product Issues</option>';
            reasonSelect.innerHTML += '<option value=\"Product Quality\">Product Quality</option>';
        } else if (outcome === 'Not Interested') {
            reasonSelect.innerHTML += '<option value=\"Not Interested for Calling\">Not Interested for Calling</option>';
            reasonSelect.innerHTML += '<option value=\"Job Quit\">Job Quit</option>';
        }
    } else {
        reasonDiv.style.display = 'none';
        reasonSelect.value = '';
    }
};

window.toggleDashCustomDates = function() {
    const type = document.getElementById('dashFilterType').value;
    if (type === 'custom') {
        document.getElementById('dashStartDate').classList.remove('d-none');
        document.getElementById('dashEndDate').classList.remove('d-none');
    } else {
        document.getElementById('dashStartDate').classList.add('d-none');
        document.getElementById('dashEndDate').classList.add('d-none');
    }
};

window.loadCallingDashboard = async function() {
    try {
        const type = document.getElementById('dashFilterType').value;
        let url = `/api/calling/stats?filterType=${type}`;
        if (type === 'custom') {
            const sd = document.getElementById('dashStartDate').value;
            const ed = document.getElementById('dashEndDate').value;
            if (sd && ed) {
                url += `&startDate=${sd}&endDate=${ed}`;
            }
        }
        
        const res = await fetch(url);
        const stats = await res.json();
        document.getElementById('statTotalCallsToday').textContent = stats.totalCallsToday || 0;
        document.getElementById('statPendingFollowupsToday').textContent = stats.pendingFollowupsToday || 0;
        document.getElementById('statSatisfiedCalls').textContent = stats.satisfiedCalls || 0;
        document.getElementById('statNotSatisfiedCalls').textContent = stats.notSatisfiedCalls || 0;
        if(document.getElementById('statReasonChangeSalesmen')) document.getElementById('statReasonChangeSalesmen').textContent = stats.reasonChangeSalesmen || 0;
        if(document.getElementById('statReasonProductIssues')) document.getElementById('statReasonProductIssues').textContent = stats.reasonProductIssues || 0;
        if(document.getElementById('statReasonProductQuality')) document.getElementById('statReasonProductQuality').textContent = stats.reasonProductQuality || 0;
        
        // Hide details table when refreshing dashboard
        document.getElementById('dashboardDetailsContainer').classList.add('d-none');
    } catch (e) {
        console.error('Failed to load calling dashboard', e);
    }
};

window.loadDashboardDetails = async function(cardType) {
    try {
        const type = document.getElementById('dashFilterType').value;
        let url = `/api/calling/dashboard-details?cardType=${encodeURIComponent(cardType)}&filterType=${type}`;
        if (type === 'custom') {
            const sd = document.getElementById('dashStartDate').value;
            const ed = document.getElementById('dashEndDate').value;
            if (sd && ed) {
                url += `&startDate=${sd}&endDate=${ed}`;
            }
        }
        
        const res = await fetch(url);
        const records = await res.json();
        
        document.getElementById('dashboardDetailsTitle').textContent = cardType + ' Details';
        document.getElementById('dashboardDetailsContainer').classList.remove('d-none');
        
        const tbody = document.querySelector('#dashboardDetailsTable tbody');
        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan=\"8\" class=\"text-center text-muted\">No records found.</td></tr>';
            return;
        }
        
        records.forEach(c => {
            let statusBadge = c.callStatus ? `<span class=\"badge bg-secondary\">${c.callStatus}</span>` : '-';
            if (c.callStatus === 'Attended') statusBadge = `<span class=\"badge bg-success\">Attended</span>`;
            if (c.callStatus === 'Not Attended') statusBadge = `<span class=\"badge bg-danger\">Not Attended</span>`;
            
            tbody.innerHTML += `<tr>
                <td class=\"fw-bold\">${escapeHTML(c.customerName || '')}</td>
                <td>${escapeHTML(c.contactNumber || '')}</td>
                <td>${c.callDate ? new Date(c.callDate).toLocaleString() : '-'}</td>
                <td>${c.nextCallDate ? c.nextCallDate : '-'}</td>
                <td>${statusBadge}</td>
                <td>${escapeHTML(c.callOutcome || '-')}</td>
                <td>${escapeHTML(c.reason || '-')}</td>
                <td>${escapeHTML(c.remarks || '-')}</td>
            </tr>`;
        });
        
        // Scroll down to the table so user can see it
        document.getElementById('dashboardDetailsContainer').scrollIntoView({ behavior: 'smooth' });
    } catch(e) {
        console.error('Failed to load dashboard details', e);
    }
};
