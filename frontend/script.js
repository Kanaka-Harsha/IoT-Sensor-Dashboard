// =========================================================
// SCHOOLENV COCKPIT DASHBOARD (100VH REAL-TIME ENGINE)
// =========================================================

// Configurable API Base URL (Auto-detects localhost vs ngrok)
const API_BASE_URL = window.API_BASE_URL || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:5000"
        : "https://casually-override-childlike.ngrok-free.dev"
);

// Default fetch headers
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
    pi4Temp: null,
    pi4Humidity: null,
    pi4Pressure: null,
    pi4Gas: null,
    washroomGas: null,
    washroomSmell: null,
    washroomVoc: null,
    washroomEco2: null
};

// Per-node latest timestamps
let nodeTimestamps = {
    air: null,
    water: null,
    pi4: null,
    washroom: null
};


// ==========================================
// TOAST NOTIFICATION POPUP SYSTEM
// ==========================================
function showToast(type, title, message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-popup toast-${type}`;

    const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ️";

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}


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
// TIMESTAMP DISPLAY HELPERS
// ==========================================
function formatNodeTimestamp(isoStr) {
    if (!isoStr) return "Last: --";
    try {
        const d = new Date(isoStr);
        return "Last: " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return "Last: " + isoStr;
    }
}

function updateNodeTimestamps() {
    const airTs = document.getElementById("airTimestamp");
    if (airTs) airTs.textContent = "⏱️ " + formatNodeTimestamp(nodeTimestamps.air);

    const waterTs = document.getElementById("waterTimestamp");
    if (waterTs) waterTs.textContent = "⏱️ " + formatNodeTimestamp(nodeTimestamps.water);

    const pi4Ts = document.getElementById("pi4Timestamp");
    if (pi4Ts) pi4Ts.textContent = "⏱️ " + formatNodeTimestamp(nodeTimestamps.pi4);

    const washroomTs = document.getElementById("washroomTimestamp");
    if (washroomTs) washroomTs.textContent = "⏱️ " + formatNodeTimestamp(nodeTimestamps.washroom);
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

    // Raspberry Pi 4 Suite
    if (document.getElementById("pi4Temp")) {
        document.getElementById("pi4Temp").textContent = sensorData.pi4Temp !== null ? Number(sensorData.pi4Temp).toFixed(1) : "--";
    }
    if (document.getElementById("pi4Humidity")) {
        document.getElementById("pi4Humidity").textContent = sensorData.pi4Humidity !== null ? Number(sensorData.pi4Humidity).toFixed(1) : "--";
    }
    if (document.getElementById("pi4Pressure")) {
        document.getElementById("pi4Pressure").textContent = sensorData.pi4Pressure !== null ? Number(sensorData.pi4Pressure).toFixed(1) : "--";
    }
    if (document.getElementById("pi4Gas")) {
        if (sensorData.pi4Gas !== null) {
            const numGas = Number(sensorData.pi4Gas);
            if (!isNaN(numGas)) {
                document.getElementById("pi4Gas").textContent = numGas >= 1000 ? (numGas / 1000).toFixed(1) : Math.round(numGas);
            } else {
                document.getElementById("pi4Gas").textContent = sensorData.pi4Gas;
            }
        } else {
            document.getElementById("pi4Gas").textContent = "--";
        }
    }

    // Washroom Hygiene
    if (document.getElementById("washroomGas")) {
        document.getElementById("washroomGas").textContent = sensorData.washroomGas !== null ? Number(sensorData.washroomGas).toFixed(0) : "--";
    }
    if (document.getElementById("washroomSmell")) {
        document.getElementById("washroomSmell").textContent = sensorData.washroomSmell !== null ? Number(sensorData.washroomSmell).toFixed(1) : "--";
    }
    if (document.getElementById("washroomVoc")) {
        document.getElementById("washroomVoc").textContent = sensorData.washroomVoc !== null ? Math.round(Number(sensorData.washroomVoc)) : "--";
    }
    if (document.getElementById("washroomEco2")) {
        document.getElementById("washroomEco2").textContent = sensorData.washroomEco2 !== null ? Math.round(Number(sensorData.washroomEco2)) : "--";
    }

    // Progress Bars — Air
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

    // Progress Bars — Water
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

    // Pi 4 Telemetry Bars
    if (sensorData.pi4Temp !== null && document.getElementById("pi4TempBar")) {
        const t = Number(sensorData.pi4Temp);
        if (!isNaN(t)) document.getElementById("pi4TempBar").style.width = Math.min(t / 80 * 100, 100) + "%";
    }
    if (sensorData.pi4Humidity !== null && document.getElementById("pi4HumidityBar")) {
        const h = Number(sensorData.pi4Humidity);
        if (!isNaN(h)) document.getElementById("pi4HumidityBar").style.width = Math.min(h, 100) + "%";
    }
    if (sensorData.pi4Pressure !== null && document.getElementById("pi4PressureBar")) {
        const p = Number(sensorData.pi4Pressure);
        if (!isNaN(p)) document.getElementById("pi4PressureBar").style.width = Math.max(0, Math.min((p - 950) / 100 * 100, 100)) + "%";
    }
    if (sensorData.pi4Gas !== null && document.getElementById("pi4GasBar")) {
        const g = Number(sensorData.pi4Gas);
        if (!isNaN(g)) document.getElementById("pi4GasBar").style.width = Math.min(g / 100000 * 100, 100) + "%";
    }

    // Washroom Bars
    if (sensorData.washroomGas !== null && document.getElementById("washroomGasBar")) {
        const g = Number(sensorData.washroomGas);
        if (!isNaN(g)) document.getElementById("washroomGasBar").style.width = Math.min(g / 500 * 100, 100) + "%";
    }
    if (sensorData.washroomSmell !== null && document.getElementById("washroomSmellBar")) {
        const s = Number(sensorData.washroomSmell);
        if (!isNaN(s)) document.getElementById("washroomSmellBar").style.width = Math.min(s / 10 * 100, 100) + "%";
    }
    if (sensorData.washroomVoc !== null && document.getElementById("washroomVocBar")) {
        const v = Number(sensorData.washroomVoc);
        if (!isNaN(v)) document.getElementById("washroomVocBar").style.width = Math.min(v / 500 * 100, 100) + "%";
    }
    if (sensorData.washroomEco2 !== null && document.getElementById("washroomEco2Bar")) {
        const e = Number(sensorData.washroomEco2);
        if (!isNaN(e)) document.getElementById("washroomEco2Bar").style.width = Math.min(e / 3000 * 100, 100) + "%";
    }

    // Update Status Labels — Air
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
        if (sensorData.ph >= 6.5 && sensorData.ph <= 8.5) setStatus("phStatus", "Optimal", "good");
        else setStatus("phStatus", "Check", "warning");
    }

    // Status Labels — Pi 4
    if (sensorData.pi4Temp !== null) {
        const t = Number(sensorData.pi4Temp);
        if (!isNaN(t)) {
            if (t < 60) setStatus("pi4TempStatus", "Active", "good");
            else if (t < 75) setStatus("pi4TempStatus", "Warm", "warning");
            else setStatus("pi4TempStatus", "Hot", "danger");
        }
    }
    if (sensorData.pi4Humidity !== null) {
        const h = Number(sensorData.pi4Humidity);
        if (!isNaN(h)) {
            if (h >= 30 && h <= 50) setStatus("pi4HumidityStatus", "Normal", "good");
            else setStatus("pi4HumidityStatus", "Check", "warning");
        }
    }
    if (sensorData.pi4Pressure !== null) {
        const p = Number(sensorData.pi4Pressure);
        if (!isNaN(p)) {
            if (p >= 1000 && p <= 1030) setStatus("pi4PressureStatus", "Normal", "good");
            else setStatus("pi4PressureStatus", "Notice", "warning");
        }
    }
    if (sensorData.pi4Gas !== null) {
        const g = Number(sensorData.pi4Gas);
        if (!isNaN(g)) {
            if (g >= 30000) setStatus("pi4GasStatus", "Optimal", "good");
            else if (g >= 10000) setStatus("pi4GasStatus", "Good", "good");
            else setStatus("pi4GasStatus", "Warning", "danger");
        }
    }

    // Status Labels — Washroom
    if (sensorData.washroomGas !== null) {
        const g = Number(sensorData.washroomGas);
        if (!isNaN(g)) {
            if (g < 100) setStatus("washroomGasStatus", "Clean", "good");
            else if (g < 300) setStatus("washroomGasStatus", "Elevated", "warning");
            else setStatus("washroomGasStatus", "High", "danger");
        }
    }
    if (sensorData.washroomSmell !== null) {
        const s = Number(sensorData.washroomSmell);
        if (!isNaN(s)) {
            if (s < 3) setStatus("washroomSmellStatus", "Fresh", "good");
            else if (s < 7) setStatus("washroomSmellStatus", "Noticeable", "warning");
            else setStatus("washroomSmellStatus", "Strong Odor", "danger");
        }
    }
    if (sensorData.washroomVoc !== null) {
        const v = Number(sensorData.washroomVoc);
        if (!isNaN(v)) {
            if (v < 50) setStatus("washroomVocStatus", "Good", "good");
            else if (v < 150) setStatus("washroomVocStatus", "Moderate", "warning");
            else setStatus("washroomVocStatus", "Unhealthy", "danger");
        }
    }
    if (sensorData.washroomEco2 !== null) {
        const e = Number(sensorData.washroomEco2);
        if (!isNaN(e)) {
            if (e < 1000) setStatus("washroomEco2Status", "Normal", "good");
            else if (e < 1500) setStatus("washroomEco2Status", "Elevated", "warning");
            else setStatus("washroomEco2Status", "High", "danger");
        }
    }

    // Update node timestamps
    updateNodeTimestamps();
}


// ==========================================
// CHART CONFIGURATION (Chart.js Inside Modal - Light Theme)
// ==========================================
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
        legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 10 }, color: "#475569" }
        }
    },
    scales: {
        x: { ticks: { font: { size: 9 }, color: "#64748b" }, grid: { display: false } },
        y: { ticks: { font: { size: 9 }, color: "#64748b" }, grid: { color: "#f1f5f9" } }
    }
};

// Chart Instances
let airChart, waterChart, pi4Chart, washroomChart;

function initCharts() {
    const airCtx = document.getElementById("airChart");
    if (airCtx && !airChart) {
        airChart = new Chart(airCtx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    { label: "CO₂ (ppm)", data: [], borderColor: "#3b82f6", borderWidth: 2, pointRadius: 2, tension: 0.35 },
                    { label: "Temp (°C)", data: [], borderColor: "#ef4444", borderWidth: 2, pointRadius: 2, tension: 0.35 }
                ]
            },
            options: chartOptions
        });
    }

    const waterCtx = document.getElementById("waterChart");
    if (waterCtx && !waterChart) {
        waterChart = new Chart(waterCtx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    { label: "pH", data: [], borderColor: "#06b6d4", borderWidth: 2, pointRadius: 2, tension: 0.35 },
                    { label: "TDS (ppm)", data: [], borderColor: "#8b5cf6", borderWidth: 2, pointRadius: 2, tension: 0.35 }
                ]
            },
            options: chartOptions
        });
    }

    const pi4Ctx = document.getElementById("pi4Chart");
    if (pi4Ctx && !pi4Chart) {
        pi4Chart = new Chart(pi4Ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    { label: "Pi 4 Temp (°C)", data: [], borderColor: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.1)", fill: true, borderWidth: 2, pointRadius: 2, tension: 0.35 }
                ]
            },
            options: chartOptions
        });
    }

    const washroomCtx = document.getElementById("washroomChart");
    if (washroomCtx && !washroomChart) {
        washroomChart = new Chart(washroomCtx, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    { label: "VOC AQI", data: [], borderColor: "#f59e0b", borderWidth: 2, pointRadius: 2, tension: 0.35 },
                    { label: "Eq. CO₂ (ppm)", data: [], borderColor: "#a855f7", borderWidth: 2, pointRadius: 2, tension: 0.35 }
                ]
            },
            options: chartOptions
        });
    }
}


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
            const washroom = resData.washroom_hygiene || {};

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

            // Update Pi 4 Telemetry State
            if (pi4.temperature_c !== undefined) sensorData.pi4Temp = pi4.temperature_c;
            else if (pi4.temp !== undefined) sensorData.pi4Temp = pi4.temp;

            if (pi4.humidity !== undefined) sensorData.pi4Humidity = pi4.humidity;
            if (pi4.pressure !== undefined) sensorData.pi4Pressure = pi4.pressure;
            if (pi4.gas_resistance !== undefined) sensorData.pi4Gas = pi4.gas_resistance;

            // Update Washroom Hygiene State
            if (washroom.gas !== undefined) sensorData.washroomGas = washroom.gas;
            if (washroom.smell !== undefined) sensorData.washroomSmell = washroom.smell;
            if (washroom.voc_aqi !== undefined) sensorData.washroomVoc = washroom.voc_aqi;
            if (washroom.eq_co2 !== undefined) sensorData.washroomEco2 = washroom.eq_co2;

            // Update per-node timestamps
            if (air.timestamp) nodeTimestamps.air = air.timestamp;
            if (water.timestamp) nodeTimestamps.water = water.timestamp;
            if (pi4.timestamp) nodeTimestamps.pi4 = pi4.timestamp;
            if (washroom.timestamp) nodeTimestamps.washroom = washroom.timestamp;

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
        initCharts();

        // Fetch Air Quality History
        if (airChart) {
            const airRes = await fetch(`${API_BASE_URL}/api/air-quality?limit=15`, { headers: FETCH_HEADERS });
            if (airRes.ok) {
                const airJson = await airRes.json();
                if (airJson.status === "success" && Array.isArray(airJson.data)) {
                    const rows = airJson.data.reverse();
                    airChart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    airChart.data.datasets[0].data = rows.map(r => r.co2);
                    airChart.data.datasets[1].data = rows.map(r => r.temperature_c);
                    airChart.update();
                }
            }
        }

        // Fetch Water Quality History
        if (waterChart) {
            const waterRes = await fetch(`${API_BASE_URL}/api/water-quality?limit=15`, { headers: FETCH_HEADERS });
            if (waterRes.ok) {
                const waterJson = await waterRes.json();
                if (waterJson.status === "success" && Array.isArray(waterJson.data)) {
                    const rows = waterJson.data.reverse();
                    waterChart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    waterChart.data.datasets[0].data = rows.map(r => r.ph);
                    waterChart.data.datasets[1].data = rows.map(r => r.tds_ppm);
                    waterChart.update();
                }
            }
        }

        // Fetch Pi 4 Temperature History
        if (pi4Chart) {
            const pi4Res = await fetch(`${API_BASE_URL}/api/pi4/temperature?limit=15`, { headers: FETCH_HEADERS });
            if (pi4Res.ok) {
                const pi4Json = await pi4Res.json();
                if (pi4Json.status === "success" && Array.isArray(pi4Json.data)) {
                    const rows = pi4Json.data.reverse();
                    pi4Chart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    pi4Chart.data.datasets[0].data = rows.map(r => r.temperature_c);
                    pi4Chart.update();
                }
            }
        }

        // Fetch Washroom Hygiene History
        if (washroomChart) {
            const washroomRes = await fetch(`${API_BASE_URL}/api/washroom/hygiene?limit=15`, { headers: FETCH_HEADERS });
            if (washroomRes.ok) {
                const washroomJson = await washroomRes.json();
                if (washroomJson.status === "success" && Array.isArray(washroomJson.data)) {
                    const rows = washroomJson.data.reverse();
                    washroomChart.data.labels = rows.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    washroomChart.data.datasets[0].data = rows.map(r => Number(r.voc_aqi) || 0);
                    washroomChart.data.datasets[1].data = rows.map(r => Number(r.eq_co2) || 0);
                    washroomChart.update();
                }
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
                const activeCount = (counts.water_quality > 0 ? 1 : 0) + (counts.air_quality > 0 ? 1 : 0) + (counts.pi4_temperature > 0 ? 1 : 0) + (counts.washroom_hygiene > 0 ? 1 : 0);
                const activeElem = document.getElementById("activeTablesCount");
                if (activeElem) activeElem.textContent = `${activeCount} / 4 Nodes Active`;
            }
        }
    } catch (err) {
        console.warn("Health check failed:", err);
    }
}

function updateConnectionStatus(isOnline) {
    const textElem = document.getElementById("connectionStatusText");
    const dotElem = document.getElementById("systemDot");

    if (isOnline) {
        if (textElem) { textElem.textContent = "● Online"; textElem.style.color = "#22c55e"; }
        if (dotElem) { dotElem.style.background = "#22c55e"; dotElem.style.boxShadow = "0 0 8px #22c55e"; }
    } else {
        if (textElem) { textElem.textContent = "● Offline"; textElem.style.color = "#ef4444"; }
        if (dotElem) { dotElem.style.background = "#ef4444"; dotElem.style.boxShadow = "0 0 8px #ef4444"; }
    }

    const lastElem = document.getElementById("lastUpdate");
    if (lastElem) {
        lastElem.textContent = "Updated: " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}


// ==========================================
// STUDENT HEALTH IMPACT & CLASSROOM TARGET REGISTRY
// ==========================================
const HEALTH_IMPACT_DATA = {
    co2: {
        name: "Carbon Dioxide (CO₂)",
        subtitle: "Indoor Air Quality & Ventilation",
        icon: "🫁",
        ideal: "400 – 800 ppm (Optimal for memory focus)",
        harm: "Excess CO₂ (>1000-1200 ppm) leads to drowsiness, lethargy, reduced attention span, headaches, and lower academic test performance in students."
    },
    pm25: {
        name: "PM2.5 Fine Particulates",
        subtitle: "Microscopic Inhalable Particles",
        icon: "💨",
        ideal: "< 12 µg/m³ (WHO Classroom Target)",
        harm: "Inhaled deep into young lungs; causes asthma flare-ups, airway inflammation, coughing, fatigue, and decreased lung function."
    },
    pm10: {
        name: "PM10 Coarse Particulates",
        subtitle: "Dust, Pollen & Mold Spores",
        icon: "🌫️",
        ideal: "< 45 µg/m³ (Safe Ambient Limit)",
        harm: "Irritates eyes, nose, and throat; triggers allergic reactions, sneezing, and respiratory irritation during school activities."
    },
    voc: {
        name: "Air Quality Index / VOCs",
        subtitle: "Volatile Organic Compounds",
        icon: "🍃",
        ideal: "0 – 50 Index (Good Air Quality)",
        harm: "Off-gassing from markers, paints, and cleaners causes dizziness, nausea, eye strain, and impaired cognitive concentration."
    },
    airTemp: {
        name: "Classroom Air Temperature",
        subtitle: "Thermal Comfort & Climate Control",
        icon: "🌡️",
        ideal: "20°C – 23°C (68°F – 74°F)",
        harm: "Excessive heat (>40°C critical limit) causes severe heat stress, dehydration, lethargy, decreased memory retention, and fainting risks."
    },
    humidity: {
        name: "Relative Air Humidity",
        subtitle: "Classroom Moisture Level",
        icon: "💧",
        ideal: "30% – 50% Relative Humidity",
        harm: "High humidity (>60%) breeds indoor mold spores & dust mites (allergies); low humidity (<30%) causes dry mucosa, skin itch, & virus survival."
    },
    ph: {
        name: "Drinking Water pH",
        subtitle: "Acidity / Alkalinity Balance",
        icon: "🧪",
        ideal: "6.5 – 8.5 pH (Safe Potable Range)",
        harm: "Acidic (<6.5) or alkaline (>8.5) water causes stomach discomfort, mouth/throat irritation, and heavy metal corrosion in school pipes."
    },
    tds: {
        name: "Total Dissolved Solids (TDS)",
        subtitle: "Drinking Water Mineral Level",
        icon: "💧",
        ideal: "< 300 ppm (Fresh Drinking Water)",
        harm: "Elevated dissolved minerals (>500 ppm) produce an unpalatable metallic taste, kidney strain, and gastrointestinal upset in children."
    },
    turbidity: {
        name: "Water Turbidity",
        subtitle: "Water Clarity & Sediment",
        icon: "🌊",
        ideal: "< 1.0 NTU (Crystal Clear)",
        harm: "Cloudy water indicates sediment or potential microbial pathogens, carrying risks of bacterial gastroenteritis and stomach illness."
    },
    pi4Temp: {
        name: "Pi 4 Monitoring Node Temp",
        subtitle: "Telemetry Hardware Status",
        icon: "🥧",
        ideal: "< 60°C (Normal Operating Temp)",
        harm: "Overheating (>75°C) risks telemetry node crashes, disabling continuous environmental & safety alerts for the classroom."
    },
    pi4Humidity: {
        name: "Pi 4 Node Moisture Level",
        subtitle: "BME Sensor Relative Humidity",
        icon: "💧",
        ideal: "30% – 50% Relative Humidity",
        harm: "Low humidity (<30%) causes throat dryness & skin itch; high humidity (>60%) triggers indoor mold spores and dust mites."
    },
    pi4Pressure: {
        name: "Barometric Air Pressure",
        subtitle: "Atmospheric Barometer Sensor",
        icon: "⏲️",
        ideal: "1005 – 1025 hPa (Standard Sea Level)",
        harm: "Rapid atmospheric pressure drops trigger severe migraines, headaches, sinus pain, and lethargy in sensitive students."
    },
    pi4Gas: {
        name: "Gas Resistance (VOC Air)",
        subtitle: "Volatile Organic Chemical Sensor",
        icon: "🧪",
        ideal: "> 50 kΩ (High Resistance = Clean Air)",
        harm: "Low gas resistance (<10 kΩ) indicates airborne volatile chemicals, solvent vapors, or poor classroom ventilation causing dizziness and headaches."
    },
    washroomGas: {
        name: "Washroom Gas Sensor",
        subtitle: "Airborne Contaminant Detector",
        icon: "🚽",
        ideal: "< 100 raw (Clean Washroom Air)",
        harm: "High gas readings indicate sewer gas leaks, chemical fumes, or biological contaminants posing respiratory hazards and infection risk to students."
    },
    washroomSmell: {
        name: "Washroom Smell / Odor Index",
        subtitle: "Hygiene Odor Intensity",
        icon: "👃",
        ideal: "< 3 index (Neutral / No Odor)",
        harm: "Strong odor (>7) signals washroom hygiene failure — blocked drains, stagnant water, or bacterial growth causing nausea and gag reflex in students."
    },
    washroomVoc: {
        name: "Washroom VOC Air Quality",
        subtitle: "Volatile Organic Compound AQI",
        icon: "🍃",
        ideal: "< 50 AQI (Good Air Quality)",
        harm: "Elevated VOCs from cleaning chemicals, disinfectants, or mold release cause headaches, dizziness, and mucous membrane irritation."
    },
    washroomEco2: {
        name: "Washroom Equivalent CO₂",
        subtitle: "Ventilation Quality Indicator",
        icon: "🫁",
        ideal: "< 1000 ppm (Well-Ventilated)",
        harm: "High eCO₂ (>1500 ppm) indicates critically poor ventilation — causes drowsiness, nausea, and headaches. Prolonged exposure affects cognitive function."
    }
};


// ==========================================
// TOOLTIP HOVER HANDLER
// ==========================================
function initHealthImpactTooltips() {
    const tooltip = document.getElementById("healthImpactTooltip");
    const iconElem = document.getElementById("tooltipIcon");
    const titleElem = document.getElementById("tooltipTitle");
    const subtitleElem = document.getElementById("tooltipSubtitle");
    const idealElem = document.getElementById("tooltipIdeal");
    const harmElem = document.getElementById("tooltipHarmText");

    if (!tooltip) return;

    const sensorCards = document.querySelectorAll("[data-sensor-type]");

    sensorCards.forEach(card => {
        card.addEventListener("mouseenter", (e) => {
            const type = card.getAttribute("data-sensor-type");
            const info = HEALTH_IMPACT_DATA[type];

            if (!info) return;

            if (iconElem) iconElem.textContent = info.icon;
            if (titleElem) titleElem.textContent = info.name;
            if (subtitleElem) subtitleElem.textContent = info.subtitle;
            if (idealElem) idealElem.textContent = info.ideal;
            if (harmElem) harmElem.textContent = info.harm;

            tooltip.classList.remove("hidden");
            positionTooltip(e);
        });

        card.addEventListener("mousemove", (e) => {
            positionTooltip(e);
        });

        card.addEventListener("mouseleave", () => {
            tooltip.classList.add("hidden");
        });
    });

    function positionTooltip(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const tooltipWidth = tooltip.offsetWidth || 320;
        const tooltipHeight = tooltip.offsetHeight || 220;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = mouseX + 16;
        let top = mouseY + 16;

        if (left + tooltipWidth > windowWidth - 16) {
            left = mouseX - tooltipWidth - 16;
        }

        if (top + tooltipHeight > windowHeight - 16) {
            top = mouseY - tooltipHeight - 16;
        }

        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
    }
}


// ==========================================
// MODAL CONTROLLERS
// ==========================================
function initModals() {
    // Analytics Modal
    const btnOpenAnalytics = document.getElementById("btnOpenAnalytics");
    const btnCloseAnalytics = document.getElementById("btnCloseAnalytics");
    const analyticsModal = document.getElementById("analyticsModal");

    if (btnOpenAnalytics && analyticsModal) {
        btnOpenAnalytics.addEventListener("click", () => {
            analyticsModal.classList.remove("hidden");
            fetchHistoricalTrends();
            // Trigger Chart.js resize once modal is displayed
            setTimeout(() => {
                if (airChart) airChart.resize();
                if (waterChart) waterChart.resize();
                if (pi4Chart) pi4Chart.resize();
                if (washroomChart) washroomChart.resize();
            }, 100);
        });
    }

    if (btnCloseAnalytics && analyticsModal) {
        btnCloseAnalytics.addEventListener("click", () => {
            analyticsModal.classList.add("hidden");
        });
    }

    // Email Settings Modal
    const btnOpenEmail = document.getElementById("btnOpenEmailAlerts");
    const btnCloseEmail = document.getElementById("btnCloseEmail");
    const emailModal = document.getElementById("emailModal");

    if (btnOpenEmail && emailModal) {
        btnOpenEmail.addEventListener("click", () => {
            emailModal.classList.remove("hidden");
            fetchSmtpStatus();
        });
    }

    if (btnCloseEmail && emailModal) {
        btnCloseEmail.addEventListener("click", () => {
            emailModal.classList.add("hidden");
        });
    }

    // Close on backdrop click
    [analyticsModal, emailModal].forEach(modal => {
        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.classList.add("hidden");
                }
            });
        }
    });
}


// ==========================================
// SMTP EMAIL ALERT STATUS & RECIPIENT UPDATE
// ==========================================
async function fetchSmtpStatus() {
    const badge = document.getElementById("smtpStatusBadge");
    const modalTag = document.getElementById("smtpModalTag");
    const recipientDisplay = document.getElementById("currentRecipientDisplay");

    try {
        const res = await fetch(`${API_BASE_URL}/api/alerts/status`, { headers: FETCH_HEADERS });
        if (res.ok) {
            const data = await res.json();
            if (data.is_configured) {
                if (badge) { badge.textContent = "Active"; badge.style.background = "#22c55e"; }
                if (modalTag) { modalTag.textContent = "● SMTP Active"; modalTag.style.background = "rgba(34, 197, 94, 0.2)"; modalTag.style.color = "#4ade80"; }
            } else {
                if (badge) { badge.textContent = ".env Required"; badge.style.background = "#f59e0b"; }
                if (modalTag) { modalTag.textContent = "● Needs .env Config"; modalTag.style.background = "rgba(245, 158, 11, 0.2)"; modalTag.style.color = "#fbbf24"; }
            }

            // Show configured recipient
            if (recipientDisplay) {
                recipientDisplay.textContent = data.recipient_emails && data.recipient_emails.length > 0
                    ? data.recipient_emails.join(", ")
                    : "None configured";
            }
        }
    } catch (err) {
        if (badge) { badge.textContent = "Standby"; badge.style.background = "#64748b"; }
    }
}

function initEmailAlertSystem() {
    const btnUpdate = document.getElementById("btnUpdateRecipient");
    const inputEmail = document.getElementById("alertRecipientInput");
    const feedbackElem = document.getElementById("emailConfigFeedback");

    if (!btnUpdate) return;

    btnUpdate.addEventListener("click", async () => {
        const targetEmail = inputEmail ? inputEmail.value.trim() : "";

        if (!targetEmail || !targetEmail.includes("@")) {
            if (feedbackElem) {
                feedbackElem.innerHTML = "❌ Please enter a valid email address.";
                feedbackElem.style.color = "#ef4444";
            }
            showToast("error", "Invalid Email", "Please enter a valid email address.");
            return;
        }

        btnUpdate.disabled = true;
        btnUpdate.innerHTML = "<span>Updating...</span>";

        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts/update-recipient`, {
                method: "POST",
                headers: FETCH_HEADERS,
                body: JSON.stringify({ email: targetEmail })
            });

            const data = await res.json();

            if (res.ok && data.status === "success") {
                if (feedbackElem) {
                    feedbackElem.innerHTML = `✓ ${data.message}`;
                    feedbackElem.style.color = "#4ade80";
                }
                showToast("success", "Recipient Updated", `Real-time alerts will now be sent to ${targetEmail}`);
                if (inputEmail) inputEmail.value = "";
            } else {
                if (feedbackElem) {
                    feedbackElem.innerHTML = `❌ ${data.message || "Failed to update recipient."}`;
                    feedbackElem.style.color = "#ef4444";
                }
                showToast("error", "Update Failed", data.message || "Could not update recipient.");
            }
        } catch (err) {
            if (feedbackElem) {
                feedbackElem.innerHTML = `❌ Error: Could not reach backend server at ${API_BASE_URL}.`;
                feedbackElem.style.color = "#ef4444";
            }
            showToast("error", "Connection Error", "Could not reach backend server.");
        } finally {
            btnUpdate.disabled = false;
            btnUpdate.innerHTML = "<span>Update Recipient</span>";
            fetchSmtpStatus();
        }
    });
}


// ==========================================
// MAIN POLLING LOOP & INIT
// ==========================================
async function refreshDashboard() {
    await fetchLatestReadings();
    await fetchHealth();
    await fetchSmtpStatus();

    // If analytics modal is visible, refresh charts
    const analyticsModal = document.getElementById("analyticsModal");
    if (analyticsModal && !analyticsModal.classList.contains("hidden")) {
        await fetchHistoricalTrends();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initHealthImpactTooltips();
    initModals();
    initEmailAlertSystem();
});

// Initial Setup
initHealthImpactTooltips();
initModals();
initEmailAlertSystem();

// Initial Fetch
refreshDashboard();

// Poll every 5 seconds
setInterval(refreshDashboard, 5000);