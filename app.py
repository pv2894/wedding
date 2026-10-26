"""
Wedding Invitation – Flask backend
Run:  pip install -r requirements.txt
      python app.py
Open: http://127.0.0.1:5000
"""
import os
import re
import sqlite3
from datetime import datetime
from contextlib import closing

from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "wedding.db")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "change-me")  # protects /api/rsvps

# ----------------------------------------------------------------------
# EDIT YOUR WEDDING DETAILS HERE
# ----------------------------------------------------------------------
COUPLE = {
    "groom": "Arjun",
    "bride": "Priya",
    "groom_full": "Arjun Reddy",
    "bride_full": "Priya Sharma",
    "tagline": "Two souls, one beautiful journey",
    "date_iso": "2027-02-14T11:00:00+05:30",
    "date_display": "Sunday, 14 February 2027",
    "venue": "The Grand Palace Gardens",
    "city": "Hyderabad, Telangana",
    "map_url": "https://maps.google.com/?q=Hyderabad",
    "story": [
        {"year": "2019", "title": "We Met",
         "text": "A rainy afternoon, a shared umbrella and a coffee that turned into hours of talking."},
        {"year": "2022", "title": "The Promise",
         "text": "Under a sky full of stars, we promised to walk through life side by side."},
        {"year": "2026", "title": "She Said Yes",
         "text": "One question, one ring, and the happiest yes of our lives."},
    ],
    "events": [
        {"name": "Mehendi", "time": "12 Feb · 4:00 PM", "icon": "🌿",
         "desc": "Henna, music and laughter with family."},
        {"name": "Sangeet", "time": "13 Feb · 7:00 PM", "icon": "🎶",
         "desc": "An evening of dance, songs and celebration."},
        {"name": "Wedding Ceremony", "time": "14 Feb · 11:00 AM", "icon": "💍",
         "desc": "The sacred vows and blessings."},
        {"name": "Reception", "time": "14 Feb · 7:30 PM", "icon": "🥂",
         "desc": "Dinner, dance and memories to last forever."},
    ],
}


# ----------------------------------------------------------------------
# Database helpers
# ----------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with closing(sqlite3.connect(DB_PATH)) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS rsvp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                guests INTEGER NOT NULL DEFAULT 1,
                attending TEXT NOT NULL,
                message TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS wishes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        db.commit()


def clean(text, limit):
    return re.sub(r"\s+", " ", (text or "")).strip()[:limit]


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", c=COUPLE)


@app.route("/api/rsvp", methods=["POST"])
def rsvp():
    data = request.get_json(silent=True) or {}
    name = clean(data.get("name"), 80)
    email = clean(data.get("email"), 120)
    message = clean(data.get("message"), 400)
    attending = data.get("attending", "yes")
    try:
        guests = max(1, min(int(data.get("guests", 1)), 10))
    except (TypeError, ValueError):
        guests = 1

    if not name:
        return jsonify(ok=False, error="Please enter your name."), 400
    if attending not in ("yes", "no", "maybe"):
        return jsonify(ok=False, error="Invalid response."), 400
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify(ok=False, error="Please enter a valid email."), 400

    db = get_db()
    db.execute(
        "INSERT INTO rsvp (name,email,guests,attending,message,created_at) VALUES (?,?,?,?,?,?)",
        (name, email, guests, attending, message, datetime.utcnow().isoformat()),
    )
    db.commit()
    msg = (f"Thank you, {name}! We can't wait to celebrate with you 💖"
           if attending == "yes" else
           f"Thank you for letting us know, {name}. You'll be in our hearts 💌")
    return jsonify(ok=True, message=msg)


@app.route("/api/wishes", methods=["GET", "POST"])
def wishes():
    db = get_db()
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        name = clean(data.get("name"), 60)
        message = clean(data.get("message"), 300)
        if not name or not message:
            return jsonify(ok=False, error="Name and wish are required."), 400
        db.execute(
            "INSERT INTO wishes (name,message,created_at) VALUES (?,?,?)",
            (name, message, datetime.utcnow().isoformat()),
        )
        db.commit()
    rows = db.execute(
        "SELECT name,message,created_at FROM wishes ORDER BY id DESC LIMIT 50"
    ).fetchall()
    return jsonify(ok=True, wishes=[dict(r) for r in rows])


@app.route("/api/rsvps")
def list_rsvps():
    """Couple-only view: /api/rsvps?key=YOUR_ADMIN_KEY"""
    if request.args.get("key") != ADMIN_KEY:
        return jsonify(ok=False, error="Unauthorized"), 401
    db = get_db()
    rows = db.execute("SELECT * FROM rsvp ORDER BY id DESC").fetchall()
    total = sum(r["guests"] for r in rows if r["attending"] == "yes")
    return jsonify(ok=True, total_attending=total, rsvps=[dict(r) for r in rows])


if __name__ == "__main__":
    init_db()
    app.run(debug=True)