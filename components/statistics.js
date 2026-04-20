// components/statistics.js - Statistics Component with Charts & Summary
// Handles blockages by suburb chart, jobs by type chart, and quick summary

let suburbChart = null;
let jobsChart = null;
let currentData = {
    manholes: [],
    pipelines: []
};

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
    // Blockages by Suburb Chart (Bar Chart)
    const suburbCtx = document.getElementById('suburbChart')?.getContext('2d');
    if (suburbCtx) {
        suburbChart = new Chart(suburbCtx, {
            type: 'bar',
            data: {
                labels: ['CBD', 'Sakubva', 'Dangamvura', 'Chikanga', 'Yeovil'],
                datasets: [{
                    label: 'Blockages',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#228B22',
                    borderColor: '#2d8a2d',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: 'forestgreen', font: { size: 10 } }
                    },
                    tooltip: {
                        backgroundColor: '#1a3a1a',
                        titleColor: 'forestgreen',
                        bodyColor: '#7cb342'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#2a4a2a' },
                        ticks: { color: 'forestgreen' }
                    },
                    x: {
                        grid: { color: '#2a4a2a' },
                        ticks: { color: 'forestgreen' }
                    }
                }
            }
        });
    }

    // Jobs by Type Chart (Pie Chart)
    const jobsCtx = document.getElementById('jobsChart')?.getContext('2d');
    if (jobsCtx) {
        jobsChart = new Chart(jobsCtx, {
            type: 'pie',
            data: {
                labels: ['Unblocking', 'Inspection', 'Repair', 'Maintenance'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#228B22', '#44aa44', '#66cc66', '#88dd88'],
                    borderColor: '#0a1f0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'forestgreen', font: { size: 10 } }
                    },
                    tooltip: {
                        backgroundColor: '#1a3a1a',
                        titleColor: 'forestgreen',
                        bodyColor: '#7cb342'
                    }
                }
            }
        });
    }
}

// ============================================
// DATA UPDATE FUNCTIONS
// ============================================

function updateSuburbChart(manholes) {
    if (!suburbChart) return;
    
    // Aggregate blockages by suburb
    const suburbData = {
        'CBD': 0,
        'Sakubva': 0,
        'Dangamvura': 0,
        'Chikanga': 0,
        'Yeovil': 0
    };
    
    for (let i = 0; i < manholes.length; i++) {
        const m = manholes[i];
        if (suburbData[m.suburb] !== undefined) {
            suburbData[m.suburb] += m.blockages || 0;
        }
    }
    
    suburbChart.data.datasets[0].data = Object.values(suburbData);
    suburbChart.update();
}

function updateJobsChart(jobLogs) {
    if (!jobsChart) return;
    
    // Aggregate jobs by type
    const jobData = {
        'Unblocking': 0,
        'Inspection': 0,
        'Repair': 0,
        'Maintenance': 0
    };
    
    if (jobLogs && jobLogs.length > 0) {
        for (let i = 0; i < jobLogs.length; i++) {
            const job = jobLogs[i];
            if (jobData[job.type] !== undefined) {
                jobData[job.type]++;
            }
        }
    } else {
        // Mock data for demonstration
        jobData['Unblocking'] = 45;
        jobData['Inspection'] = 23;
        jobData['Repair'] = 12;
        jobData['Maintenance'] = 8;
    }
    
    jobsChart.data.datasets[0].data = Object.values(jobData);
    jobsChart.update();
}

function updateQuickSummary(manholes, pipelines) {
    const totalManholes = manholes.length;
    const totalPipelines = pipelines.length;
    const criticalCount = manholes.filter(m => m.status === 'critical').length;
    const warningCount = manholes.filter(m => m.status === 'warning').length;
    const goodCount = manholes.filter(m => m.status === 'good').length;
    const totalBlockages = manholes.reduce((sum, m) => sum + (m.blockages || 0), 0);
    const avgBlockages = totalManholes > 0 ? (totalBlockages / totalManholes).toFixed(1) : 0;
    
    // Update DOM elements
    const totalManholesEl = document.getElementById('totalManholes');
    const totalPipelinesEl = document.getElementById('totalPipelines');
    const criticalAssetsEl = document.getElementById('criticalAssets');
    const warningAssetsEl = document.getElementById('warningAssets');
    const goodAssetsEl = document.getElementById('goodAssets');
    const totalBlockagesEl = document.getElementById('totalBlockages');
    const avgBlockagesEl = document.getElementById('avgBlockages');
    
    if (totalManholesEl) totalManholesEl.innerText = totalManholes;
    if (totalPipelinesEl) totalPipelinesEl.innerText = totalPipelines;
    if (criticalAssetsEl) criticalAssetsEl.innerText = criticalCount;
    if (warningAssetsEl) warningAssetsEl.innerText = warningCount;
    if (goodAssetsEl) goodAssetsEl.innerText = goodCount;
    if (totalBlockagesEl) totalBlockagesEl.innerText = totalBlockages;
    if (avgBlockagesEl) avgBlockagesEl.innerText = avgBlockages;
    
    // Update risk distribution bar (visual)
    updateRiskBar(criticalCount, warningCount, goodCount, totalManholes);
}

