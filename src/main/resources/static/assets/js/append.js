// Auto-fill date for Not Attended
document.getElementById('callStatus').addEventListener('change', function() {
    if (this.value === 'Not Attended') {
        let tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        document.getElementById('callNextDate').value = tmrw.toISOString().split('T')[0];
    }
});

// Calling Dashboard Filter Function
window.filterCallingReports = function(outcome, reason) {
    document.getElementById('crStatus').value = '';
    document.getElementById('crOutcome').value = outcome;
    document.getElementById('crReason').value = reason;
    switchSection('calling-reports');
    // Ensure active nav link is updated
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    let targetNav = document.querySelector('.nav-link[data-target="calling-reports"]');
    if(targetNav) targetNav.classList.add('active');
    setTimeout(() => {
        loadCallingReports();
    }, 100);
};
