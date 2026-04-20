// components/reportprocessor.js - Daily Report Processor Component
// This component goes in the LEFT PANEL below the FILTER button

export default {
    render() {
        return `
            <div class="report-processor-section">
                <div class="section">
                    <h3>📋 DAILY REPORT PROCESSOR</h3>
                    <p style="font-size: 0.7em; margin-bottom: 10px; opacity: 0.7;">
                        Paste the daily sewer report to parse complaints, geocode addresses, and create buffers.
                    </p>
                    
                    <textarea id="reportTextInput" class="report-textarea" 
                        placeholder="SEWER SECTION DAILY REPORT ON 19/11/2025.
Complaints received=33.
Complaints attended to 24 current + 4 from the previous days.
-Sakubva Beithall Gym.
-5689 Bernwin.
-Opp T 430.
-10034 Reminder of Devonshire."></textarea>
                    
                    <button id="processReportBtn" class="process-report-btn">
                        🔍 PROCESS REPORT
                    </button>
                    
                    <div id="reportResultPanel" class="report-result" style="display: none;">
                        <div id="reportStats"></div>
                        <div id="reportPreview"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    init() {
        const processBtn = document.getElementById('processReportBtn');
        if (processBtn) {
            processBtn.addEventListener('click', async () => {
                await this.processReport();
            });
        }
    },
    
    async processReport() {
        const textarea = document.getElementById('reportTextInput');
        const reportText = textarea?.value;
        
        if (!reportText || !reportText.trim()) {
            alert('Please paste a report first');
            return;
        }
        
        const resultPanel = document.getElementById('reportResultPanel');
        const statsDiv = document.getElementById('reportStats');
        const previewDiv = document.getElementById('reportPreview');
        
        resultPanel.style.display = 'block';
        statsDiv.innerHTML = '<div class="stat-row"><span>⏳ Processing report...</span></div>';
        previewDiv.innerHTML = '';
        
        try {
            // Call the Python backend API
            const response = await fetch('http://localhost:5001/api/reports/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_text: reportText })
            });
            
            const data = await response.json();
            
            if (data.success) {
                statsDiv.innerHTML = `
                    <div class="stat-row success"><span>✅ Status:</span><span>Success</span></div>
                    <div class="stat-row"><span>📅 Report Date:</span><span>${data.report_date || 'Today'}</span></div>
                    <div class="stat-row"><span>📊 Total Complaints:</span><span>${data.stats?.total_complaints || 0}</span></div>
                    <div class="stat-row"><span>✅ Attended To:</span><span>${data.stats?.complaints_attended || 0}</span></div>
                    <div class="stat-row"><span>⏳ Outstanding Jobs:</span><span>${data.stats?.outstanding_jobs || 0}</span></div>
                    <div class="stat-row"><span>📍 Complaints Parsed:</span><span>${data.complaints_count || 0}</span></div>
                    <div class="stat-row"><span>🚗 Operational Vehicles:</span><span>${data.transport_operational || 0}</span></div>
                    <div class="stat-row"><span>🔧 Workshop Vehicles:</span><span>${data.transport_workshop || 0}</span></div>
                `;
                
                // Trigger map update to show new complaint locations
                if (data.complaints_count > 0) {
                    const event = new CustomEvent('reportProcessed', {
                        detail: { reportDate: data.report_date || new Date().toISOString().split('T')[0] }
                    });
                    document.dispatchEvent(event);
                }
            } else {
                statsDiv.innerHTML = `<div class="stat-row error"><span>❌ Error:</span><span>${data.error || 'Unknown error'}</span></div>`;
            }
        } catch (error) {
            statsDiv.innerHTML = `<div class="stat-row error"><span>❌ Connection Error:</span><span>Make sure the Python backend is running on port 5001</span></div>`;
            console.error('Report processing error:', error);
        }
    }
};
