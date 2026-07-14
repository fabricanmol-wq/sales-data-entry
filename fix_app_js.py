import re

with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken loadPermissionsMatrix and savePermissionsMatrix
pattern = re.compile(r'async function loadPermissionsMatrix\(\) \{.*?\n\s+try \{\n\s+const res = await fetch\(\'/api/permissions\', \{\n\s+method: \'POST\',.*?\n\s+console\.error\(e\);\n\s+\}\n\}', re.DOTALL)

replacement = """async function loadPermissionsMatrix() {
    try {
        const res = await fetch('/api/permissions');
        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`Failed to load permissions: ${res.status} ${errTxt}`);
        }
        let allPerms = await res.json();
        if (!Array.isArray(allPerms)) allPerms = [];
        
        const container = document.getElementById('permissionsMatrixContainer');
        if(!container) return; // safety
        container.innerHTML = '';
        
        matrixRoles.forEach(role => {
            let roleHtml = `
            <div class="card mb-4 border-secondary">
                <div class="card-header bg-secondary text-white fw-bold">
                    Role: ${role.replace(/_/g, ' ')}
                </div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-bordered table-hover mb-0 text-center permissions-matrix-table">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th>MODULE</th>
                                <th>VIEW</th>
                                <th>CREATE</th>
                                <th>EDIT</th>
                                <th>DELETE</th>
                                <th>VIEW FUND</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            matrixModules.forEach((module) => {
                let perm = allPerms.find(p => p.roleName === role && p.moduleName === module);
                if (!perm) {
                    perm = {
                        roleName: role, moduleName: module,
                        canView: false, canCreate: false, canEdit: false, canDelete: false,
                        canViewFund: false
                    };
                }
                
                roleHtml += `
                    <tr data-role="${role}" data-module="${module}">
                        <td class="fw-bold text-start ps-3">${module}</td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canView" ${perm.canView ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canCreate" ${perm.canCreate ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canEdit" ${perm.canEdit ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canDelete" ${perm.canDelete ? 'checked' : ''}></td>
                        <td class="align-middle bg-light"><input type="checkbox" class="form-check-input perm-cb" data-field="canViewFund" ${perm.canViewFund ? 'checked' : ''}></td>
                    </tr>`;
            });
            
            roleHtml += `</tbody></table></div></div>`;
            container.innerHTML += roleHtml;
        });
    } catch (e) {
        showNotification('Error loading permissions matrix: ' + e.message, 'danger');
        console.error(e);
    }
}

async function savePermissionsMatrix() {
    const payload = [];
    document.querySelectorAll('.permissions-matrix-table tbody tr').forEach(tr => {
        const p = {
            roleName: tr.dataset.role,
            moduleName: tr.dataset.module,
            canView: false, canCreate: false, canEdit: false, canDelete: false,
            canViewFund: false
        };
        tr.querySelectorAll('.perm-cb').forEach(cb => {
            p[cb.dataset.field] = cb.checked;
        });
        payload.push(p);
    });

    try {
        const res = await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showNotification('Permissions saved successfully!');
        } else {
            showNotification('Failed to save permissions', 'danger');
        }
    } catch (e) {
        showNotification('Error saving permissions: ' + e.message, 'danger');
        console.error(e);
    }
}"""

new_content, count = pattern.subn(replacement, content)
if count > 0:
    with open('src/main/resources/static/assets/js/app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed app.js successfully!")
else:
    print("Regex match failed, could not fix app.js.")
