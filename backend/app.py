import os
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from db import init_db, execute_query
from email_alert import check_sensor_thresholds, send_email_alert, get_smtp_config, update_runtime_recipients

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("flask_app")

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for frontend access

# Initialize DB tables on startup
try:
    init_db()
except Exception as e:
    logger.error(f"Failed to initialize database on startup: {e}")


def format_timestamps(rows):
    """Utility to format datetime objects into ISO 8601 strings for JSON serialization."""
    if not rows:
        return []
    formatted = []
    for row in rows:
        item = dict(row)
        if isinstance(item.get("timestamp"), datetime):
            item["timestamp"] = item["timestamp"].isoformat()
        formatted.append(item)
    return formatted


# =====================================================
# INGESTION API: WATER QUALITY (ESP32 NODE 1)
# =====================================================

@app.route("/sensor-data", methods=["POST"])
@app.route("/api/water-quality", methods=["POST"])
def receive_water_sensor_data():
    data = request.get_json()

    if data is None:
        return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

    # Extract water sensor values: turbidity, pH, TDS (no temperature for water)
    turbidity = data.get("turbidity") if data.get("turbidity") is not None else data.get("turbidity_raw")
    ph_val = data.get("ph")
    tds_ppm_val = data.get("tds_ppm") if data.get("tds_ppm") is not None else data.get("tds")

    # Print received data to console
    print("\n========================================")
    print("      WATER SENSOR DATA RECEIVED")
    print("========================================")
    print("Time              :", datetime.now())
    print("Turbidity         :", turbidity if turbidity is not None else "N/A")
    print("pH                :", ph_val if ph_val is not None else "N/A")
    print("TDS               :", f"{tds_ppm_val} ppm" if tds_ppm_val is not None else "N/A")
    print("========================================")

    raw_insert_sql = """
        INSERT INTO water_quality (
            turbidity, ph, tds_ppm
        ) VALUES (%s, %s, %s)
        RETURNING id, timestamp;
    """

    try:
        inserted = execute_query(
            raw_insert_sql,
            (turbidity, ph_val, tds_ppm_val),
            fetchone=True,
            commit=True
        )

        # Evaluate thresholds for SMTP alerts
        try:
            check_sensor_thresholds("water", data)
        except Exception as alert_err:
            logger.error(f"Error checking water thresholds: {alert_err}")

        return jsonify({
            "status": "success",
            "message": "Water sensor data received and saved successfully",
            "inserted_id": inserted["id"],
            "timestamp": inserted["timestamp"].isoformat() if isinstance(inserted["timestamp"], datetime) else str(inserted["timestamp"])
        }), 200
    except Exception as e:
        logger.error(f"Failed to insert water sensor data: {e}")
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500


# =====================================================
# INGESTION API: AIR QUALITY (ESP32 NODE 2)
# =====================================================

@app.route("/air-quality-data", methods=["POST"])
@app.route("/api/air-quality", methods=["POST"])
def receive_air_sensor_data():
    data = request.get_json()

    if data is None:
        return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

    # Extract values with fallbacks for legacy/ESP32 payload keys
    temp_c = data.get("temperature_c")
    humidity = data.get("humidity") if data.get("humidity") is not None else data.get("humidity_pct")
    pm25 = data.get("pm25")
    pm10 = data.get("pm10")
    co2 = data.get("co2") if data.get("co2") is not None else data.get("co2_ppm")
    aqi = data.get("aqi") if data.get("aqi") is not None else data.get("voc_index")

    print("\n========================================")
    print("       AIR SENSOR DATA RECEIVED")
    print("========================================")
    print("Time              :", datetime.now())
    print("Temperature       :", temp_c, "°C")
    print("Humidity          :", humidity, "%")
    print("PM 2.5            :", pm25, "µg/m³")
    print("PM 10             :", pm10, "µg/m³")
    print("CO2               :", co2, "ppm")
    print("AQI / VOC Index   :", aqi)
    print("========================================")

    raw_insert_sql = """
        INSERT INTO air_quality (
            temperature_c, humidity, pm25, pm10, co2, aqi
        ) VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, timestamp;
    """

    try:
        inserted = execute_query(
            raw_insert_sql,
            (temp_c, humidity, pm25, pm10, co2, aqi),
            fetchone=True,
            commit=True
        )

        # Evaluate thresholds for SMTP alerts
        try:
            check_sensor_thresholds("air", data)
        except Exception as alert_err:
            logger.error(f"Error checking air thresholds: {alert_err}")

        return jsonify({
            "status": "success",
            "message": "Air sensor data received and saved successfully",
            "inserted_id": inserted["id"],
            "timestamp": inserted["timestamp"].isoformat() if isinstance(inserted["timestamp"], datetime) else str(inserted["timestamp"])
        }), 200
    except Exception as e:
        logger.error(f"Failed to insert air sensor data: {e}")
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500


