const Client = require("./Client");

const Utils = require("../utils/Utils");

const YoutubeApi = require("../utils/YoutubeApi");
const ScrapeYoutube = require("../utils/ScrapeYoutube");
const { playVideoFromQueue, addVideoToQueue } = require("../utils/Api");

const pingTime = process.env.WEBSOCKET_PING_TIME || 30000;

var sessions = new Map();

const onConnection = (conn) => {
    // Create client
    const client = new Client(conn, Utils.createId());

    if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
        console.log("Client '%s' connected", client.id);

    // Remove the client from any sessions
    conn.on("close", () => disconnectClient(client));

    // Handle messages
    conn.on("message", message => handleMessage(client, message));

    // Setup ping pong
    client.pingPongTimer = setInterval(() => pingPong(client), pingTime);
}

const handleMessage = async (client, message) => {
    try {
        message = JSON.parse(message); // Parse

        // Aliases
        const originalMessage = JSON.parse(JSON.stringify(message));

        switch (message.type) {
            // Sessions
            case "join-session": {
                var sessionId = (message.data && message.data.sessionId) || Utils.createId();

                var videoToPlayURL;
                if(Utils.isValidYoutubeURL(sessionId)) {
                    videoToPlayURL = sessionId;
                    sessionId = Utils.createId();

                    console.log("Creating session with youtube url");
                }

                client.joinSession(sessions, sessionId);
                if (videoToPlayURL)
                    client.session.startedByVideo = true;

                // Calculate the video timestamp as a long time could have passed since the last state update
                const { lastStateUpdateTime } = client.sessionData();

                if (lastStateUpdateTime != null) {
                    const passedTime = (Utils.now() - client.sessionData().lastStateUpdateTime) / 1000; // In seconds
                    
                    const video = client.session.getPlayingVideo();
                    if (video) {
                        client.sessionData().lastStateUpdateTime = Utils.now();
                        if (!video.isPaused) {
                            const oldTimestamp = video.timestamp;
                            const newTimestamp = oldTimestamp + passedTime * video.playbackSpeed;
                            video.timestamp = newTimestamp;
        
                            console.log("Updated video timestamp from %s to %s", oldTimestamp, newTimestamp);
                        }
                    } 
                }

                if(videoToPlayURL != null) {
                    try {    
                        const { addToQueueResponse, playVideoFromQueueResponse } = await addVideoToQueue(client, { url: videoToPlayURL, playIfFirstVideo: false });
    
                        // if (addToQueueResponse)
                        //     client.sendResponse(addToQueueResponse, originalMessage, client.SendType.Broadcast);
                        if (playVideoFromQueueResponse)
                            client.sendResponse(playVideoFromQueueResponse, { type: "play-video-from-queue" }, client.SendType.Broadcast);
                    } catch (error) {
                        client.sendError(error, originalMessage);
                    }
                }

                const response = {
                    sessionId: sessionId,
                    clientId: client.id,
                    isAdmin: client.isAdmin,
                    state: client.session.data,
                    startedByVideo: client.session.startedByVideo
                }

                client.sendResponse(response, originalMessage, client.SendType.Single);

                broadcastClients(client.session);

                break;
            }

            case "give-me-timestamp": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);

                const sessionData = client.sessionData();
                const video = sessionData.queue[sessionData.currentQueueIndex];
                if (!video) return client.sendError("[Tempus] That video doesn't exist in the queue", originalMessage);

                if (sessionData.lastStateUpdateTime != null) {
                    const passedTime = (Utils.now() - sessionData.lastStateUpdateTime) / 1000; // In seconds
                        
                    sessionData.lastStateUpdateTime = Utils.now();
                    if (!video.isPaused) 
                        video.timestamp += passedTime;
                } else {
                    console.log("No last state update time exists");
                }

                client.sendResponse({ timestamp: video.timestamp }, originalMessage, client.SendType.Single);

                break;
            }

            case "state-update": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);

                const { timestamp, playbackSpeed, isPaused, hasEnded } = message.data;

                const sessionData = client.sessionData();
                const video = sessionData.queue[sessionData.currentQueueIndex];
                if (!video) return client.sendError("[Tempus] That video doesn't exist in the queue", originalMessage);

                video.timestamp = timestamp;
                video.playbackSpeed = playbackSpeed;
                video.isPaused = isPaused;
                video.hasEnded = hasEnded;

                sessionData.lastStateUpdateTime = message.date;

                client.sendResponse({ state: client.sessionData() }, originalMessage, client.SendType.Broadcast);

                break;
            }

            case "timestamp-update": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);

                const { timestamp } = message.data;

                const sessionData = client.sessionData();
                const video = sessionData.queue[sessionData.currentQueueIndex];
                if (!video) return client.sendError("[Tempus] That video doesn't exist in the queue", originalMessage);

                video.timestamp = timestamp;

                sessionData.lastStateUpdateTime = message.date;

                // Don't send anything, just update the time on the server

                break;
            }

            case "video-loaded": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);

                client.isVideoLoaded = true;
                client.session.getPlayingVideo().hasEnded = false;

                const clients = [...client.session.clients];

                console.log("Client ready...");

                if (clients.filter(c => c.isVideoLoaded === true).length == clients.length) {
                    // All clients has the video loaded.
                    clearTimeout(client.session.videoStartTimeout);
                    client.session.videoStartTimeout = null;

                    console.log("All clients ready. Playing video");
                    
                    // Wait a little bit just to make sure
                    setTimeout(() => client.sendResponse({}, { type: "play-video" }, client.SendType.Broadcast), 1000);
                } else {
                    // Start the timer to avoid problems if a single client fails to load the vidoe
                    if (client.session.videoStartTimeout == null) {
                        client.session.videoStartTimeout = setTimeout(() => {
                            console.log("Timeout. Starting video anyways")
                            client.sendResponse({}, { type: "play-video" }, client.SendType.Broadcast)
                            client.session.videoStartTimeout = null;
                        }, 5000);
                    }
                }
                
                break;
            }

            case "now": {
                client.sendResponse({ now: Utils.now(), date: new Date().toISOString() }, originalMessage, client.SendType.Single);
                break;
            }

            case "play-video-from-queue": {
                try {
                    const response = playVideoFromQueue(client, { queueIndex: message.data.queueIndex });

                    client.sendResponse(response, originalMessage, client.SendType.Broadcast);
                } catch (error) {
                    client.sendError(error, originalMessage);
                }

                break;
            }

            case "video-ended": {
                if (!client.session) return client.sendError("You are not in a session", originalMessage);

                client.session.getPlayingVideo().hasEnded = true;

                client.sendResponse({ state: client.sessionData() }, { type: "state-update" }, client.SendType.Broadcast);

                break;
            }

            case "play-next-video": {
                try {
                    if (!client.session) return client.sendError("You are not in a session", originalMessage);

                    const queueIndex = client.sessionData().currentQueueIndex + 1;
                    // Bounds check
                    if (queueIndex > client.sessionData().queue.length) return;

                    const response = playVideoFromQueue(client, { queueIndex });

                    client.sendResponse(response, originalMessage, client.SendType.Broadcast);
                } catch (error) {
                    client.sendError(error, originalMessage);
                }

                break;
            }

            case "add-video-to-queue": {
                try {
                    const url = message.data.url;

                    const { addToQueueResponse, playVideoFromQueueResponse } = await addVideoToQueue(client, { url, playIfFirstVideo: true });

                    if (addToQueueResponse)
                        client.sendResponse(addToQueueResponse, originalMessage, client.SendType.Broadcast);
                    if (playVideoFromQueueResponse)
                        client.sendResponse(playVideoFromQueueResponse, { type: "play-video-from-queue" }, client.SendType.Broadcast);
                } catch (error) {
                    console.log(error)
                    client.sendError(error, originalMessage);
                }

                break;
            }

            case "delete-video-from-queue": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);

                const queue = client.sessionData().queue;
                const entry = queue.find(item => item.id == message.data.id);
                if (!entry) return client.sendError("Failed to delete video. Invalid ID", originalMessage);

                // Remove that specific index
                const index = queue.indexOf(entry);
                queue.splice(index, 1);

                client.sendResponse({ deleted: message.data.id, queue: queue }, originalMessage, client.SendType.Broadcast);

                break;
            }

            case "get-search-results": {
                if (!client.session)
                    return client.sendError("You are not in a session", originalMessage);
                
                const query = message.data.query;
                const result = await ScrapeYoutube.scrapeResults(query);
                if (!result) return client.sendError("Failed to get search results", originalMessage);
                
                client.sendResponse({results: result}, originalMessage, client.SendType.Broadcast);

                break;
            }

            case "broadcast-clients": {

                broadcastClients(client);

                break;
            }

            // Ping Pong
            case "pong": {
                client.isAlive = true; // The client is still connected

                break;
            }

            default: {
                console.log("Other message:", message);

                break;
            }
        }
    } catch (error) {
        console.log(message);
        console.error(error);
    }
}

