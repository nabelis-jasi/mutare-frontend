// components/header.js - With online logo placeholder

export default {
    render() {
        return `
            <div class="panel-header">
                <div class="logo-container">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Flag_of_Zimbabwe.svg/1200px-Flag_of_Zimbabwe.svg.png" 
                         alt="City of Mutare Logo" 
                         class="city-logo"
                         onerror="this.src='https://placehold.co/60x60/228B22/white?text=MUTARE'">
                    <div class="logo-text">
                        <h1>🏙️ CITY OF MUTARE</h1>
                        <p>WASTEWATER SYSTEM</p>
                    </div>
                </div>
            </div>
        `;
    }
};