# =====================================================
# INGESTION API: RASPBERRY PI 4 TEMPERATURE
# =====================================================

@app.route("/pi4-temperature-data", methods=["POST"])
@app.route("/api/pi4/temperature", methods=["POST"])
def receive_pi4_temperature_data():
    data = request.get_json()

    if data is None:
        return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

    # Extract Pi 4 sensor values with fallbacks for JSON keys: temp, humidity, pressure, gas_resistance
    temp_c = data.get("temp")
    if temp_c is None:
        temp_c = data.get("temperature_c")
    if temp_c is None:
        temp_c = data.get("temperature")

    humidity = data.get("humidity")
    if humidity is None:
        humidity = data.get("humidity_pct")

    pressure = data.get("pressure")
    if pressure is None:
        pressure = data.get("pressure_hpa")

    gas_res = data.get("gas_resistance")
    if gas_res is None:
        gas_res = data.get("gas")
    if gas_res is None:
        gas_res = data.get("gas_resistance_ohm")

    sender_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', 'Unknown')

    print("\n========================================")
    print("      PI 4 SENSOR DATA RECEIVED")
    print("========================================")
    print("Time              :", datetime.now())
    print("Sender IP         :", sender_ip)
    print("User-Agent        :", user_agent)
    print("Temperature       :", temp_c if temp_c is not None else "N/A", "°C")
    print("Humidity          :", humidity if humidity is not None else "N/A")
    print("Pressure          :", pressure if pressure is not None else "N/A")
    print("Gas Resistance    :", gas_res if gas_res is not None else "N/A")
    print("========================================")

    raw_insert_sql = """
        INSERT INTO pi4_temperature (
            temperature_c, humidity, pressure, gas_resistance
        ) VALUES (%s, %s, %s, %s)
        RETURNING id, timestamp;
    """

    try:
        inserted = execute_query(
            raw_insert_sql,
            (temp_c, str(humidity) if humidity is not None else None, str(pressure) if pressure is not None else None, str(gas_res) if gas_res is not None else None),
            fetchone=True,
            commit=True
        )

        # Evaluate thresholds for SMTP alerts
        try:
            check_sensor_thresholds("pi4", data)
        except Exception as alert_err:
            logger.error(f"Error checking Pi 4 thresholds: {alert_err}")

        return jsonify({
            "status": "success",
            "message": "Pi 4 sensor data received and saved successfully",
            "inserted_id": inserted["id"],
            "timestamp": inserted["timestamp"].isoformat() if isinstance(inserted["timestamp"], datetime) else str(inserted["timestamp"])
        }), 200
    except Exception as e:
        logger.error(f"Failed to insert Pi 4 sensor data: {e}")
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500


# =====================================================
# INGESTION API: WASHROOM HYGIENE (ESP32 NODE 3)
# =====================================================

