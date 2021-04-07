const fetch = require("node-fetch");

const getVideoDetailsPure = async (videoId) => {
    const youtubeKey = process.env.YOUTUBE_KEY;
    const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet&part=contentDetails&id=${videoId}&key=${youtubeKey}`, {
        headers: { "Accept": "application/json" }
    });
    
    const json = await response.json();

    if (json.error) console.error(json);

    return json;
}

const getSearchResultsPure = async (query) => {
    const youtubeKey = process.env.YOUTUBE_KEY;
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${query}&type=video&key=${youtubeKey}`, {
        headers: { "Accept": "application/json" }
    });

    return await response.json();
}

const getVideoDetails = async (videoId) => {
    const videoData = await getVideoDetailsPure(videoId);
    if (!videoData.items) return;

    const title = videoData.items[0].snippet.title;
    const channel = videoData.items[0].snippet.channelTitle;
    const thumbnail = videoData.items[0].snippet.thumbnails.medium;

    // Get video duration in minutes
    const durationString = videoData.items[0].contentDetails.duration
    const arrOfTime = durationString.replace("PT", "").replace("H", " ").replace("M", " ").replace("S", "").split(" ");

    // Minutes, seconds
    var duration = 0;
    if (arrOfTime.length === 1) // Seconds
        duration = parseInt(arrOfTime[0]) / 60;
    else if (arrOfTime.length === 2) // Minutes, seconds
        duration = parseInt(arrOfTime[0]) + parseInt(arrOfTime[1]) / 60;
    else if (arrOfTime.length === 3) // Hours, minutes, seconds
        duration = parseInt(arrOfTime[0]) * 60 + parseInt(arrOfTime[1]) + parseInt(arrOfTime[2]) / 60;

    return {
        id: videoId,
        title,
        channel,
        videoId,
        duration,
        thumbnail
    };
}

const getSearchResults = async (query) => {
    return getSearchResultsPure(query);
}

module.exports.getVideoDetails = getVideoDetails;
module.exports.getSearchResults = getSearchResults;