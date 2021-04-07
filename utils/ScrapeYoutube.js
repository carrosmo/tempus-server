//const puppeteer = require('puppeteer');
const Utils = require("../utils/Utils");

const DomParser = require('dom-parser');
const fetch = require("node-fetch");

var parser = new DomParser();

const scrapeResults = async (query) => {
    try {
        const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`);
        const text = await response.text();
        
        const html = parser.parseFromString(text);

        const scriptTag = html.getElementsByTagName("script").find(tag => tag.innerHTML.startsWith("var ytInitialData = ") == true);

        eval(scriptTag.innerHTML);

        const videos = ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents.map((vid, i) => {
            const videoRenderer = vid.videoRenderer;
            if (!videoRenderer) return;

            // [titleList[i], channelList[i], thumbnailList[i], idList[i]]

            return [
                videoRenderer.title.runs[0].text, // title
                videoRenderer.ownerText.runs[0].text, // channel
                videoRenderer.thumbnail.thumbnails[1] ? videoRenderer.thumbnail.thumbnails[1].url : videoRenderer.thumbnail.thumbnails[0].url, // thumbnail
                videoRenderer.videoId, // id
            ]
        }).filter(e => e != null);

        return videos;
    } catch (error) {
        console.error(error);

        return;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.scrapeResults = scrapeResults;