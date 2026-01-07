To start postgres instance

docker pull postgres:16

docker run \
  --name weather-postgres \
  -e POSTGRES_USER=weather_user \
  -e POSTGRES_PASSWORD=weather_pass \
  -e POSTGRES_DB=weather_db \
  -p 5432:5432 \
  -d postgres:16

Apply postgres instance
docker exec -i weather-postgres \
  psql -U weather_user -d weather_db < schema.sql