const pingPong = (client) => {
    // Terminate the connection with the client if it isn't alive
    if (!client.isAlive) return client.terminate();

    // Default the client to being disconnected, but if a pong message is received from them they are considered still alive
    client.isAlive = false;

    client.ping();
}

const disconnectClient = (client) => {
    const session = client.session;

    // If the client is in a session
    if (session) {
        session.leave(client); // Remove the client from the session

        broadcastClients(session);

        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Client '%s' disconnected, %s clients remaining in session '%s'", client.id, session.clients.size, session.id);

        // Remove the session if it's empty
        if (session.clients.size == 0) {
            sessions.delete(session.id);

            if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
                console.log("Removing empty session '%s'", session.id);
        }
    } else {
        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Client '%s' disconnected", client.id);
    }

    // Remove the ping pong
    clearInterval(client.pingPongTimer);

    // Terminate the connection
    client.terminate();
}

function broadcastClients(session) {
    const response = {
        watchers: session.clients.size
    }

    session.broadcastResponse(response, { type: "broadcast-clients" });
}

const playNextVideo = (client, message = { type: "play-next-video" }) => {
    if (!client.session)
        return client.sendError("You are not in a session", message);

    // Only play the next video if one exists
    if (client.session.videoData.queue.length == 0)
        return;

    const nextVideo = JSON.parse(JSON.stringify(client.session.videoData.queue[0]));
    client.session.videoData.queue.shift(); // Remove the video from the queue

    const videoId = Utils.getVideoId(nextVideo.url);

    client.session.videoData.currentVideoId = videoId;

    console.log("Playing next video '%s'", videoId);

    client.sendResponse({ video: nextVideo, queue: client.session.videoData.queue }, message, client.SendType.Broadcast);
}

module.exports.onConnection = onConnection;