// components/header.js - Dashboard Header with City of Mutare Logo

export default {
    render() {
        return `
            <div class="panel-header">
                <div class="logo-container">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Mutare_City_logo_2023.png" 
                         alt="City of Mutare Logo" 
                         class="city-logo"
                         onerror="this.onerror=null; this.src='https://placehold.co/60x60/228B22/white?text=MUTARE'">
                    <div class="logo-text">
                        <h1>CITY OF MUTARE</h1>
                        <p>WASTEWATER MANAGEMENT SYSTEM</p>
                    </div>
                </div>
            </div>
        `;
    }
};
