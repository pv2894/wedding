
"""
Wedding Invitation – Flask backend

Local development:
    pip install -r requirements.txt
    python app.py

Render production:
    gunicorn app:app
"""

import os
import re
import sqlite3
from datetime import datetime, timezone
from contextlib import closing

from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)

# Absolute path prevents database path issues during deployment.
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "wedding.db")

# Set ADMIN_KEY in Render Environment Variables before deployment.
ADMIN_KEY = os.environ.get("ADMIN_KEY", "change-me")

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
        {
            "year": "2019",
            "title": "We Met",
            "text": (
                "A rainy afternoon, a shared umbrella and a coffee "
                "that turned into hours of talking."
            ),
        },
        {
            "year": "2022",
            "title": "The Promise",
            "text": (
                "Under a sky full of stars, we promised to walk "
                "through life side by side."
            ),
        },
        {
            "year": "2026",
            "title": "She Said Yes",
            "text": (
                "One question, one ring, and the happiest yes "
                "of our lives."
            ),
        },
    ],

    "events": [
        {
            "name": "Mehendi",
            "time": "12 Feb · 4:00 PM",
            "icon": "🌿",
            "desc": "Henna, music and laughter with family.",
        },
        {
            "name": "Sangeet",
            "time": "13 Feb · 7:00 PM",
            "icon": "🎶",
            "desc": "An evening of dance, songs and celebration.",
        },
        {
            "name": "Wedding Ceremony",
            "time": "14 Feb · 11:00 AM",
            "icon": "💍",
            "desc": "The sacred vows and blessings.",
        },
        {
            "name": "Reception",
            "time": "14 Feb · 7:30 PM",
            "icon": "🥂",
            "desc": "Dinner, dance and memories to last forever.",
        },
    ],
}


# ----------------------------------------------------------------------
# DATABASE
# ----------------------------------------------------------------------

def get_db():
    """Get a SQLite connection for the current request."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=10)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    """Close the current request's database connection."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create database tables if they do not exist."""
    with closing(sqlite3.connect(DB_PATH, timeout=10)) as db:
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


def clean(value, limit):
    """Normalize text and limit its length."""
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).strip()[:limit]


def utc_now():
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


def get_json_data():
    """Read a JSON object safely."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


# Initialize the database when the application module loads.
# This also works when Gunicorn imports app:app.
init_db()


# ----------------------------------------------------------------------
# WEBSITE
# ----------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", c=COUPLE)


@app.route("/health", methods=["GET"])
def health():
    """Health-check endpoint for deployment troubleshooting."""
    return jsonify(ok=True, status="healthy"), 200


# ----------------------------------------------------------------------
# RSVP API
# ----------------------------------------------------------------------

@app.route("/api/rsvp", methods=["POST"])
def rsvp():
    data = get_json_data()

    name = clean(data.get("name"), 80)
    email = clean(data.get("email"), 120)
    message = clean(data.get("message"), 400)
    attending = data.get("attending", "yes")

    try:
        guests = int(data.get("guests", 1))
        guests = max(1, min(guests, 10))
    except (TypeError, ValueError, OverflowError):
        guests = 1

    if not name:
        return jsonify(
            ok=False,
            error="Please enter your name."
        ), 400

    if attending not in ("yes", "no", "maybe"):
        return jsonify(
            ok=False,
            error="Invalid response."
        ), 400

    if email and not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+", email
    ):
        return jsonify(
            ok=False,
            error="Please enter a valid email."
        ), 400

    db = get_db()
    db.execute(
        """
        INSERT INTO rsvp
            (name, email, guests, attending, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name, email, guests, attending, message, utc_now()),
    )
    db.commit()

    if attending == "yes":
        response_message = (
            f"Thank you, {name}! "
            "We can't wait to celebrate with you 💖"
        )
    elif attending == "maybe":
        response_message = (
            f"Thank you, {name}! "
            "We appreciate your response 💌"
        )
    else:
        response_message = (
            f"Thank you for letting us know, {name}. "
            "You'll be in our hearts 💌"
        )

    return jsonify(ok=True, message=response_message), 201


# ----------------------------------------------------------------------
# WISHES API
# ----------------------------------------------------------------------

@app.route("/api/wishes", methods=["GET", "POST"])
def wishes():
    db = get_db()

    if request.method == "POST":
        data = get_json_data()

        name = clean(data.get("name"), 60)
        message = clean(data.get("message"), 300)

        if not name or not message:
            return jsonify(
                ok=False,
                error="Name and wish are required."
            ), 400

        db.execute(
            """
            INSERT INTO wishes (name, message, created_at)
            VALUES (?, ?, ?)
            """,
            (name, message, utc_now()),
        )
        db.commit()

    rows = db.execute(
        """
        SELECT name, message, created_at
        FROM wishes
        ORDER BY id DESC
        LIMIT 50
        """
    ).fetchall()

    return jsonify(
        ok=True,
        wishes=[dict(row) for row in rows],
    ), 200


# ----------------------------------------------------------------------
# ADMIN RSVP API
# ----------------------------------------------------------------------

@app.route("/api/rsvps", methods=["GET"])
def list_rsvps():
    """
    Admin-only RSVP list.

    URL:
        /api/rsvps?key=YOUR_ADMIN_KEY

    Set ADMIN_KEY in your Render environment variables.
    """
    supplied_key = request.args.get("key", "")

    if not ADMIN_KEY or ADMIN_KEY == "change-me":
        app.logger.error(
            "ADMIN_KEY is not configured securely."
        )
        return jsonify(
            ok=False,
            error="Admin access is not configured."
        ), 503

    if not supplied_key or supplied_key != ADMIN_KEY:
        return jsonify(
            ok=False,
            error="Unauthorized"
        ), 401

    db = get_db()
    rows = db.execute(
        "SELECT * FROM rsvp ORDER BY id DESC"
    ).fetchall()

    total_attending = sum(
        row["guests"]
        for row in rows
        if row["attending"] == "yes"
    )

    return jsonify(
        ok=True,
        total_attending=total_attending,
        rsvps=[dict(row) for row in rows],
    ), 200


# ----------------------------------------------------------------------
# LOCAL DEVELOPMENT
# ----------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )
