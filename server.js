import "dotenv/config";
import Fastify from "fastify";
import pkg from "pg";

const { Pool } = pkg;

const app = Fastify({ logger: true });

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "weather_user",
  password: "weather_pass",
  database: "weather_db",
});

// GET /cities?temp_lte=20&as_of=10m
app.get("/cities", async (request, reply) => {
  const { temp_lte, as_of = "10m" } = request.query;

  if (!temp_lte) {
    return reply.code(400).send({ error: "temp_lte is required" });
  }

  // parse as_of like "10m"
  const minutes = parseInt(as_of.replace("m", ""), 10);
  if (isNaN(minutes)) {
    return reply.code(400).send({ error: "invalid as_of format" });
  }

  const result = await pool.query(
    `
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
        AND recorded_at >= NOW() - INTERVAL '${minutes} minutes'
      ORDER BY recorded_at DESC
      LIMIT 1
    ) w ON true
    WHERE w.temperature_f <= $1
    ORDER BY w.temperature_f ASC;
    `,
    [temp_lte]
  );

  return result.rows;
});

app.listen({ port: 3000, host: "0.0.0.0" });