@app.route("/washroom-hygiene-data", methods=["POST"])
@app.route("/api/washroom/hygiene", methods=["POST"])
def receive_washroom_hygiene_data():
    data = request.get_json()

    if data is None:
        return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

    # Extract washroom hygiene sensor values with fallbacks
    gas = data.get("gas_sensor") or data.get("gas")
    smell = data.get("smell") or data.get("smell_index")
    voc_aqi = data.get("voc_aqi") or data.get("voc") or data.get("aqi")
    eq_co2 = data.get("eq_co2") or data.get("eco2") or data.get("equivalent_co2")

    sender_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', 'Unknown')

    print("\n========================================")
    print("   WASHROOM HYGIENE DATA RECEIVED (Node 3)")
    print("========================================")
    print("Time              :", datetime.now())
    print("Sender IP         :", sender_ip)
    print("User-Agent        :", user_agent)
    print("Gas Sensor        :", gas if gas is not None else "N/A")
    print("Smell Index       :", smell if smell is not None else "N/A")
    print("VOC AQI           :", voc_aqi if voc_aqi is not None else "N/A")
    print("Equivalent CO2    :", eq_co2 if eq_co2 is not None else "N/A")
    print("========================================")

    raw_insert_sql = """
        INSERT INTO washroom_hygiene (
            gas, smell, voc_aqi, eq_co2
        ) VALUES (%s, %s, %s, %s)
        RETURNING id, timestamp;
    """

    try:
        inserted = execute_query(
            raw_insert_sql,
            (str(gas) if gas is not None else None, str(smell) if smell is not None else None, str(voc_aqi) if voc_aqi is not None else None, str(eq_co2) if eq_co2 is not None else None),
            fetchone=True,
            commit=True
        )

        # Evaluate thresholds for SMTP alerts
        try:
            check_sensor_thresholds("washroom", data)
        except Exception as alert_err:
            logger.error(f"Error checking washroom thresholds: {alert_err}")

        return jsonify({
            "status": "success",
            "message": "Washroom hygiene data received and saved successfully",
            "inserted_id": inserted["id"],
            "timestamp": inserted["timestamp"].isoformat() if isinstance(inserted["timestamp"], datetime) else str(inserted["timestamp"])
        }), 200
    except Exception as e:
        logger.error(f"Failed to insert washroom hygiene data: {e}")
        return jsonify({"status": "error", "message": f"Database error: {str(e)}"}), 500


# =====================================================
# FRONTEND DASHBOARD APIs (DATA RETRIEVAL)
# =====================================================

