import re

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    html = f.read()

settings_end_idx = html.find('<!-- /container-fluid -->')
if settings_end_idx == -1:
    # try to find the end of the sections container
    settings_end_idx = html.rfind('</div>\n            </div> <!-- /container-fluid -->')
    if settings_end_idx == -1:
        settings_end_idx = html.rfind('            </div>\n        </div>\n    </div>\n    <!-- Customer Ledger Modal -->')

if settings_end_idx != -1:
    error_logs_html = """
                <!-- ================= ERROR LOGS ================= -->
                <div id="section-errorLogs" class="content-section d-none">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h2>System Audit Logs</h2>
                        <button class="btn btn-danger" id="clearLogsBtn"><i class="bi bi-trash me-2"></i>Clear Logs</button>
                    </div>
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover table-striped mb-0" id="errorLogsTable">
                                    <thead class="table-dark text-nowrap">
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Error Details</th>
                                            <th>Page URL</th>
                                            <th>Action / Component</th>
                                            <th>Stack Trace</th>
                                        </tr>
                                    </thead>
                                    <tbody style="font-size: 0.9em;">
                                        <!-- Error logs loaded here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
"""
    new_html = html[:settings_end_idx] + error_logs_html + html[settings_end_idx:]
    with open('src/main/resources/static/app.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Injected error logs section successfully.")
else:
    print("Could not find injection point.")
