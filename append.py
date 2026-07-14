with open('src/main/resources/static/assets/js/app.js', 'a') as f:
    f.write('''

async function updateDevAdmin() {
    const username = document.getElementById("devAdminUsername").value;
    const password = document.getElementById("devAdminPassword").value;
    
    try {
        const res = await fetch("/api/users/update-developer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (res.ok) {
            showNotification("Developer credentials updated successfully!", "success");
            bootstrap.Modal.getInstance(document.getElementById("devAdminModal")).hide();
        } else {
            showNotification("Failed to update credentials.", "danger");
        }
    } catch (e) {
        showNotification("Error updating developer credentials", "danger");
    }
}
''')
