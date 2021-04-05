const Utils = require("../utils/Utils");

const playVideoFromQueue = (client, { queueIndex }) => {
    if (!client.session)
        throw "You are not in a session";
    
    if (queueIndex == null) throw "No index specified";

    const sessionData = client.sessionData();

    // Out of bounds check
    if (queueIndex >= sessionData.queue.length)
        throw "That video doesn't exist in the queue";

    sessionData.currentQueueIndex = queueIndex;
    
    // Reset video state
    const video = sessionData.queue[sessionData.currentQueueIndex];
    video.timestamp = 0;
    video.playbackSpeed = 1;
    video.isPaused = false;

    sessionData.lastStateUpdateTime = Utils.now();

    console.log("[Tempus] Playing video '%s' at index", sessionData.queue[queueIndex].title, queueIndex);

    return { state: sessionData };
}
module.exports.playVideoFromQueue = playVideoFromQueue;