import "dotenv/config";
import pkg from "pg";
import fetch from "node-fetch";

const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "weather_user",
  password: "weather_pass",
  database: "weather_db",
});


run();

async function run(){
  try {
    console.log("Ingestion started at: ", new Date().toISOString())

    await processAllCities();
    await processForecasts();

    console.log("Ingestion Finished at: ", new Date().toISOString())
    process.exit(0);
  } catch (err){
    console.error("Ingestion failed:", err);
    process.exit(1)
  }
}    

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


