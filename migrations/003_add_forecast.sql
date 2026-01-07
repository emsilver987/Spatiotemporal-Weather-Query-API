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

