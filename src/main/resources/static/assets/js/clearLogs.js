document.getElementById('clearLogsBtn')?.addEventListener('click', async () => {
    if(!confirm("Are you sure you want to clear ALL error logs? This cannot be undone.")) return;
    try {
        const res = await fetch('/api/logs/error', {
            method: 'DELETE',
            headers: { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') }
        });
        if (res.ok) {
            showNotification('Logs cleared successfully');
            loadErrorLogs();
        } else {
            showNotification('Failed to clear logs', 'danger');
        }
    } catch(e) {
        showNotification('Error: ' + e.message, 'danger');
    }
});
