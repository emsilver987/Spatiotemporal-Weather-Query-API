import "dotenv/config";
import Fastify from "fastify";
import pkg from "pg";

const { Pool } = pkg;

const app = Fastify({ 
  logger: true,
  json: {
    space: 2
  }
});

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "weather_user",
  password: "weather_pass",
  database: "weather_db",
});

////////////////////////////////
// GET /cities?temp_lt=20
// GET /cities?temp_gt=80
// GET /cities?temp_gt=32&temp_lt=50
// GET /cities?temp_gt=32&temp_lt=50&as_of=15m
// GET /cities?wind_ltt=5
// GET /ciites?wind_gt=2&temp_lt=50
////////////////////////////////
app.get("/cities", async (request, reply) => {
  const { temp_lt, temp_gt, wind_lt, wind_gt, as_of = "60m" } = request.query;
  

  //   parse as_of like "60m"
  const minutes = parseInt(as_of.replace("m", ""), 10);
  if (isNaN(minutes)) {
    return reply.code(400).send({ error: "invalid as_of format" });
  }
  
  const tempLt = temp_lt !== undefined ? Number(temp_lt) : null;
  const tempGt = temp_gt !== undefined ? Number(temp_gt) : null;
  const windLt = wind_lt !== undefined ? Number(wind_lt) : null;
  const windGt = wind_gt !== undefined ? Number(wind_gt) : null;

  if (
  tempLt === null &&
  tempGt === null &&
  windLt === null &&
  windGt === null
  ) {
  return reply.code(400).send({
    error: "At least one weather filter is required"
  });
  }

  if (
    (tempLt !== null && Number.isNaN(tempLt)) ||
    (tempGt !== null && Number.isNaN(tempGt)) ||
    (windLt !== null && Number.isNaN(windLt)) ||
    (windGt !== null && Number.isNaN(windGt)) 
  ) {
    return reply.code(400).send({ error: "Weather filters must be numeric" });
  }

  let conditions = [];
  let params = [minutes];
  let paramIndex = 2;

  if (tempGt !== null){
    conditions.push(`w.temperature_f > $${paramIndex}`);
    params.push(tempGt);
    paramIndex++;
  }

  if (tempLt !== null){
    conditions.push(`w.temperature_f < $${paramIndex}`);
    params.push(tempLt);
    paramIndex++;
  }  

  if (windGt !== null){
    conditions.push(`w.wind_speed_mph > $${paramIndex}`);
    params.push(windGt);
    paramIndex++;
  }  

  if (windLt !== null){
    conditions.push(`w.wind_speed_mph < $${paramIndex}`);
    params.push(windLt);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";


const query = `
SELECT
  c.name,
  c.state,
  w.temperature_f,
  w.wind_speed_mph,
  w.recorded_at
FROM cities c
JOIN LATERAL (
  SELECT temperature_f, wind_speed_mph, recorded_at
  FROM weather_snapshots
  WHERE city_id = c.id
    AND recorded_at >= NOW() - make_interval(mins => $1)
  ORDER BY recorded_at DESC
  LIMIT 1
) w ON true
WHERE 1=1
${whereClause}
ORDER BY w.temperature_f ASC;
`;

  const result = await pool.query(query , params);
  if (result.rows.length === 0){
    console.log("No records found")
  }
  return result.rows;
});


////////////////////////////////
// POST /snapshot?city=Indianapolis
////////////////////////////////

app.post("/snapshot", async(request,reply) => {
  const { city } = request.body

  if (!city) {
    return reply.code(400).send({error: "You must provide a city" })
  }

  if (city === "all"){
    processAllCities();
    return reply.status(200).send({ message: "All Cities in Database up to date"});
  }

  const { rows } = await pool.query(
    `
    SELECT id, lat, lon
    FROM cities
    WHERE name = $1
    `,
    [city]
  );  

  if (rows.length === 0){
    return reply.code(404).send({ error: "City not Found"});
  }
  
  const {id: cityId, lat, lon}  = rows[0]
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data = await res.json();
  
  const tempF = data.main.temp;
  const wind = data.wind.speed;
  const recordedAt = new Date(data.dt * 1000);

  await pool.query(
    `INSERT INTO weather_snapshots (city_id, temperature_f, recorded_at, wind_speed_mph)
    VALUES ($1, $2, $3, $4)`,
    [cityId, tempF, recordedAt, wind]
  );

  return reply.status(200).send({ message: `Successfully added ${city} to snapshot`});

});

async function processAllCities() {
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  const { rows: cities } = await pool.query(`
    SELECT id, name, lat, lon
    FROM cities
  `);

  for (const city of cities) {
    try {
      const url =
        `https://api.openweathermap.org/data/2.5/weather` +
        `?lat=${city.lat}&lon=${city.lon}` +
        `&units=imperial&appid=${API_KEY}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`OpenWeather failed for ${city.name}`);
      }

      const data = await res.json();

      const tempF = data.main.temp;
           const wind = data.wind.speed;
      const recordedAt = new Date(data.dt * 1000);

      await pool.query(
        `
        INSERT INTO weather_snapshots (
          city_id,
          temperature_f,
          wind_speed_mph,
          recorded_at
        )
        VALUES ($1, $2, $3, $4)
        `,
        [city.id, tempF, wind, recordedAt]
      );

      console.log(`Inserted snapshot for ${city.name}`);
    } catch (err) {
      console.error(`Failed for ${city.name}:`, err.message);
    }
  }
}

///////////////
// /health
//////////////
app.get("/health", async (request, reply) => {
  try {
    await pool.query("SELECT 1");

    return {
      status: "ok",
      service: "weather-query-api",
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    reply.code(500);
    return {
      status: "error",
      error: "database_unreachable"
    };
  }
});

///////////////
// GET /cities/forecast
/////////////// focuses on conditions (where will it be below 32 degrees in 12 hours), which citites will be windy tmrw, etc,.
app.get("/cities/forecast", async (request, reply) => {
  const { temp_lt, temp_gt, wind_lt, wind_gt, in: offset ="6h" } = request.query;
   
  // parse future like "1h"
  const hours = parseInt(offset.replace("h", ""), 10);
  if (isNaN(hours)) {
    return reply.code(400).send({ error: "invalid in format" });
  }
  
  const tempLt = temp_lt !== undefined ? Number(temp_lt) : null;
  const tempGt = temp_gt !== undefined ? Number(temp_gt) : null;
  const windLt = wind_lt !== undefined ? Number(wind_lt) : null;
  const windGt = wind_gt !== undefined ? Number(wind_gt) : null;

  if (
  tempLt === null &&
  tempGt === null &&
  windLt === null &&
  windGt === null
  ) {
  return reply.code(400).send({
    error: "At least one weather filter is required"
  });
  }

  if (
    (tempLt !== null && Number.isNaN(tempLt)) ||
    (tempGt !== null && Number.isNaN(tempGt)) ||
    (windLt !== null && Number.isNaN(windLt)) ||
    (windGt !== null && Number.isNaN(windGt)) 
  ) {
    return reply.code(400).send({ error: "Weather filters must be numeric" });
  }

  processForecasts()

  let conditions = [];
  let params = [hours];
  let paramIndex = 2;

  if (tempGt !== null){
    conditions.push(`f.temperature_f > $${paramIndex}`);
    params.push(tempGt);
    paramIndex++;
  }

  if (tempLt !== null){
    conditions.push(`f.temperature_f < $${paramIndex}`);
    params.push(tempLt);
    paramIndex++;
  }  

  if (windGt !== null){
    conditions.push(`f.wind_speed_mph > $${paramIndex}`);
    params.push(windGt);
    paramIndex++;
  }  

  if (windLt !== null){
    conditions.push(`f.wind_speed_mph < $${paramIndex}`);
    params.push(windLt);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";


const query = `
SELECT
  c.name,
  c.state,
  f.temperature_f,
  f.wind_speed_mph,
  f.forecast_time,
  f.issued_at
FROM cities c
JOIN LATERAL (
  SELECT
    temperature_f,
    wind_speed_mph,
    forecast_time,
    issued_at
  FROM forecast_snapshots
  WHERE city_id = c.id
    AND forecast_time >= NOW() + make_interval(hours => $1) - INTERVAL '90 minutes'
    AND forecast_time <= NOW() + make_interval(hours => $1) + INTERVAL '90 minutes'
  ORDER BY
    issued_at DESC,
    ABS(EXTRACT(EPOCH FROM (forecast_time - (NOW() + make_interval(hours => $1)))))
  LIMIT 1
) f ON true
WHERE 1=1
${whereClause}
ORDER BY f.temperature_f ASC;
`;

  const result = await pool.query(query , params);
  if (result.rows.length === 0){
    console.log("No records found")
  }
  return result.rows;
});

async function processForecasts() {
  const API_KEY = process.env.OPENWEATHER_API_KEY
  const { rows: cities } = await pool.query(`
    SELECT id, name, lat, lon
    FROM cities
  `);

  for (const city of cities) {
    try {
      const url =
        `https://api.openweathermap.org/data/2.5/forecast` +
        `?lat=${city.lat}&lon=${city.lon}` +
        `&units=imperial&appid=${API_KEY}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`OpenWeather failed for ${city.name}`);
      }

      const data = await res.json();
      const issuedAt = new Date();

      for (const item of data.list) {
        const forecastTime = new Date(item.dt * 1000);
        const tempF = item.main.temp;
        const wind = item.wind.speed;

        await pool.query(
        `
        INSERT INTO forecast_snapshots (
        city_id,
        forecast_time,
        issued_at,
        temperature_f,
        wind_speed_mph
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
       city.id,
       forecastTime,
       issuedAt,
       tempF,
       wind
       ]);}
      console.log(`Inserted forecast for ${city.name}`);
    } catch (err) {
      console.error(`Failed for ${city.name}:`, err.message);
    }
  }
}

///////////////
// /cities/:id/forecast
//////////////
app.listen({ port: 3000, host: "0.0.0.0" });

