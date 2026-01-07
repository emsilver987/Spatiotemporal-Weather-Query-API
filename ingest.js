import "dotenv/config";
import fetch from "node-fetch";
import pkg from "pg";
import cron from "node-cron";
cron.schedule("*/5 * * * *", ingest);


const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "weather_user",
  password: "weather_pass",
  database: "weather_db",
});

const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  throw new Error("Missing OPENWEATHER_API_KEY");
}

const cities = [
  { name: "Indianapolis", lat: 39.7684, lon: -86.1581 },
  { name: "Austin", lat: 30.2672, lon: -97.7431 },
  { name: "Dallas", lat: 32.7767, lon: -96.7970 },
  { name: "Houston", lat: 29.7604, lon: -95.3698 },
  { name: "Port St. Joe", lat: 29.8116, lon: -85.3021 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Whitestown", lat: 39.9970, lon: -86.3450 },
  { name: "Miami", lat: 25.7617, lon: -80.1918 },
];

async function ingest() {
  for (const city of cities) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&units=imperial&appid=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const tempF = data.main.temp;
    const recordedAt = new Date(data.dt * 1000);

    const { rows } = await pool.query(
      "SELECT id FROM cities WHERE name = $1",
      [city.name]
    );

    const cityId = rows[0].id;

    await pool.query(
      `INSERT INTO weather_snapshots (city_id, temperature_f, recorded_at)
       VALUES ($1, $2, $3)`,
      [cityId, tempF, recordedAt]
    );

    console.log(`Inserted snapshot for ${city.name}`);
  }

  await pool.end();
}

ingest().catch(console.error);

