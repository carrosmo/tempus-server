const ws = require("ws").Server;
const fs = require("fs");

const https = require("https");

const dotenv = require("dotenv");

// Load env
dotenv.config({ path: "./config/config.env" });
dotenv.config({ path: "./config/secrets.env" });

if (process.argv[2] == "--production" || process.argv[2] == "--development")
    process.env.NODE_ENV = process.argv[2].slice(2); // don't include dashes

// Setup the websocket log level
global.WebSocketLogLevels = {
    None: 0,
    Minimal: 1,
    Full: 2
}

global.webSocketLogLevel = process.env.WEBSOCKET_LOG_LEVEL || WebSocketLogLevels.Minimal;

Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

const port = 1235;

var server = https.createServer({
    key: fs.readFileSync(process.env.LUDVIGDB_PRIV_KEY_PATH),
    cert: fs.readFileSync(process.env.LUDVIGB_CERT_PATH),
});

server.listen(port, () => console.log("[Tempus] Started websocket server at port", port));

const WebSocketServer = require('./network/WebSocketServer');

var wss = new ws({
    server: server,
    path: absolutePath
});

wss.on("connection", WebSocketServer.onConnection);