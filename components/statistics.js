// components/statistics.js - Statistics Component with Charts & Summary
// Fetches live data from Python Flask backend API

let suburbChart = null;
let jobsChart = null;
let statusChart = null;
let assetStatusChart = null;
let currentData = {
    manholesCount: 0,
    pipelinesCount: 0,
    complaintsCount: 0,
    criticalCount: 0,
    warningCount: 0,
    goodCount: 0,
    totalBlockages: 0,
    avgBlockages: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0,
    completedJobs: 0,
    inProgressJobs: 0,
    manholesCritical: 0,
    manholesWarning: 0,
    manholesGood: 0,
    pipelinesCritical: 0,
    pipelinesWarning: 0,
    pipelinesGood: 0
};

let currentView = 'menu';

const API_BASE_URL = 'http://localhost:5000/api';

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/summary`);
        if (!response.ok) throw new Error('Stats fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
}

async function fetchAssetStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/asset_status`);
        if (!response.ok) throw new Error('Asset status fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching asset status:', error);
        return {
            manholes: { critical: 0, warning: 0, good: 0 },
            pipelines: { critical: 0, warning: 0, good: 0 }
        };
    }
}

async function fetchBlockagesBySuburb() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/blockages_by_suburb`);
        if (!response.ok) throw new Error('Blockages fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching blockages by suburb:', error);
        return {
            suburbs: ['Sakubva', 'Chikanga', 'Dangamvura', 'Hobhouse', 'Yeovil'],
            blockages: [12, 8, 15, 5, 7]
        };
    }
}

async function fetchJobsSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/jobs_summary`);
        if (!response.ok) throw new Error('Jobs summary fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching jobs summary:', error);
        return {
            labels: ['Unblocking', 'Inspection', 'Repair', 'Maintenance'],
            counts: [45, 23, 12, 8]
        };
    }
}

