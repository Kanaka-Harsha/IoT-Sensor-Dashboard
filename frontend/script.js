// ==========================================
// ENVIROSENSE MONITORING DASHBOARD (REAL BACKEND)
// ==========================================

// Configurable API Base URL (Supports Vercel & Local ngrok)
const API_BASE_URL = window.API_BASE_URL || "https://casually-override-childlike.ngrok-free.dev";

// Default fetch headers (Bypasses ngrok free tier browser warning)
const FETCH_HEADERS = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "Accept": "application/json"
};

// State Object for Sensor Data
let sensorData = {
    co2: null,
    pm25: null,
    pm10: null,
    voc: null,
    airTemp: null,
    humidity: null,
    ph: null,
    tds: null,
    turbidity: null,
    pi4Temp: null
};

// ==========================================
// CLOCK
// ==========================================
function updateClock() {
    const now = new Date();
    const timeElem = document.getElementById("currentTime");
    if (timeElem) {
        timeElem.textContent = now.toLocaleTimeString();
    }
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// STATUS HELPERS
// ==========================================
function setStatus(elementId, text, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = "● " + text;
    element.className = "";
    element.classList.add(
        type === "good"
            ? "status-good"
            : type === "warning"
                ? "status-warning"
                : "status-danger"
    );
}

// ==========================================
// UPDATE SENSOR DOM VALUES & PROGRESS BARS
// ==========================================
function updateValues() {
    // Air Quality
    if (document.getElementById("co2")) {
        document.getElementById("co2").textContent = sensorData.co2 !== null ? Math.round(sensorData.co2) : "--";
    }
    if (document.getElementById("pm25")) {
        document.getElementById("pm25").textContent = sensorData.pm25 !== null ? sensorData.pm25.toFixed(1) : "--";
    }
    if (document.getElementById("pm10")) {
        document.getElementById("pm10").textContent = sensorData.pm10 !== null ? sensorData.pm10.toFixed(1) : "--";
    }
    if (document.getElementById("voc")) {
        document.getElementById("voc").textContent = sensorData.voc !== null ? Math.round(sensorData.voc) : "--";
    }
    if (document.getElementById("airTemp")) {
        document.getElementById("airTemp").textContent = sensorData.airTemp !== null ? sensorData.airTemp.toFixed(1) : "--";
    }
    if (document.getElementById("humidity")) {
        document.getElementById("humidity").textContent = sensorData.humidity !== null ? sensorData.humidity.toFixed(1) : "--";
    }

    // Water Quality
    if (document.getElementById("ph")) {
        document.getElementById("ph").textContent = sensorData.ph !== null ? sensorData.ph.toFixed(2) : "--";
    }
    if (document.getElementById("tds")) {
        document.getElementById("tds").textContent = sensorData.tds !== null ? Math.round(sensorData.tds) : "--";
    }
    if (document.getElementById("turbidity")) {
        document.getElementById("turbidity").textContent = sensorData.turbidity !== null ? sensorData.turbidity.toFixed(1) : "--";
    }

    // Raspberry Pi 4
    if (document.getElementById("pi4Temp")) {
        document.getElementById("pi4Temp").textContent = sensorData.pi4Temp !== null ? sensorData.pi4Temp.toFixed(1) : "--";
    }

    // Scores Overview
    if (document.getElementById("airScore")) {
        document.getElementById("airScore").textContent = sensorData.voc !== null ? Math.round(sensorData.voc) : (sensorData.co2 !== null ? Math.round(sensorData.co2) : "--");
    }
    if (document.getElementById("waterScore")) {
        document.getElementById("waterScore").textContent = sensorData.ph !== null ? sensorData.ph.toFixed(1) : "--";
    }
    if (document.getElementById("pi4Score")) {
        document.getElementById("pi4Score").textContent = sensorData.pi4Temp !== null ? sensorData.pi4Temp.toFixed(1) : "--";
    }

    // Progress Bars
    if (sensorData.co2 !== null && document.getElementById("co2Bar")) {
        document.getElementById("co2Bar").style.width = Math.min(sensorData.co2 / 2000 * 100, 100) + "%";
    }
    if (sensorData.pm25 !== null && document.getElementById("pmBar")) {
        document.getElementById("pmBar").style.width = Math.min(sensorData.pm25 / 50 * 100, 100) + "%";
    }
    if (sensorData.pm10 !== null && document.getElementById("pm10Bar")) {
        document.getElementById("pm10Bar").style.width = Math.min(sensorData.pm10 / 100 * 100, 100) + "%";
    }
    if (sensorData.voc !== null && document.getElementById("vocBar")) {
        document.getElementById("vocBar").style.width = Math.min(sensorData.voc / 500 * 100, 100) + "%";
    }
    if (sensorData.airTemp !== null && document.getElementById("airTempBar")) {
        document.getElementById("airTempBar").style.width = Math.min(sensorData.airTemp / 50 * 100, 100) + "%";
    }
    if (sensorData.humidity !== null && document.getElementById("humidityBar")) {
        document.getElementById("humidityBar").style.width = Math.min(sensorData.humidity, 100) + "%";
    }

    if (sensorData.tds !== null && document.getElementById("tdsBar")) {
        document.getElementById("tdsBar").style.width = Math.min(sensorData.tds / 1000 * 100, 100) + "%";
    }
    if (sensorData.turbidity !== null && document.getElementById("turbidityBar")) {
        document.getElementById("turbidityBar").style.width = Math.min(sensorData.turbidity / 10 * 100, 100) + "%";
    }

    // pH Indicator
    if (sensorData.ph !== null && document.getElementById("phIndicator")) {
        const phPosition = Math.max(0, Math.min(sensorData.ph / 14 * 100, 100));
        document.getElementById("phIndicator").style.left = phPosition + "%";
    }

    // Pi 4 Temp Bar
    if (sensorData.pi4Temp !== null && document.getElementById("pi4TempBar")) {
        document.getElementById("pi4TempBar").style.width = Math.min(sensorData.pi4Temp / 80 * 100, 100) + "%";
    }

    // Update Status Labels
    if (sensorData.co2 !== null) {
        if (sensorData.co2 < 1000) setStatus("co2Status", "Normal", "good");
        else if (sensorData.co2 < 1500) setStatus("co2Status", "Elevated", "warning");
        else setStatus("co2Status", "High", "danger");
    }

    if (sensorData.pm25 !== null) {
        if (sensorData.pm25 <= 35) setStatus("pmStatus", "Normal", "good");
        else setStatus("pmStatus", "Elevated", "warning");
    }

    if (sensorData.pm10 !== null) {
        if (sensorData.pm10 <= 50) setStatus("pm10Status", "Normal", "good");
        else setStatus("pm10Status", "Elevated", "warning");
    }

    if (sensorData.voc !== null) {
        if (sensorData.voc < 250) setStatus("vocStatus", "Good", "good");
        else setStatus("vocStatus", "Elevated", "warning");
    }

    if (sensorData.ph !== null) {
        if (sensorData.ph >= 6.5 && sensorData.ph <= 8.5) setStatus("phStatus", "Normal", "good");
        else setStatus("phStatus", "Check", "warning");
    }

    if (sensorData.pi4Temp !== null) {
        if (sensorData.pi4Temp < 60) setStatus("pi4TempStatus", "Normal", "good");
        else if (sensorData.pi4Temp < 75) setStatus("pi4TempStatus", "Warm", "warning");
        else setStatus("pi4TempStatus", "Hot", "danger");
    }
}

// ==========================================
// CHART CONFIGURATION (Chart.js)
// ==========================================
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
        legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 10 } }
        }
    },
    scales: {
        x: { ticks: { font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { font: { size: 9 } }, grid: { color: "#eef2f7" } }
    }
};

