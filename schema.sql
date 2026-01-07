-- Cities table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL
);


-- Weather snapshots (append-only)
CREATE TABLE weather_snapshots (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    temperature_f DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    wind_speed_mph DOUBLE PRECISION NOT NULL
);


-- Forecast
CREATE TABLE forecast_snapshots (
  id SERIAL PRIMARY KEY,

  city_id INTEGER NOT NULL
    REFERENCES cities(id) ON DELETE CASCADE,

  forecast_time TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,

  temperature_f DOUBLE PRECISION NOT NULL,
  wind_speed_mph DOUBLE PRECISION NOT NULL,

  UNIQUE (city_id, forecast_time, issued_at)
);

CREATE INDEX idx_forecast_city_time
  ON forecast_snapshots (city_id, forecast_time);

CREATE INDEX idx_forecast_issued
  ON forecast_snapshots (issued_at DESC);


-- Index to support time-window queries
CREATE INDEX idx_weather_snapshots_city_time
ON weather_snapshots (city_id, recorded_at DESC);

-- Index to speed up recent-time filtering
CREATE INDEX idx_weather_snapshots_recorded_at
ON weather_snapshots (recorded_at DESC);

