const Utils = require("../utils/Utils");
const YoutubeApi = require("./YoutubeApi");

const playVideoFromQueue = (client, { queueIndex }) => {
    if (!client.session)
        throw "You are not in a session";
    
    if (queueIndex == null) throw "No index specified";

    const sessionData = client.sessionData();

    // Out of bounds check
    if (queueIndex >= sessionData.queue.length)
        throw "That video doesn't exist in the queue";

    // Reset loaded variable for all clients in session
    client.session.clients.forEach(cli => cli.isVideoLoaded = false);

    sessionData.currentQueueIndex = queueIndex;
    
    // Reset video state
    const video = sessionData.queue[sessionData.currentQueueIndex];
    video.timestamp = 0;
    video.playbackSpeed = 1;
    video.isPaused = false;
    video.hasEnded = false;

    sessionData.lastStateUpdateTime = Utils.now();

    console.log("[Tempus] Playing video '%s' at index", sessionData.queue[queueIndex].title, queueIndex);

    // Start a video start timer to avoid problems if a single client fails to load the vidoe
    if (client.session.videoStartTimeout == null) {
        client.session.videoStartTimeout = setTimeout(() => {
            console.log("Timeout. Starting video anyways")
            client.sendResponse({}, { type: "play-video" }, client.SendType.Broadcast);

            client.session.videoStartTimeout = null;
        }, 5000);
    }

    return { state: sessionData };
}
module.exports.playVideoFromQueue = playVideoFromQueue;

const addVideoToQueue = async (client, { url, playIfFirstVideo = true }) => {
    if (!client.session) throw "You are not in a session";

    if (!url) throw "No video url specified";
    
    const videoId = Utils.getVideoId(url);
    if (!videoId) throw "Not a youtube video";
    
    // Check for duplicates
    if (client.sessionData().queue.find(video => video.id === videoId))
        throw "That video already exists in the queue"
    
    const videoData = await YoutubeApi.getVideoDetails(videoId);
    if (!videoData) throw "Failed to get video details";
    
    // Create a video object to add to the queue 
    const video = { ...videoData, url };

    client.sessionData().queue.push(video);
    
    const addToQueueResponse = { video, queue: client.sessionData().queue };
    var playVideoFromQueueResponse = null;
    
    // Play the video if it's the first in the queue
    if (client.sessionData().queue.length == 1 && playIfFirstVideo) {
        try {
            playVideoFromQueueResponse = playVideoFromQueue(client, { queueIndex: 0 });
        } catch (error) {
            if (typeof error === "object")
                console.error(error);
    
            throw error;
        }
    }

    return { addToQueueResponse, playVideoFromQueueResponse };
}
module.exports.addVideoToQueue = addVideoToQueue;