@app.route("/api/water-quality", methods=["GET"])
def get_water_quality_data():
    """Returns recent water quality records for dashboard visualization."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    raw_select_sql = """
        SELECT id, timestamp, turbidity, ph, tds_ppm
        FROM water_quality
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s;
    """
    try:
        rows = execute_query(raw_select_sql, (limit, offset), fetchall=True)
        formatted_rows = format_timestamps(rows)
        return jsonify({
            "status": "success",
            "count": len(formatted_rows),
            "data": formatted_rows
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/air-quality", methods=["GET"])
def get_air_quality_data():
    """Returns recent air quality records for dashboard visualization."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    raw_select_sql = """
        SELECT id, timestamp, temperature_c, humidity, pm25, pm10, co2, aqi
        FROM air_quality
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s;
    """
    try:
        rows = execute_query(raw_select_sql, (limit, offset), fetchall=True)
        formatted_rows = format_timestamps(rows)
        return jsonify({
            "status": "success",
            "count": len(formatted_rows),
            "data": formatted_rows
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/pi4/temperature", methods=["GET"])
def get_pi4_temperature_data():
    """Returns recent Raspberry Pi 4 sensor records for dashboard visualization."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    raw_select_sql = """
        SELECT id, timestamp, temperature_c, humidity, pressure, gas_resistance
        FROM pi4_temperature
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s;
    """
    try:
        rows = execute_query(raw_select_sql, (limit, offset), fetchall=True)
        formatted_rows = format_timestamps(rows)
        return jsonify({
            "status": "success",
            "count": len(formatted_rows),
            "data": formatted_rows
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/washroom/hygiene", methods=["GET"])
def get_washroom_hygiene_data():
    """Returns recent washroom hygiene records for dashboard visualization."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    raw_select_sql = """
        SELECT id, timestamp, gas, smell, voc_aqi, eq_co2
        FROM washroom_hygiene
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s;
    """
    try:
        rows = execute_query(raw_select_sql, (limit, offset), fetchall=True)
        formatted_rows = format_timestamps(rows)
        return jsonify({
            "status": "success",
            "count": len(formatted_rows),
            "data": formatted_rows
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/latest", methods=["GET"])
def get_latest_readings():
    """Returns the latest single reading from water, air, Pi 4, and washroom sensors."""
    sql_water = "SELECT * FROM water_quality ORDER BY timestamp DESC LIMIT 1;"
    sql_air = "SELECT * FROM air_quality ORDER BY timestamp DESC LIMIT 1;"
    sql_pi4 = "SELECT * FROM pi4_temperature ORDER BY timestamp DESC LIMIT 1;"
    sql_washroom = "SELECT * FROM washroom_hygiene ORDER BY timestamp DESC LIMIT 1;"

    try:
        latest_water = execute_query(sql_water, fetchone=True)
        latest_air = execute_query(sql_air, fetchone=True)
        latest_pi4 = execute_query(sql_pi4, fetchone=True)
        latest_washroom = execute_query(sql_washroom, fetchone=True)

        latest_water_formatted = format_timestamps([latest_water])[0] if latest_water else None
        latest_air_formatted = format_timestamps([latest_air])[0] if latest_air else None
        latest_pi4_formatted = format_timestamps([latest_pi4])[0] if latest_pi4 else None
        latest_washroom_formatted = format_timestamps([latest_washroom])[0] if latest_washroom else None

        return jsonify({
            "status": "success",
            "water_quality": latest_water_formatted,
            "air_quality": latest_air_formatted,
            "pi4_temperature": latest_pi4_formatted,
            "washroom_hygiene": latest_washroom_formatted
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint that verifies DB connectivity and returns row counts."""
    try:
        w_count = execute_query("SELECT COUNT(*) as count FROM water_quality;", fetchone=True)["count"]
        a_count = execute_query("SELECT COUNT(*) as count FROM air_quality;", fetchone=True)["count"]
        p_count = execute_query("SELECT COUNT(*) as count FROM pi4_temperature;", fetchone=True)["count"]
        wh_count = execute_query("SELECT COUNT(*) as count FROM washroom_hygiene;", fetchone=True)["count"]
        return jsonify({
            "status": "healthy",
            "database_connected": True,
            "table_counts": {
                "water_quality": w_count,
                "air_quality": a_count,
                "pi4_temperature": p_count,
                "washroom_hygiene": wh_count
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database_connected": False,
            "error": str(e)
        }), 500


# =====================================================
# SMTP EMAIL ALERT APIs
# =====================================================

@app.route("/api/alerts/status", methods=["GET"])
def get_alert_status():
    """Returns current SMTP alert configuration status (hiding password)."""
    cfg = get_smtp_config()
    return jsonify({
        "status": "success",
        "smtp_enabled": cfg["enabled"],
        "smtp_host": cfg["host"],
        "smtp_port": cfg["port"],
        "smtp_user": cfg["user"] if cfg["user"] else "Not configured",
        "sender_email": cfg["sender"],
        "recipient_emails": cfg["recipients"],
        "cooldown_minutes": cfg["cooldown_minutes"],
        "is_configured": bool(cfg["user"] and cfg["password"] and cfg["recipients"])
    }), 200


@app.route("/api/alerts/update-recipient", methods=["POST"])
def update_alert_recipient():
    """Updates the runtime alert recipient email from the dashboard UI."""
    req_data = request.get_json() or {}
    email = req_data.get("email", "").strip()

    if not email or "@" not in email:
        return jsonify({
            "status": "error",
            "message": "Please provide a valid email address."
        }), 400

    update_runtime_recipients([email])

    return jsonify({
        "status": "success",
        "message": f"Alert recipient updated to {email}. Real-time threshold alerts will be sent here."
    }), 200



# =====================================================
# START SERVER
# =====================================================

if __name__ == "__main__":
    print("========================================")
    print("   IoT SENSOR DASHBOARD BACKEND (Flask)")
    print("========================================")
    print("Server running on port 5000")
    print("Waiting for ESP32 and Frontend requests...")
    print("========================================")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