// Chart Instances
const airChart = new Chart(document.getElementById("airChart"), {
    type: "line",
    data: {
        labels: [],
        datasets: [
            { label: "CO₂ (ppm)", data: [], borderColor: "#2563eb", borderWidth: 2, pointRadius: 2, tension: 0.35 },
            { label: "Temp (°C)", data: [], borderColor: "#ef4444", borderWidth: 2, pointRadius: 2, tension: 0.35 }
        ]
    },
    options: chartOptions
});

const waterChart = new Chart(document.getElementById("waterChart"), {
    type: "line",
    data: {
        labels: [],
        datasets: [
            { label: "pH", data: [], borderColor: "#0891b2", borderWidth: 2, pointRadius: 2, tension: 0.35 },
            { label: "TDS (ppm)", data: [], borderColor: "#8b5cf6", borderWidth: 2, pointRadius: 2, tension: 0.35 }
        ]
    },
    options: chartOptions
});

const pi4Chart = new Chart(document.getElementById("pi4Chart"), {
    type: "line",
    data: {
        labels: [],
        datasets: [
            { label: "Pi 4 Temp (°C)", data: [], borderColor: "#16a34a", backgroundColor: "rgba(22, 163, 74, 0.1)", fill: true, borderWidth: 2, pointRadius: 2, tension: 0.35 }
        ]
    },
    options: chartOptions
});

