# Spatiotemporal Weather Query API

A backend API that answers inverse weather questions, such as:

**"Which cities are 20°F or colder right now?"**
**"Which citites are 40°F or warmer right now?"**
**"Which cities have wind speeds below 3 mph?"**
**"Which citites have a temperature lower than 30°F and wind speeds higher than 4 mph"** 

Instead of querying weather by city, this service lets you query cities by weather conditions, using pre-ingested, normalized weather data.

## Endpoints:
POST /snapshot?city=Indianapolis

/cities?temp_gt=32&temp_lt=50&wind_gt=2&wind_lt=5&as_of=15m
---

**Example Query:**
```bash
curl "http://localhost:3000/cities?wind_lt=5&temp_gt=63"
```

**Response:**
```json
[
  {
    "name": "Houston",
    "state": "TX",
    "temperature_f": 67.66,
    "wind_speed_mph": 4.61,
    "recorded_at": "2026-01-07T15:09:14.000Z"
  },
  {
    "name": "Miami",
    "state": "FL",
    "temperature_f": 74.68,
    "wind_speed_mph": 4.61,
    "recorded_at": "2026-01-07T15:16:43.000Z"
  }
]

```

**Example Query:**
```base
curl -X POST http://localhost:3000/snapshot -H "Content-Type: application/json" -d '{"city":"Atlanta"}'
```

**Response:***
```json
{"message":"Successfully added Atlanta to snapshot"}
```

---

## What This Project Is

- A **Node.js REST API** for querying weather conditions across cities
- Backed by **PostgreSQL** storing historical weather snapshots
- Uses **scheduled ingestion**, not live proxying of third-party APIs
- Designed for **time-window and threshold-based queries**

**This is intentionally API-only. There is no frontend.**

---

## Core Tools

### Node.js (API Server)
- Exposes REST endpoints (e.g. `GET /cities`, `POST /snapshot`)
- Validates query parameters
- Translates requests into SQL queries
- Returns JSON responses

**Purpose:** Serve fast, consistent queries against pre-processed data.

### PostgreSQL (Database)
- Stores city metadata (name, coordinates)
- Stores weather snapshots over time
- Enables filtering by temperature and time windows

**Purpose:** Act as the authoritative store for normalized, queryable weather data.

### Weather Data API (Upstream Source)
Examples:
- OpenWeather

- Provides raw temperature data with timestamps
- Queried **only by the ingestion worker**
- Never accessed directly by API clients

**Purpose:** Source of truth for weather observations.

### Ingestion Worker (Node.js)
- Runs on a schedule (every 5–10 minutes)
- Fetches weather data from the upstream API
- Normalizes units (e.g. Fahrenheit, UTC time)
- Inserts append-only snapshots into PostgreSQL

**Purpose:** Decouple data collection from query serving.

### Docker
- Runs all services in isolated containers
- Provides consistent local and deployment environments

Services:
- API server
- Ingestion worker
- PostgreSQL database

---

## How Everything Works Together

```
[ Weather API ]
      ↓
[ Ingestion Worker ]
      ↓
[ PostgreSQL ]
      ↓
[ Node.js API ]
      ↓
[ Client ]
```

### Request Flow

1. The ingestion worker periodically fetches weather data. (user can also get real time data by sending a post request to snapshots containing city name)
2. Data is normalized and stored as time-stamped snapshots.
3. A client sends a query like:
   ```
   /cities?temp_lte=20&as_of=10m
   ```
4. The API server translates this into a SQL query.
5. Cities matching the condition within the time window are returned.

---

## Time Semantics ("Right Now")

**"Right now"** is defined as:
- The most recent weather snapshot within a configurable freshness window.
- **Default:** 60 minutes

Clients may override this:
```
/cities?temp_lte=20&as_of=15m
```

If no recent snapshot exists for a city, it is excluded.

---

## Minimal Services (v1)

- API server
- Ingestion worker
- PostgreSQL database

**No frontend, no streaming, no machine learning.**

---

## What This Project Demonstrates

- Backend API design
- Scheduled data ingestion pipelines
- Time-series data modeling
- SQL-based filtering and aggregation
- Clear separation of concerns
- Practical system architecture

---

## What This Project Does Not Do

- Weather prediction or forecasting
- Real-time streaming
- Multi-source reconciliation (v1)
- Consumer UI features

**These are intentionally out of scope.**

---

## Why This Project Exists

Most weather APIs answer:  
**"What's the weather in City X?"**

This project answers:  
**"Which cities match Weather Condition Y?"**
- can include thresholds and matching many different conditions

That inversion enables more interesting, non-trivial backend queries and demonstrates real system design skills.
