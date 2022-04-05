const expressWs = require('express');

const ws = require("ws").Server;
const fs = require("fs");

const https = require("https");

const dotenv = require("dotenv");

// Load env
dotenv.config({ path: __dirname + "/config/config.env" });
dotenv.config({ path: __dirname + "/config/secrets.env" });

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

module.exports = () => {
    const module = {};

    // Connect to the database, then start http and WebSocket server
    module.startServer = async (absolutePath = "/tempus") => {
        const port = 1235;

        var server = https.createServer({
            key: fs.readFileSync(process.env.PRIV_KEY),
            cert: fs.readFileSync(process.env.CERT),
        });

        server.listen(port, () => console.log("Handlingslista running on port", port))

        const WebSocketServer = require('./network/WebSocketServer');

        var wss = new ws({
            server: server,
            path: absolutePath
        });

        wss.on("connection", WebSocketServer.onConnection);

        console.log("[Tempus] Started websocket server at path '%s'", absolutePath)
        //router.websocket("/", (info, cb) => cb(WebSocketServer.onConnection));
        
        // Set up http routes here 
    }

    return module; 
}