// ==========================================
// BACKEND FETCH LOGIC
// ==========================================
async function fetchLatestReadings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/latest`, { headers: FETCH_HEADERS });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resData = await response.json();

        if (resData.status === "success") {
            const air = resData.air_quality || {};
            const water = resData.water_quality || {};
            const pi4 = resData.pi4_temperature || {};

            // Update Air Sensor State
            if (air.co2 !== undefined) sensorData.co2 = air.co2;
            if (air.pm25 !== undefined) sensorData.pm25 = air.pm25;
            if (air.pm10 !== undefined) sensorData.pm10 = air.pm10;
            if (air.aqi !== undefined) sensorData.voc = air.aqi;
            if (air.temperature_c !== undefined) sensorData.airTemp = air.temperature_c;
            if (air.humidity !== undefined) sensorData.humidity = air.humidity;

            // Update Water Sensor State
            if (water.ph !== undefined) sensorData.ph = water.ph;
            if (water.tds_ppm !== undefined) sensorData.tds = water.tds_ppm;
            if (water.turbidity !== undefined) sensorData.turbidity = water.turbidity;

            // Update Pi 4 Temp State
            if (pi4.temperature_c !== undefined) sensorData.pi4Temp = pi4.temperature_c;

            updateValues();
            updateConnectionStatus(true);
        }
    } catch (err) {
        console.warn("Could not fetch latest backend readings:", err);
        updateConnectionStatus(false);
    }
}

async function fetchHistoricalTrends() {
    try {
        // Fetch Air Quality History
        const airRes = await fetch(`${API_BASE_URL}/api/air-quality?limit=15`, { headers: FETCH_HEADERS });
        if (airRes.ok) {
            const airJson = await airRes.json();
            if (airJson.status === "success" && Array.isArray(airJson.data)) {
                const rows = airJson.data.reverse(); // Chronological order
                airChart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString());
                airChart.data.datasets[0].data = rows.map(r => r.co2);
                airChart.data.datasets[1].data = rows.map(r => r.temperature_c);
                airChart.update();
            }
        }

        // Fetch Water Quality History
        const waterRes = await fetch(`${API_BASE_URL}/api/water-quality?limit=15`, { headers: FETCH_HEADERS });
        if (waterRes.ok) {
            const waterJson = await waterRes.json();
            if (waterJson.status === "success" && Array.isArray(waterJson.data)) {
                const rows = waterJson.data.reverse();
                waterChart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString());
                waterChart.data.datasets[0].data = rows.map(r => r.ph);
                waterChart.data.datasets[1].data = rows.map(r => r.tds_ppm);
                waterChart.update();
            }
        }

        // Fetch Pi 4 Temperature History
        const pi4Res = await fetch(`${API_BASE_URL}/api/pi4/temperature?limit=15`, { headers: FETCH_HEADERS });
        if (pi4Res.ok) {
            const pi4Json = await pi4Res.json();
            if (pi4Json.status === "success" && Array.isArray(pi4Json.data)) {
                const rows = pi4Json.data.reverse();
                pi4Chart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString());
                pi4Chart.data.datasets[0].data = rows.map(r => r.temperature_c);
                pi4Chart.update();
            }
        }
    } catch (err) {
        console.warn("Could not fetch historical chart trends:", err);
    }
}

async function fetchHealth() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/health`, { headers: FETCH_HEADERS });
        if (res.ok) {
            const data = await res.json();
            if (data.status === "healthy" && data.table_counts) {
                const counts = data.table_counts;
                const activeCount = (counts.water_quality > 0 ? 1 : 0) + (counts.air_quality > 0 ? 1 : 0) + (counts.pi4_temperature > 0 ? 1 : 0);
                const activeElem = document.getElementById("activeTablesCount");
                if (activeElem) activeElem.textContent = `${activeCount} / 3 Active`;
            }
        }
    } catch (err) {
        console.warn("Health check failed:", err);
    }
}

function updateConnectionStatus(isOnline) {
    const textElem = document.getElementById("connectionStatusText");
    const dotElem = document.getElementById("systemDot");
    const subElem = document.getElementById("systemStatusSub");

    if (isOnline) {
        if (textElem) { textElem.textContent = "● Online"; textElem.className = "green"; }
        if (dotElem) { dotElem.style.background = "#22c55e"; dotElem.style.boxShadow = "0 0 8px #22c55e"; }
        if (subElem) { subElem.textContent = "Live backend link"; }
    } else {
        if (textElem) { textElem.textContent = "● Offline"; textElem.className = "status-danger"; }
        if (dotElem) { dotElem.style.background = "#ef4444"; dotElem.style.boxShadow = "0 0 8px #ef4444"; }
        if (subElem) { subElem.textContent = "Disconnected from backend"; }
    }

    const lastElem = document.getElementById("lastUpdate");
    if (lastElem) {
        lastElem.textContent = new Date().toLocaleTimeString();
    }
}

// ==========================================
// MAIN POLLING LOOP
// ==========================================
async function refreshDashboard() {
    await fetchLatestReadings();
    await fetchHistoricalTrends();
    await fetchHealth();
}

// Initial Fetch
refreshDashboard();

// Poll every 5 seconds
setInterval(refreshDashboard, 5000);