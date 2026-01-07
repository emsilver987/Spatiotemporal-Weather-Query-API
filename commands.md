To start postgres instance

docker pull postgres:16

docker run \
  --name weather-postgres \
  -e POSTGRES_USER=weather_user \
  -e POSTGRES_PASSWORD=weather_pass \
  -e POSTGRES_DB=weather_db \
  -p 5432:5432 \
  -v weather_pgdata:/var/lib/postgresql/data \
  -d postgres:16

Apply postgres instance
docker exec -i weather-postgres \
  psql -U weather_user -d weather_db < schema.sql

Enter psql
docker exec -it weather-postgres psql -U weather_user -d weather_db

ALTER TABLE:
ALTER TABLE <table name>;
ADD COLUMN <column name> <type of var>;

Core SQL query:
SELECT
    c.name,
    c.state,
    w.temperature_f,
    w.recorded_at
FROM cities c
JOIN LATERAL (
    SELECT temperature_f, recorded_at
    FROM weather_snapshots
    WHERE city_id = c.id
      AND recorded_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY recorded_at DESC
    LIMIT 1
) w ON true
WHERE w.temperature_f <= 20;

