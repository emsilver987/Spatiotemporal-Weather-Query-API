Options:

1. Run node ingest.js to get up to date information on cities and future predictions(forecasts)

2. Automate it 

crontab -e

*/10 * * * * cd <root-dir> && /usr/bin/node ingest.js >> ingest.log 2>&1

<root-dir> should be replaced with your root directory
