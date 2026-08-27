import os
import smtplib
import logging
import threading
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("flask_app")

# In-memory alert cooldown tracker: { sensor_key: last_sent_datetime }
ALERT_COOLDOWNS = {}


def get_smtp_config():
    """Reads SMTP configuration from environment variables."""
    return {
        "enabled": os.getenv("SMTP_ENABLED", "true").lower() == "true",
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "sender": os.getenv("SMTP_SENDER", os.getenv("SMTP_USER", "alert@schoolenv.org")),
        "recipients": [r.strip() for r in os.getenv("ALERT_RECIPIENT_EMAILS", "").split(",") if r.strip()],
        "cooldown_minutes": int(os.getenv("ALERT_COOLDOWN_MINUTES", "5"))
    }


def _send_email_task(subject, text_body, html_body, recipient_list):
    """Internal helper to execute the SMTP connection in a background thread."""
    config = get_smtp_config()

    if not config["enabled"]:
        logger.info("[SMTP] Email alerts disabled via SMTP_ENABLED=false")
        return False

    user = config["user"]
    password = config["password"]
    host = config["host"]
    port = config["port"]
    sender = config["sender"] or user

    targets = recipient_list if recipient_list else config["recipients"]

    if not targets:
        logger.warning("[SMTP] No email recipients configured. Skipping email dispatch.")
        return False

    if not user or not password:
        logger.warning(
            f"[SMTP] SMTP_USER or SMTP_PASSWORD not set in environment. "
            f"Would send alert '{subject}' to {targets}."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"SchoolEnv Safety Alert <{sender}>"
        msg["To"] = ", ".join(targets)

        msg.attach(MIMEText(text_body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        logger.info(f"[SMTP] Connecting to {host}:{port}...")
        server = smtplib.SMTP(host, port, timeout=10)
        if config["use_tls"]:
            server.starttls()
        server.login(user, password)
        server.sendmail(sender, targets, msg.as_string())
        server.quit()

        logger.info(f"[SMTP] Alert email successfully sent to {targets}")
        return True
    except Exception as e:
        logger.error(f"[SMTP] Failed to send email alert: {e}")
        return False


def send_email_alert(subject, text_body, html_body=None, recipient_list=None, async_send=True):
    """
    Public entry point to dispatch an SMTP email alert.
    By default runs asynchronously in a daemon thread so Flask responses are not delayed.
    """
    if async_send:
        t = threading.Thread(
            target=_send_email_task,
            args=(subject, text_body, html_body, recipient_list),
            daemon=True
        )
        t.start()
        return True
    else:
        return _send_email_task(subject, text_body, html_body, recipient_list)


def check_and_trigger_alert(alert_key, parameter_name, value, unit, threshold_desc, impact_desc):
    """
    Checks rate-limiting cooldown and triggers an SMTP alert if threshold is breached.
    """
    config = get_smtp_config()
    cooldown_delta = timedelta(minutes=config["cooldown_minutes"])
    now = datetime.now()

    last_sent = ALERT_COOLDOWNS.get(alert_key)
    if last_sent and (now - last_sent) < cooldown_delta:
        logger.info(f"[ALERT COOLDOWN] Alert for '{alert_key}' suppressed (sent < {config['cooldown_minutes']}m ago).")
        return

    # Update cooldown timestamp
    ALERT_COOLDOWNS[alert_key] = now

    subject = f"⚠️ [CRITICAL CLASSROOM ALERT] High {parameter_name} Detected: {value} {unit}"

    text_body = f"""
==================================================
SCHOOL ENVIRONMENT MONITORING - SAFETY ALERT
==================================================

CRITICAL BREACH DETECTED:
- Parameter       : {parameter_name}
- Current Level   : {value} {unit}
- Safety Limit    : {threshold_desc}
- Time            : {now.strftime('%Y-%m-%d %H:%M:%S')}

STUDENT HEALTH & COGNITIVE IMPACT:
{impact_desc}

Note: Parameter thresholds are actively being researched for optimal classroom safety.

--
SchoolEnv Safety Automation Node
    """.strip()

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
<style>
    body {{ font-family: Arial, sans-serif; background-color: #f4f6f9; color: #1e293b; padding: 20px; }}
    .card {{ background: #ffffff; border-radius: 12px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 6px solid #dc2626; }}
    .header {{ background: #ef4444; color: white; padding: 20px; font-size: 20px; font-weight: bold; }}
    .content {{ padding: 24px; }}
    .badge {{ display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }}
    .metric {{ font-size: 28px; font-weight: bold; color: #dc2626; margin: 12px 0; }}
    .impact-box {{ background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; margin-top: 16px; border-radius: 4px; }}
    .footer {{ background: #f8fafc; padding: 16px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>
    <div class="card">
        <div class="header">⚠️ Classroom Safety Threshold Alert</div>
        <div class="content">
            <span class="badge">Threshold Exceeded</span>
            <h2>{parameter_name} Level Critical</h2>
            <div class="metric">{value} <span style="font-size:16px;">{unit}</span></div>
            <p><strong>Safety Limit:</strong> {threshold_desc}</p>
            <p><strong>Timestamp:</strong> {now.strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <div class="impact-box">
                <strong>Potential Student Health & Learning Impact:</strong>
                <p style="margin-top:6px; font-size:14px; line-height:1.4;">{impact_desc}</p>
            </div>
            
            <p style="font-size:12px; color:#64748b; margin-top:16px;">
                <em>* Note: Threshold levels are continuously evaluated and researched for classroom safety.</em>
            </p>
        </div>
        <div class="footer">
            SchoolEnv Environmental Monitoring System • Automated Safety Node
        </div>
    </div>
</body>
</html>
    """.strip()

    logger.info(f"[ALERT] Triggering threshold alert for {parameter_name} ({value} {unit})")
    send_email_alert(subject, text_body, html_body, async_send=True)


def check_sensor_thresholds(sensor_category, data):
    """
    Evaluates incoming sensor payload against critical classroom thresholds.
    Thresholds:
    - Air Temp > 40°C (per classroom threshold specification)
    - CO2 > 1200 ppm
    - PM2.5 > 35 µg/m³
    - AQI > 150
    - Water pH < 6.0 or > 9.0
    - Water TDS > 500 ppm
    - Water Turbidity > 5.0 NTU
    - Pi 4 Temp > 75°C
    """
    if not isinstance(data, dict):
        return

    if sensor_category == "air":
        # CO2
        co2 = data.get("co2") if data.get("co2") is not None else data.get("co2_ppm")
        if co2 is not None and float(co2) > 1200:
            check_and_trigger_alert(
                "co2_high",
                "Carbon Dioxide (CO₂)",
                round(float(co2)),
                "ppm",
                "< 800 - 1000 ppm",
                "Causes high drowsiness, lethargy, impaired concentration, headaches, and significant reduction in student academic test performance."
            )

        # PM2.5
        pm25 = data.get("pm25")
        if pm25 is not None and float(pm25) > 35:
            check_and_trigger_alert(
                "pm25_high",
                "PM2.5 Fine Particulates",
                round(float(pm25), 1),
                "µg/m³",
                "< 12 - 35 µg/m³",
                "Penetrates deep into respiratory airways, causing asthma attacks, airway inflammation, coughing, and fatigue in students."
            )

        # Air Temp (40°C limit as specified by user)
        temp = data.get("temperature_c")
        if temp is not None and float(temp) > 40.0:
            check_and_trigger_alert(
                "air_temp_high",
                "Classroom Air Temperature",
                round(float(temp), 1),
                "°C",
                "< 23°C (Target: 20-23°C, Upper Limit: 40°C)",
                "Severe heat stress causing dehydration, drowsiness, inability to focus, heat exhaustion, and fainting risks in students."
            )

        # AQI
        aqi = data.get("aqi") if data.get("aqi") is not None else data.get("voc_index")
        if aqi is not None and float(aqi) > 150:
            check_and_trigger_alert(
                "aqi_high",
                "Air Quality / VOC Index",
                round(float(aqi)),
                "Index",
                "< 50 Index",
                "Airborne contaminants and volatile organic compounds cause dizziness, throat irritation, nausea, and impaired focus."
            )

    elif sensor_category == "water":
        ph = data.get("ph")
        if ph is not None:
            ph_val = float(ph)
            if ph_val < 6.0 or ph_val > 9.0:
                check_and_trigger_alert(
                    "ph_out_of_bounds",
                    "Drinking Water pH",
                    round(ph_val, 2),
                    "pH",
                    "6.5 - 8.5 pH",
                    "Abnormal water acidity/alkalinity causes digestive discomfort, throat irritation, and heavy metal pipe leaching risks."
                )

        tds = data.get("tds_ppm") if data.get("tds_ppm") is not None else data.get("tds")
        if tds is not None and float(tds) > 500:
            check_and_trigger_alert(
                "tds_high",
                "Water Total Dissolved Solids",
                round(float(tds)),
                "ppm",
                "< 300 ppm",
                "High mineral concentrations cause unpalatable metallic taste, stomach discomfort, and digestive distress."
            )

        turbidity = data.get("turbidity") if data.get("turbidity") is not None else data.get("turbidity_raw")
        if turbidity is not None and float(turbidity) > 5.0:
            check_and_trigger_alert(
                "turbidity_high",
                "Water Turbidity",
                round(float(turbidity), 1),
                "NTU",
                "< 1.0 NTU",
                "Cloudy water indicates sediment or potential microbial pathogen presence, posing risk of bacterial stomach infections."
            )

    elif sensor_category == "pi4":
        pi_temp = data.get("temperature_c") if data.get("temperature_c") is not None else data.get("temperature")
        if pi_temp is not None and float(pi_temp) > 75.0:
            check_and_trigger_alert(
                "pi4_temp_high",
                "Raspberry Pi 4 Telemetry Node Temp",
                round(float(pi_temp), 1),
                "°C",
                "< 60°C",
                "Hardware thermal overload risks monitoring node crash, stopping environmental safety monitoring for the classroom."
            )