async function fetchComplaintsStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistics/complaints_status`);
        if (!response.ok) throw new Error('Complaints status fetch failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching complaints status:', error);
        return { resolved: 0, pending: 0, total: 0 };
    }
}

// ============================================
// CHART INITIALIZATION
// ============================================

function initCharts() {
    const suburbCtx = document.getElementById('suburbChart')?.getContext('2d');
    if (suburbCtx) {
        suburbChart = new Chart(suburbCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Blockages',
                    data: [],
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
                    legend: { labels: { color: '#a5d6a7', font: { size: 10 } } },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#2a4a2a' }, 
                        ticks: { color: '#a5d6a7' },
                        title: { display: true, text: 'Number of Blockages', color: '#7cb342' }
                    },
                    x: { 
                        grid: { color: '#2a4a2a' }, 
                        ticks: { color: '#a5d6a7', rotation: 45, maxRotation: 45 },
                        title: { display: true, text: 'Suburb', color: '#7cb342' }
                    }
                }
            }
        });
    }

    const jobsCtx = document.getElementById('jobsChart')?.getContext('2d');
    if (jobsCtx) {
        jobsChart = new Chart(jobsCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#228B22', '#44aa44', '#66cc66', '#88dd88', '#aaffaa'],
                    borderColor: '#0a1f0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#a5d6a7', font: { size: 10 } } },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                }
            }
        });
    }
    
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Resolved', 'Pending'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#28a745', '#ffc107'],
                    borderColor: '#0a1f0a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#a5d6a7', font: { size: 10 } } },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                }
            }
        });
    }
    
    const assetCtx = document.getElementById('assetStatusChart')?.getContext('2d');
    if (assetCtx) {
        assetStatusChart = new Chart(assetCtx, {
            type: 'bar',
            data: {
                labels: ['Manholes', 'Pipelines'],
                datasets: [
                    {
                        label: '🔴 Critical',
                        data: [0, 0],
                        backgroundColor: '#dc3545',
                        borderRadius: 4
                    },
                    {
                        label: '🟡 Warning / Pending',
                        data: [0, 0],
                        backgroundColor: '#ffc107',
                        borderRadius: 4
                    },
                    {
                        label: '🟣 Manholes Normal / 🟢 Pipelines Normal',
                        data: [0, 0],
                        backgroundColor: ['#9b59b6', '#32cd32'],
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#a5d6a7', font: { size: 9 } }
                    },
                    tooltip: { backgroundColor: '#1a2a27', titleColor: '#69f0ae', bodyColor: '#a5d6a7' }
                },
                scales: {
                    x: { 
                        ticks: { color: '#a5d6a7', font: { weight: 'bold' } },
                        grid: { color: '#2a4a2a' }
                    },
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: '#a5d6a7' },
                        grid: { color: '#2a4a2a' },
                        title: { display: true, text: 'Number of Assets', color: '#7cb342' },
                        stacked: true
                    }
                }
            }
        });
    }
}

// ============================================
// UPDATE FUNCTIONS
// ============================================

async function updateFromAPI() {
    const stats = await fetchStats();
    if (stats) {
        currentData.manholesCount = stats.manholes || 0;
        currentData.pipelinesCount = stats.pipelines || 0;
        currentData.complaintsCount = stats.complaints || 0;
        currentData.totalBlockages = stats.total_blockages || 0;
        currentData.avgBlockages = stats.avg_blockages || 0;
        currentData.completedJobs = stats.completed_jobs || 0;
        currentData.inProgressJobs = stats.in_progress_jobs || 0;
        
        updateQuickSummaryDOM();
    }

    const assetStatus = await fetchAssetStatus();
    if (assetStatus) {
        currentData.manholesCritical = assetStatus.manholes?.critical || 0;
        currentData.manholesWarning = assetStatus.manholes?.warning || 0;
        currentData.manholesGood = assetStatus.manholes?.good || 0;
        currentData.pipelinesCritical = assetStatus.pipelines?.critical || 0;
        currentData.pipelinesWarning = assetStatus.pipelines?.warning || 0;
        currentData.pipelinesGood = assetStatus.pipelines?.good || 0;
        
        currentData.criticalCount = currentData.manholesCritical + currentData.pipelinesCritical;
        currentData.warningCount = currentData.manholesWarning + currentData.pipelinesWarning;
        currentData.goodCount = currentData.manholesGood + currentData.pipelinesGood;
        
        updateAssetStatusChart();
        updateRiskBar();
    }

    const blockagesData = await fetchBlockagesBySuburb();
    if (blockagesData && suburbChart) {
        suburbChart.data.labels = blockagesData.suburbs;
        suburbChart.data.datasets[0].data = blockagesData.blockages;
        suburbChart.update();
    }

    const jobsData = await fetchJobsSummary();
    if (jobsData && jobsChart) {
        jobsChart.data.labels = jobsData.labels;
        jobsChart.data.datasets[0].data = jobsData.counts;
        jobsChart.update();
    }
    
    const complaintsStatus = await fetchComplaintsStatus();
    if (complaintsStatus && statusChart) {
        currentData.resolvedComplaints = complaintsStatus.resolved || 0;
        currentData.pendingComplaints = complaintsStatus.pending || 0;
        statusChart.data.datasets[0].data = [complaintsStatus.resolved || 0, complaintsStatus.pending || 0];
        statusChart.update();
        
        const resolvedEl = document.getElementById('resolvedComplaints');
        const pendingEl = document.getElementById('pendingComplaints');
        if (resolvedEl) resolvedEl.innerText = complaintsStatus.resolved || 0;
        if (pendingEl) pendingEl.innerText = complaintsStatus.pending || 0;
    }
}

function updateAssetStatusChart() {
    if (assetStatusChart) {
        assetStatusChart.data.datasets[0].data = [currentData.manholesCritical, currentData.pipelinesCritical];
        assetStatusChart.data.datasets[1].data = [currentData.manholesWarning, currentData.pipelinesWarning];
        assetStatusChart.data.datasets[2].data = [currentData.manholesGood, currentData.pipelinesGood];
        assetStatusChart.update();
    }
    
    const manholesCriticalEl = document.getElementById('manholesCritical');
    const manholesWarningEl = document.getElementById('manholesWarning');
    const manholesGoodEl = document.getElementById('manholesGood');
    const pipelinesCriticalEl = document.getElementById('pipelinesCritical');
    const pipelinesWarningEl = document.getElementById('pipelinesWarning');
    const pipelinesGoodEl = document.getElementById('pipelinesGood');
    
    if (manholesCriticalEl) manholesCriticalEl.innerText = currentData.manholesCritical;
    if (manholesWarningEl) manholesWarningEl.innerText = currentData.manholesWarning;
    if (manholesGoodEl) manholesGoodEl.innerText = currentData.manholesGood;
    if (pipelinesCriticalEl) pipelinesCriticalEl.innerText = currentData.pipelinesCritical;
    if (pipelinesWarningEl) pipelinesWarningEl.innerText = currentData.pipelinesWarning;
    if (pipelinesGoodEl) pipelinesGoodEl.innerText = currentData.pipelinesGood;
    
    const criticalAssetsDetail = document.getElementById('criticalAssetsDetail');
    const warningAssetsDetail = document.getElementById('warningAssetsDetail');
    const goodAssetsDetail = document.getElementById('goodAssetsDetail');
    if (criticalAssetsDetail) criticalAssetsDetail.innerText = currentData.criticalCount;
    if (warningAssetsDetail) warningAssetsDetail.innerText = currentData.warningCount;
    if (goodAssetsDetail) goodAssetsDetail.innerText = currentData.goodCount;
}

function updateQuickSummaryDOM() {
    const elements = {
        totalManholes: currentData.manholesCount,
        totalPipelines: currentData.pipelinesCount,
        totalComplaints: currentData.complaintsCount,
        totalBlockages: currentData.totalBlockages,
        avgBlockages: currentData.avgBlockages.toFixed(1),
        completedJobs: currentData.completedJobs,
        inProgressJobs: currentData.inProgressJobs,
        criticalAssets: currentData.criticalCount
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }
}

function updateRiskBar() {
    const riskBar = document.getElementById('riskDistributionBar');
    if (!riskBar) return;
    
    const total = currentData.manholesCount + currentData.pipelinesCount;
    const criticalPercent = total > 0 ? (currentData.criticalCount / total) * 100 : 0;
    const warningPercent = total > 0 ? (currentData.warningCount / total) * 100 : 0;
    const goodPercent = total > 0 ? (currentData.goodCount / total) * 100 : 0;
    
    riskBar.innerHTML = `
        <div style="display: flex; height: 20px; border-radius: 10px; overflow: hidden; margin-top: 8px;">
            <div style="width: ${criticalPercent}%; background: #dc3545; transition: width 0.3s;" title="🔴 Critical: ${currentData.criticalCount}"></div>
            <div style="width: ${warningPercent}%; background: #ffc107; transition: width 0.3s;" title="🟡 Warning: ${currentData.warningCount}"></div>
            <div style="width: ${goodPercent}%; background: linear-gradient(90deg, #9b59b6 0%, #9b59b6 50%, #32cd32 50%, #32cd32 100%); transition: width 0.3s;" title="🟣 Good Manholes / 🟢 Good Pipelines: ${currentData.goodCount}"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.6rem;">
            <span>🔴 Critical: ${currentData.criticalCount}</span>
            <span>🟡 Warning: ${currentData.warningCount}</span>
            <span>🟣🟢 Good: ${currentData.goodCount}</span>
        </div>
    `;
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function showMenu() {
    currentView = 'menu';
    const menuDiv = document.getElementById('menuView');
    const contentDiv = document.getElementById('contentView');
    const backButton = document.getElementById('backButton');
    
    if (menuDiv) menuDiv.style.display = 'block';
    if (contentDiv) contentDiv.style.display = 'none';
    if (backButton) backButton.style.display = 'none';
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

async function updateStatistics() {
    await updateFromAPI();
    console.log('Statistics updated:', currentData);
}

function getCurrentStatistics() {
    return currentData;
}

// ============================================
// RENDER HTML - COMPACT TABS
// ============================================

function render() {
    return `
        <div class="statistics-container">
            <!-- Back Button -->
            <div id="backButton" style="display: none; margin-bottom: 16px;">
                <button onclick="window.showMenu && window.showMenu()" style="
                    background: #1a472a;
                    color: #69f0ae;
                    border: 1px solid #2e7d32;
                    border-radius: 6px;
                    padding: 6px 12px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    ← BACK TO MENU
                </button>
            </div>
            
            <!-- Current View Title -->
            <div id="currentViewTitle" style="
                text-align: center;
                color: #69f0ae;
                font-size: 1.2rem;
                font-weight: bold;
                margin-bottom: 20px;
            "></div>
            
            <!-- MENU VIEW -->
            <div id="menuView">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #69f0ae; margin-bottom: 5px; font-size: 1.4rem;">📊 NETWORK INSIGHTS</h2>
                    <p style="color: #7cb342; font-size: 11px;">Select a category to view insights</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
                    <!-- Blockage Insights -->
                    <div onclick="window.showView && window.showView('blockages', '🚫 BLOCKAGE INSIGHTS BY SUBURB')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">🚫</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Blockage</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">By suburb</p>
                    </div>
                    
                    <!-- Jobs Insights -->
                    <div onclick="window.showView && window.showView('jobs', '📋 JOBS INSIGHTS BY TYPE')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">📋</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Jobs</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">By type</p>
                    </div>
                    
                    <!-- Complaints Insights -->
                    <div onclick="window.showView && window.showView('complaints', '✅ COMPLAINTS STATUS INSIGHTS')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">✅</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Complaints</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">Status</p>
                    </div>
                    
                    <!-- Asset Health Insights -->
                    <div onclick="window.showView && window.showView('asset', '🏭 ASSET HEALTH INSIGHTS')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">🏭</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Asset Health</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">Manholes & Pipelines</p>
                    </div>
                    
                    <!-- Quick Insights -->
                    <div onclick="window.showView && window.showView('summary', '📈 QUICK INSIGHTS')" style="
                        background: linear-gradient(135deg, #1a472a, #0d2818);
                        border: 1px solid #2e7d32;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: center;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="font-size: 28px; margin-bottom: 5px;">📈</div>
                        <h3 style="color: #69f0ae; margin-bottom: 3px; font-size: 13px;">Quick</h3>
                        <p style="color: #a5d6a7; font-size: 10px;">Summary stats</p>
                    </div>
                </div>
            </div>
            
            <!-- CONTENT VIEW (hidden by default) -->
            <div id="contentView" style="display: none;">
                <!-- BLOCKAGE VIEW -->
                <div id="blockagesView" style="display: none;">
                    <div class="chart-container">
                        <canvas id="suburbChart"></canvas>
                    </div>
                </div>
                
                <!-- JOBS VIEW -->
                <div id="jobsView" style="display: none;">
                    <div class="chart-container">
                        <canvas id="jobsChart"></canvas>
                    </div>
                </div>
                
                <!-- COMPLAINTS VIEW -->
                <div id="complaintsView" style="display: none;">
                    <div class="chart-container">
                        <canvas id="statusChart"></canvas>
                        <div style="text-align: center; margin-top: 12px;">
                            <span style="color: #28a745;">✓ Resolved: <span id="resolvedComplaints">0</span></span> | 
                            <span style="color: #ffc107;">⏳ Pending: <span id="pendingComplaints">0</span></span>
                        </div>
                    </div>
                </div>
                
                <!-- ASSET VIEW -->
                <div id="assetView" style="display: none;">
                    <div class="chart-container">
                        <p style="font-size: 0.6rem; color: #7cb342; margin-bottom: 8px;">
                            🟣 Manholes Normal = Purple | 🟢 Pipelines Normal = Lime Green
                        </p>
                        <canvas id="assetStatusChart"></canvas>
                        <div class="asset-status-details" style="display: flex; gap: 20px; justify-content: center; margin-top: 15px; flex-wrap: wrap;">
                            <div style="text-align: center;">
                                <strong style="color: #9b59b6;">🟣 MANHOLES</strong><br>
                                <span>🔴 Critical: <span id="manholesCritical">0</span></span><br>
                                <span>🟡 Warning: <span id="manholesWarning">0</span></span><br>
                                <span>🟣 Normal: <span id="manholesGood">0</span></span>
                            </div>
                            <div style="text-align: center;">
                                <strong style="color: #32cd32;">🟢 PIPELINES</strong><br>
                                <span>🔴 Critical: <span id="pipelinesCritical">0</span></span><br>
                                <span>🟡 Warning: <span id="pipelinesWarning">0</span></span><br>
                                <span>🟢 Normal: <span id="pipelinesGood">0</span></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- SUMMARY VIEW -->
                <div id="summaryView" style="display: none;">
                    <div class="chart-container">
                        <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalManholes" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Manholes</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalPipelines" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Pipelines</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalComplaints" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Complaints</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="totalBlockages" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Blockages</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="avgBlockages" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Avg/Asset</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="completedJobs" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Completed</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="inProgressJobs" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">In Progress</div>
                            </div>
                            <div class="summary-card" style="background: #0d2818; padding: 8px; border-radius: 6px; text-align: center;">
                                <div class="summary-value" id="criticalAssets" style="font-size: 1.3rem; font-weight: bold; color: #69f0ae;">0</div>
                                <div class="summary-label" style="font-size: 10px; color: #a5d6a7;">Critical</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 16px;">
                            <div style="font-size: 0.7rem; margin-bottom: 4px; font-weight: bold; color: #7cb342;">⚠️ ASSET RISK DISTRIBUTION</div>
                            <div id="riskDistributionBar"></div>
                            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.6rem;">
                                <span>🔴 Critical: <span id="criticalAssetsDetail">0</span></span>
                                <span>🟡 Warning: <span id="warningAssetsDetail">0</span></span>
                                <span>🟣🟢 Good: <span id="goodAssetsDetail">0</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    initCharts();
    await updateFromAPI();
    
    // Expose functions to global scope
    window.showMenu = showMenu;
    window.showView = (viewName, viewTitle) => {
        // Hide all views
        const views = ['blockagesView', 'jobsView', 'complaintsView', 'assetView', 'summaryView'];
        views.forEach(view => {
            const el = document.getElementById(view);
            if (el) el.style.display = 'none';
        });
        
        // Show selected view
        const selectedView = document.getElementById(`${viewName}View`);
        if (selectedView) selectedView.style.display = 'block';
        
        // Update UI
        const menuDiv = document.getElementById('menuView');
        const contentDiv = document.getElementById('contentView');
        const backButton = document.getElementById('backButton');
        const viewTitleEl = document.getElementById('currentViewTitle');
        
        if (menuDiv) menuDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'block';
        if (backButton) backButton.style.display = 'flex';
        if (viewTitleEl) viewTitleEl.innerHTML = viewTitle;
        
        // Refresh charts
        if (suburbChart) suburbChart.update();
        if (jobsChart) jobsChart.update();
        if (statusChart) statusChart.update();
        if (assetStatusChart) assetStatusChart.update();
    };
    
    document.addEventListener('reportProcessed', () => {
        updateFromAPI();
    });
    
    document.addEventListener('layerToggled', () => {
        updateFromAPI();
    });
    
    document.addEventListener('dataRefreshed', () => {
        updateFromAPI();
    });
    
    document.addEventListener('assetStatusChanged', () => {
        updateFromAPI();
    });
    
    setInterval(() => {
        updateFromAPI();
    }, 300000);
    
    console.log('Statistics component initialized');
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
