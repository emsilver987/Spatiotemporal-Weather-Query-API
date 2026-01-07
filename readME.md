# Spatiotemporal Weather Query API

A backend API that answers inverse weather questions, such as:

“Which cities are 20°F or colder right now?”

Instead of querying weather by city, this service lets you query cities by weather conditions, using pre-ingested, normalized weather data.

What This Project Is

A Node.js API for querying weather conditions across cities

Backed by PostgreSQL with time-stamped weather snapshots

Uses scheduled ingestion instead of live proxying

Designed to support time-window and threshold-based queries

This is a backend systems project, not a UI app.

## Core Tools
Node.js (API Server)

Exposes REST endpoints

Validates query parameters

Executes SQL queries

Returns JSON responses

PostgreSQL (Database)

Stores city metadata

Stores historical weather snapshots

Enables time-based and condition-based queries

Weather Data API (Upstream Source)

Example: NOAA or OpenWeather

Provides raw temperature and timestamped data

Queried only by the ingestion worker

Ingestion Worker (Node.js)

Runs on a schedule (e.g. every 5–10 minutes)

Fetches weather data

Normalizes units and timestamps

Inserts append-only snapshots into the database

Docker

Runs API,

put it in a text file and ill copy and paste

Got it — here is the full README.md as plain text, ready to copy-paste.

Spatiotemporal Weather Query API

A backend API that answers inverse weather questions, such as:

“What cities are 20°F or colder right now?”

Instead of querying weather by city, this service lets you query cities by weather conditions, using pre-ingested, normalized weather data.

This is a backend systems project focused on data ingestion, time-series querying, and API design.

What This Project Is

A Node.js REST API for querying weather conditions across cities

Backed by PostgreSQL storing historical weather snapshots

Uses scheduled ingestion, not live proxying of third-party APIs

Designed for time-window and threshold-based queries

This is intentionally API-only. There is no frontend.

Core Tools
Node.js (API Server)

Exposes REST endpoints (e.g. /cities)

Validates query parameters

Translates requests into SQL queries

Returns JSON responses

Purpose: Serve fast, consistent queries against pre-processed data.

PostgreSQL (Database)

Stores city metadata (name, coordinates)

Stores weather snapshots over time

Enables filtering by temperature and time windows

Purpose: Act as the authoritative store for normalized, queryable weather data.

Weather Data API (Upstream Source)

Examples:

NOAA

OpenWeather

Provides raw temperature data with timestamps

Queried only by the ingestion worker

Never accessed directly by API clients

Purpose: Source of truth for weather observations.

Ingestion Worker (Node.js)

Runs on a schedule (every 5–10 minutes)

Fetches weather data from the upstream API

Normalizes units (e.g. Fahrenheit, UTC time)

Inserts append-only snapshots into PostgreSQL

Purpose: Decouple data collection from query serving.

Docker

Runs all services in isolated containers

Provides consistent local and deployment environments

Services:

API server

Ingestion worker

PostgreSQL database

How Everything Works Together

[ Weather API ]
  ↓
[ Ingestion Worker ]
  ↓
[ PostgreSQL ]
  ↓
[ Node.js API ]
  ↓
[ Client ]

Request Flow

The ingestion worker periodically fetches weather data.

Data is normalized and stored as time-stamped snapshots.

A client sends a query like:

/cities?temp_lte=20&as_of=10m

The API server translates this into a SQL query.

Cities matching the condition within the time window are returned.

Time Semantics (“Right Now”)

“Right now” is defined as:

The most recent weather snapshot within a configurable freshness window.

Default:

10 minutes

Clients may override this:

/cities?temp_lte=20&as_of=15m

If no recent snapshot exists for a city, it is excluded.

Example Queries

Cities currently at or below 20°F

Cities that crossed freezing in the last hour

Cities with the largest temperature drop in 6 hours

Historical temperature trends for a city

Minimal Services (v1)

API server

Ingestion worker

PostgreSQL database

No frontend, no streaming, no machine learning.

What This Project Demonstrates

Backend API design

Scheduled data ingestion pipelines

Time-series data modeling

SQL-based filtering and aggregation

Clear separation of concerns

Practical system architecture

What This Project Does Not Do

Weather prediction or forecasting

Real-time streaming

Multi-source reconciliation (v1)

Consumer UI features

These are intentionally out of scope.

Why This Project Exists

Most weather APIs answer:
“What’s the weather in City X?”

This project answers:
“Which cities match Weather Condition Y?”

That inversion enables more interesting, non-trivial backend queries and demonstrates real system design skills.
