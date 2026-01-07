Below is a **clean, high-signal API specification** for your project at the level you’d actually put in a README or share with another engineer. This is **not implementation**, it’s contract-level design.

---

# Spatiotemporal Weather Query API — Specification

## Overview

The Spatiotemporal Weather Query API provides **inverse weather queries** over a curated set of cities.
Instead of asking *“what is the weather in X?”*, clients ask *“where is it cold / windy / calm right now?”*

The API ingests real-time weather snapshots from OpenWeather and exposes condition-based queries over the **most recent data per city**.

---

## Base URL

```
http://localhost:3000
```

---

## Data Model (Conceptual)

* **City**

  * id
  * name
  * latitude
  * longitude

* **Weather Snapshot**

  * city_id
  * temperature_f (°F)
  * wind_speed_mph (mph)
  * recorded_at (UTC timestamp)

Snapshots are **append-only**. Queries always operate on the **latest snapshot per city within a time window**.

---

## Endpoints

---

### `GET /cities`

Query cities by weather conditions.

#### Description

Returns cities whose **most recent snapshot** (within a given time window) satisfies one or more weather thresholds.

#### Query Parameters

| Parameter | Type   | Description                                     |
| --------- | ------ | ----------------------------------------------- |
| `temp_gt` | number | Temperature greater than (°F)                   |
| `temp_lt` | number | Temperature less than (°F)                      |
| `wind_gt` | number | Wind speed greater than (mph)                   |
| `wind_lt` | number | Wind speed less than (mph)                      |
| `as_of`   | string | Time window (e.g. `10m`, `60m`). Default: `60m` |

At least **one weather filter** is required.

#### Example Requests

```
GET /cities?temp_lt=40
GET /cities?temp_gt=32&temp_lt=50
GET /cities?wind_gt=10
GET /cities?temp_gt=50&wind_lt=5&as_of=30m
```

#### Example Response

```json
[
  {
    "name": "Indianapolis",
    "state": "IN",
    "temperature_f": 44.29,
    "wind_speed_mph": 6.91,
    "recorded_at": "2026-01-07T16:57:12.000Z"
  },
  {
    "name": "Whitestown",
    "state": "IN",
    "temperature_f": 42.55,
    "wind_speed_mph": 8.05,
    "recorded_at": "2026-01-07T17:00:00.000Z"
  }
]
```

---

### `POST /snapshot`

Trigger ingestion of a fresh weather snapshot for a specific city.

#### Description

Fetches current weather data from OpenWeather for the given city and inserts a new snapshot.

This endpoint is **state-changing** and intended for:

* ingestion jobs
* admin tools
* testing

#### Request Body

```json
{
  "city": "Austin"
}
```

#### Responses

* `200 OK` — snapshot ingested successfully
* `400 Bad Request` — city missing
* `404 Not Found` — city does not exist

#### Example Response

```json
{
  "city": "Austin",
  "temperature_f": 66.96,
  "wind_speed_mph": 1.01,
  "recorded_at": "2026-01-07T17:11:03.000Z"
}
```

---

### `GET /health`

Service health and data freshness check.

#### Description

Verifies that the API and database are reachable and reports the most recent ingestion timestamp.

#### Example Response

```json
{
  "status": "ok",
  "database": "up",
  "last_snapshot": "2026-01-07T17:00:00.000Z",
  "timestamp": "2026-01-07T17:03:12.482Z"
}
```

Used by:

* monitoring
* uptime checks
* deployment validation

---

## Error Format

All errors follow a consistent structure:

```json
{
  "error": "Description of the problem"
}
```

---

## Assumptions & Constraints

* All timestamps are stored and returned in **UTC**
* Units are normalized at ingestion time:

  * temperature → °F
  * wind → mph
* Queries operate on **latest snapshot per city**
* No authentication (v1)
* No forecasts (v1)
* No historical analytics beyond latest snapshot (v1)

---

## Out of Scope (v1)

* User accounts / auth
* Forecast data
* Historical time-series queries
* Multiple weather providers
* UI / frontend

---

## Intended Use Cases

* Condition-based discovery (“Where is it calm right now?”)
* Operational dashboards
* Environmental filters for other systems
* Demonstration of spatiotemporal querying patterns

---

## Versioning

This API is currently **v1**, implicitly versioned by behavior.
Explicit versioning (e.g. `/v1`) may be added later.

---

## Summary

This API is designed to:

* invert traditional weather queries
* emphasize **conditions over locations**
* stay small, composable, and extensible

---