function updateRiskBar(critical, warning, good, total) {
    const riskBar = document.getElementById('riskDistributionBar');
    if (!riskBar) return;
    
    const criticalPercent = total > 0 ? (critical / total) * 100 : 0;
    const warningPercent = total > 0 ? (warning / total) * 100 : 0;
    const goodPercent = total > 0 ? (good / total) * 100 : 0;
    
    riskBar.innerHTML = `
        <div style="display: flex; height: 20px; border-radius: 10px; overflow: hidden; margin-top: 8px;">
            <div style="width: ${criticalPercent}%; background: #dc3545; transition: width 0.3s;"></div>
            <div style="width: ${warningPercent}%; background: #ffc107; transition: width 0.3s;"></div>
            <div style="width: ${goodPercent}%; background: #28a745; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.6em;">
            <span>🔴 Critical (${critical})</span>
            <span>🟡 Warning (${warning})</span>
            <span>🟢 Good (${good})</span>
        </div>
    `;
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

function updateStatistics(manholes, pipelines, jobLogs) {
    currentData.manholes = manholes || [];
    currentData.pipelines = pipelines || [];
    
    updateSuburbChart(currentData.manholes);
    updateJobsChart(jobLogs);
    updateQuickSummary(currentData.manholes, currentData.pipelines);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function getCurrentStatistics() {
    return {
        totalManholes: currentData.manholes.length,
        totalPipelines: currentData.pipelines.length,
        criticalCount: currentData.manholes.filter(m => m.status === 'critical').length,
        warningCount: currentData.manholes.filter(m => m.status === 'warning').length,
        goodCount: currentData.manholes.filter(m => m.status === 'good').length,
        totalBlockages: currentData.manholes.reduce((sum, m) => sum + (m.blockages || 0), 0)
    };
}

// ============================================
// RENDER HTML
// ============================================

function render() {
    return `
        <div class="statistics-container">
            <!-- Blockages by Suburb Chart -->
            <div class="chart-container">
                <h4>📊 BLOCKAGES BY SUBURB</h4>
                <canvas id="suburbChart"></canvas>
            </div>
            
            <!-- Jobs by Type Chart -->
            <div class="chart-container">
                <h4>📋 JOBS BY TYPE</h4>
                <canvas id="jobsChart"></canvas>
            </div>
            
            <!-- Quick Summary -->
            <div class="chart-container">
                <h4>📈 QUICK SUMMARY</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-value" id="totalManholes">0</div>
                        <div class="summary-label">Total Manholes</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="totalPipelines">0</div>
                        <div class="summary-label">Total Pipelines</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="totalBlockages">0</div>
                        <div class="summary-label">Total Blockages</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" id="avgBlockages">0</div>
                        <div class="summary-label">Avg Blockages/Asset</div>
                    </div>
                </div>
                
                <!-- Risk Distribution -->
                <div style="margin-top: 15px;">
                    <div style="font-size: 0.7em; margin-bottom: 5px;">⚠️ RISK DISTRIBUTION</div>
                    <div id="riskDistributionBar"></div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.65em;">
                        <span>Critical: <span id="criticalAssets">0</span></span>
                        <span>Warning: <span id="warningAssets">0</span></span>
                        <span>Good: <span id="goodAssets">0</span></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    initCharts();
    // Initialize with empty data
    updateStatistics([], [], []);
}

// ============================================
// EXPORTS
// ============================================

export default {
    render,
    init,
    update: updateStatistics,
    getCurrent: getCurrentStatistics
};
