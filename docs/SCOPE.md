Cities Covered: Indianapolis, Austin, Dallas, Houston, Port St. Joe, San Franciso, Whitestown, Miami 

Data Source: OpenWeather

Starting Variable: Weather (will expand in future)

One query type: Thresholds (<= or >=)
    - Example: Which cities are < 20*F right now
    - GET /cities?temp_lte=20&as_of=10m

Definiton of "right now" = within 10 mins of query time

Ingestion Frequency: every 5 minutes for each city

Normalization Rules:
- temps internally converted to F
- Timestamps in UTC
- Source units converted at ingestion time

Schema, tables:
cities
    - id
    - name
    - state
    - lat
    - lon

weather_snapshots
    -id
    -city_id
    -temperature_f
    -recorded_at

out of scope for v1:
- forecasts
- histotrical analytivs
- multi-variable queries
- multiple weawther providers
- Authentication or user accounts
out of scope for v1:
- forecasts
- histotrical analytivs
- multi-variable queries
- multiple weawther providers
- Authentication or user accounts
- UI/forntend




