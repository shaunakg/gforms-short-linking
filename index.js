require('dotenv').config()

var express = require('express');
var app = express();
var http = require('http').createServer(app);
var fs = require('fs');
const webport = process.env.PORT || 8080;

const fetch = require('node-fetch');
const tracker = require('ackee-tracker');
const fetchSheet = require('./modules/tsvToDict');

app.use(require('cors')())
app.use(require('express-useragent').express())

let cache = {populatedTime: 0, content: {}};
let now = () => new Date().getTime();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/config/all", async (req, res) => {

    if (req.query.key == process.env.config_key) {

        if (req.query.cache) { return res.json({...cache, cache_hit: false});   }

        if ((now() - cache.populatedTime > parseInt(process.env.cache_staleness_ms))) {
            
            cache = {
                populatedTime: now(),
                content: await fetchSheet(process.env.google_sheet_id)
            }

            return res.json({...cache, cache_hit: false});

        } else {
            return res.json({...cache, cache_hit: true});   
        }

    } else {
        return res.sendStatus(401);
    }

})

app.get("/s/:shortlink", async (req, res) => {

    let fromCache, dict;

    tracker.create("https://go.srg.codes").record("85937de2-aa9e-40bf-85e2-5f1289ae50d8", {
        siteLocation: req.protocol + '://' + req.get('host') + req.originalUrl,
        siteReferrer: req.get('Referrer')
    });
    
    if (now() - cache.populatedTime > parseInt(process.env.cache_staleness_ms)) {

        // Sheet format:
        // Col 1: Timestamp/other (not read by program)
        // Col 2: Final URL (to redirect to)
        // Col 3: shortlink slug
        // Cols 4-x: Not read

        // Structure your google form questions in column order +1, because of timestamp (automated on column 1)

        fromCache = false;

        dict = await fetchSheet(process.env.google_sheet_id);
        cache = {
            populatedTime: now(),
            content: dict
        }

    } else {
        fromCache = true;
        dict = cache.content;
    }

    if (dict[req.params.shortlink]) {
        return res.set({'X-Cache': fromCache ? "HIT":"MISS"}).redirect(301, dict[req.params.shortlink])
    } else {

        if (process.env.redirect_on_404) {
            return res.redirect(redirect_on_404);
        } else if (process.env.file_on_404) {
            return res.sendFile(__dirname + file_on_404)
        } else {
            return res.sendStatus(404);
        }
    }

});


http.listen(webport, function(){
    console.log('listening on *:' + webport);
});