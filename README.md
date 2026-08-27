# EnviroSense - IoT Sensor & Environmental Dashboard

**EnviroSense** is an end-to-end real-time IoT monitoring system designed to measure and visualize **Air Quality**, **Water Quality**, and **Raspberry Pi 4 System Telemetry**. It features an event-driven PostgreSQL & Flask backend, live data visualization using Chart.js, and a modern web dashboard ready for deployment on Vercel.

---

## 🏗️ System Architecture

```text
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     ESP32 Air Node        │      │    ESP32 Water Node       │      │   Raspberry Pi 4 Node     │
│  (SHT4x, SGP40, S88 CO2)  │      │  (pH, TDS, Turbidity)     │      │   (System/CPU Temp)       │
└─────────────┬─────────────┘      └─────────────┬─────────────┘      └─────────────┬─────────────┘
              │ (HTTP POST)                      │ (HTTP POST)                      │ (HTTP POST)
              └────────────────────────┬─────────┴──────────────────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Flask Backend API (Port 5000)  │
                     │    (ngrok exposed for remote)     │
                     └─────────────────┬─────────────────┘
                                       │ (psycopg2)
                                       ▼
                     ┌───────────────────────────────────┐
                     │      PostgreSQL Database          │
                     │ (air_quality, water_quality, etc) │
                     └─────────────────┬─────────────────┘
                                       │ (HTTP GET JSON API)
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Vercel Frontend Dashboard      │
                     │    (HTML5, CSS3, JS, Chart.js)    │
                     └───────────────────────────────────┘
```

---

## ✨ Features

- **💨 Air Quality Monitoring**: Real-time measurements for CO₂ (ppm), PM2.5 (µg/m³), PM10 (µg/m³), AQI / VOC Index, Air Temperature (°C), and Relative Humidity (%).
- **💧 Water Quality Monitoring**: Live tracking of pH balance, Total Dissolved Solids (TDS in ppm), and Water Turbidity (NTU/raw).
- **🥧 Raspberry Pi 4 Telemetry**: Dedicated endpoint & dashboard telemetry for monitoring Pi 4 CPU and sensor temperatures.
- **📈 Interactive Live Charts**: Real-time line graphs (Chart.js) rendering historical sensor trends.
- **🏥 System Health & Status**: Auto-checking backend connectivity, active database row counts, and status indicators.
- **🌐 Remote Deployment Ready**: Pre-configured for hosting the frontend on Vercel and tunneling the local Flask backend via ngrok.

---

## 📂 Repository Structure

```text
IoT-Sensor-Dashboard/
├── backend/
│   ├── app.py              # Flask REST API server (Ingestion & Retrieval)
│   ├── db.py               # PostgreSQL connection & raw SQL table migrations
│   └── test_api.py         # Automated Python unittest suite
├── frontend/
│   ├── index.html          # Dashboard UI markup & sensor cards
│   ├── script.js           # Real-time backend fetch logic & Chart.js renderer
│   └── style.css           # Modern dark sidebar & responsive dashboard theme
├── Air_Node/
│   └── Air_Node.ino        # ESP32 C++ code for SHT4x, SGP40, and S88 CO2 sensors
├── Water_Node/
│   └── Water_Node.ino      # ESP32 C++ code for pH, TDS, and Turbidity sensors
├── Pi4_Node/
│   └── send_temp.py        # Python telemetry sender script for Raspberry Pi 4
├── .env.example            # Environment variables template
├── requirements.txt        # Python backend dependencies
└── README.md               # Project documentation
```

---

## 🛰️ API Endpoint Reference

### Ingestion Endpoints (POST)

| Endpoint | Target Device | Method | Payload Example |
| :--- | :--- | :---: | :--- |
| `/api/air-quality` | ESP32 Air Node | `POST` | `{"temperature_c": 28.1, "humidity": 64.5, "co2": 412, "aqi": 55}` |
| `/api/water-quality` | ESP32 Water Node | `POST` | `{"ph": 7.02, "tds_ppm": 345.8, "turbidity": 2850}` |
| `/api/pi4/temperature` | Raspberry Pi 4 | `POST` | `{"temperature": 25.4}` |

### Frontend Retrieval Endpoints (GET)

| Endpoint | Method | Description | Example Response |
| :--- | :---: | :--- | :--- |
| `/api/latest` | `GET` | Returns latest reading across all 3 nodes | `{"status": "success", "air_quality": {...}, "water_quality": {...}, "pi4_temperature": {...}}` |
| `/api/air-quality` | `GET` | Historical air quality records (`limit`, `offset`) | `{"status": "success", "count": 10, "data": [...]}` |
| `/api/water-quality` | `GET` | Historical water quality records (`limit`, `offset`) | `{"status": "success", "count": 10, "data": [...]}` |
| `/api/pi4/temperature` | `GET` | Historical Pi 4 temperature records (`limit`, `offset`) | `{"status": "success", "count": 10, "data": [...]}` |
| `/api/health` | `GET` | System connectivity & DB table row counts | `{"status": "healthy", "database_connected": true, "table_counts": {...}}` |

---

## 🚀 Getting Started

### 1. Backend & Database Setup (PC)

1. **Install PostgreSQL** and create a database named `water_quality_data` (or set environment variables).
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables** (`.env`):
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=water_quality_data
   DATABASE_USER=postgres
   DATABASE_PASS=password123
   ```
4. **Run the Backend Server**:
   ```bash
   python backend/app.py
   ```
   *Tables (`water_quality`, `air_quality`, `pi4_temperature`) will automatically be created on startup.*

---

### 2. Raspberry Pi 4 Node Setup

1. Copy [Pi4_Node/send_temp.py](file:///c:/Users/harsh/Desktop/IoT-Sensor-Dashboard/Pi4_Node/send_temp.py) to your Raspberry Pi 4.
2. Install `requests`:
   ```bash
   pip3 install requests
   ```
3. Update `SERVER_HOST` in `send_temp.py` with your PC's IP or ngrok domain.
4. Run the sender script:
   ```bash
   python3 send_temp.py
   ```

---

### 3. ESP32 Sensor Nodes Setup

1. Open `Air_Node/Air_Node.ino` or `Water_Node/Water_Node.ino` in the Arduino IDE.
2. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_URL` (with your PC's local IP).
3. Upload to your ESP32 boards.

---

### 4. Remote Deployment (Vercel + ngrok)

1. **Expose Local Backend via ngrok**:
   ```cmd
   ngrok http 5000
   ```
2. **Deploy Frontend to Vercel**:
   - Push your repository to GitHub.
   - Import the project into Vercel, pointing to the `frontend/` directory.
   - In `script.js`, set `API_BASE_URL` to your ngrok URL (`https://<xxxx>.ngrok-free.dev`).

---

## 🧪 Testing

Run the automated test suite against your backend:
```bash
python -m unittest backend/test_api.py
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).