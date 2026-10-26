"""
Vaishnavi weds Chinmay - Wedding Invitation (Flask)

Local:    pip install -r requirements.txt
          python app.py            ->  http://127.0.0.1:5000
Railway:  gunicorn app:app         (see Procfile / README.md)

Everything you may want to change lives in the WEDDING dict below.
There is no database: the site is a pure invitation (no RSVP).
"""
import os
from datetime import datetime, timezone

from flask import Flask, abort, render_template, Response
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 60 * 60 * 24  # cache static files 1 day
# Railway sits behind a proxy: trust its headers so absolute URLs use https
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# ----------------------------------------------------------------------
# EDIT YOUR WEDDING DETAILS HERE
# ----------------------------------------------------------------------
WEDDING = {
    "bride": "Vaishnavi",
    "groom": "Chinmay",
    "bride_title": "Chi. Sow. Vaishnavi",
    "groom_title": "Chi. Chinmay",
    "bride_parents": ["Smt. Akula Anitha", "Sri Akula Nagesh"],
    "groom_parents": "Only S/o. Smt. Gandi Soubhagyalaxmi & Sri Gandi Anil Garu",
    "tagline": "You are not only invited, most expected...",
    "compliments": "Best compliments from Near & Dear",
    # The main wedding moment - drives the countdown + scratch-card date
    "main_date_iso": "2026-11-01T11:13:00+05:30",
    "main_date_display": "Sunday, 1st November 2026",
    "main_day": "1",
    "main_month": "November",
    "main_year": "2026",
    "main_weekday": "Sunday",
    "main_time": "11:13 AM · Dhanur Lagnam",
    "events": [
        {
            "key": "pelli-kuthuru",
            "name": "Pelli Kuthuru",
            "telugu": "పెళ్లి కూతురు",
            "icon": "haldi",
            "day": "30", "month": "Oct", "weekday": "Friday",
            "time": "7:00 PM onwards",
            "start": "2026-10-30T19:00:00+05:30",
            "end": "2026-10-30T22:00:00+05:30",
            "venue": "Sri Rajarajeshwari Gardens Banquet Hall",
            "address": "Sikh Rd, Diamond Point, Sikh Village, Bowenpally, Secunderabad, Telangana 500009",
            "note": "An evening of blessings, turmeric and traditions for the bride.",
        },
        {
            "key": "wedding",
            "name": "Wedding Sumuhurtham",
            "telugu": "సుముహూర్తం",
            "icon": "ring",
            "day": "1", "month": "Nov", "weekday": "Sunday",
            "time": "11:13 AM · Dhanur Lagnam",
            "start": "2026-11-01T11:13:00+05:30",
            "end": "2026-11-01T13:30:00+05:30",
            "venue": "Gayatri Gardens",
            "address": "Sikh Rd, near Diamond Point, Sikh Village, Bowenpally, Secunderabad, Telangana 500009",
            "note": "The sacred vows, with your blessings. Lunch follows.",
        },
        {
            "key": "reception",
            "name": "Reception",
            "telugu": "రిసెప్షన్",
            "icon": "glass",
            "day": "3", "month": "Nov", "weekday": "Tuesday",
            "time": "7:00 PM onwards",
            "start": "2026-11-03T19:00:00+05:30",
            "end": "2026-11-03T22:30:00+05:30",
            "venue": "Gayatri Gardens",
            "address": "Sikh Rd, near Diamond Point, Sikh Village, Bowenpally, Secunderabad, Telangana 500009",
            "note": "Dinner, music and memories to last forever.",
        },
    ],
}

for _ev in WEDDING["events"]:
    q = f'{_ev["venue"]}, {_ev["address"]}'
    _ev["map_q"] = q.replace(" ", "+")


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", w=WEDDING)


def _ics_escape(text):
    return (text.replace("\\", "\\\\").replace(";", "\\;")
                .replace(",", "\\,").replace("\n", "\\n"))


def _utc(iso):
    return datetime.fromisoformat(iso).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@app.route("/calendar/<key>.ics")
def calendar(key):
    """'Add to calendar' file for one event."""
    ev = next((e for e in WEDDING["events"] if e["key"] == key), None)
    if ev is None:
        abort(404)
    title = f'{ev["name"]} - {WEDDING["bride"]} weds {WEDDING["groom"]}'
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "PRODID:-//Wedding Invitation//EN", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:{ev['key']}@wedding-invitation",
        f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{_utc(ev['start'])}",
        f"DTEND:{_utc(ev['end'])}",
        f"SUMMARY:{_ics_escape(title)}",
        f"LOCATION:{_ics_escape(ev['venue'] + ', ' + ev['address'])}",
        f"DESCRIPTION:{_ics_escape(ev['note'])}",
        "END:VEVENT", "END:VCALENDAR",
    ]
    return Response("\r\n".join(lines) + "\r\n", mimetype="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{key}.ics"'})


@app.route("/healthz")
def healthz():
    return {"ok": True}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
