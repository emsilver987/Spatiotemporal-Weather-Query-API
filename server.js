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

////////////////////////////////
// GET /cities?temp_lt=20
// GET /cities?temp_gt=80
// GET /cities?temp_gt=32&temp_lt=50
// GET /cities?temp_gt=32&temp_lt=50&as_of=15m
////////////////////////////////
app.get("/cities", async (request, reply) => {
  const { temp_lt, temp_gt, as_of = "10m" } = request.query;

  // parse as_of like "10m"
  const minutes = parseInt(as_of.replace("m", ""), 10);
  if (isNaN(minutes)) {
    return reply.code(400).send({ error: "invalid as_of format" });
  }

  const tempLt = temp_lt !== undefined ? Number(temp_lt) : null;
  const tempGt = temp_gt !== undefined ? Number(temp_gt) : null;

  
  if (
    (tempLt !== null && Number.isNaN(tempLt)) ||
    (tempGt !== null && Number.isNaN(tempGt))
  ) {
    return reply.code(400).send({ error: "Temperature must be a number" });
  }


  
  let tempConditions = [];
  let params = [minutes];
  let paramIndex = 2;

  if (tempGt !== null){
    tempConditions.push(`w.temperature_f > $${paramIndex}`);
    params.push(tempGt);
    paramIndex++;
  }

  if (tempLt !== null){
    tempConditions.push(`w.temperature_f < $${paramIndex}`);
    params.push(tempLt);
    paramIndex++;
  }  

  const tempWhereClause = tempConditions.length > 0 ? `AND ${tempConditions.join(" AND ")}` : "";


const query = `
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
    AND recorded_at >= NOW() - make_interval(mins => $1)
  ORDER BY recorded_at DESC
  LIMIT 1
) w ON true
WHERE 1=1
${tempWhereClause}
ORDER BY w.temperature_f ASC;
`;

  const result = await pool.query(query , params);
  return result.rows;
});



app.listen({ port: 3000, host: "0.0.0.0" });

