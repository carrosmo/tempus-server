//const puppeteer = require('puppeteer');
const Utils = require("../utils/Utils");

const DomParser = require('dom-parser');
const fetch = require("node-fetch");

var parser = new DomParser();

const scrapeResults = async (query) => {
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`);
    const text = await response.text();
    
    const html = parser.parseFromString(text);

    const scriptTag = html.getElementsByTagName("script").find(tag => tag.innerHTML.startsWith("var ytInitialData = ") == true);

    // remove unecc stuff;
    //const jsonTrimmed = scriptTag.innerHTML.slice(0, scriptTag.innerHTML.indexOf(`window.ytcfg.set("FILLER_DATA",fillerData);`))

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

    // const browser = await puppeteer.launch({ headless: true });
    // const page = await browser.newPage();
    // const num = 10;

    // await page.goto(`https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`)
    
    // await page.waitForSelector('form');
    // const form = await page.evaluate(() => {
    //     document.querySelector('form').submit();
    // });

    // await page.waitForNavigation();
    
    // await page.setViewport({
    //     width: 1920,
    //     height: 1080,
    //     deviceScaleFactor: 0.1
    // });

    // var titleList = [];
    // var titles = await page.$$("#contents.style-scope ytd-item-section-renderer #video-title")
    // for (i = 0; i < num; i++) {
    //     titleList.push(await page.evaluate(el => el.innerText, titles[i]))
    // }

    // var channelList = [];
    // var channels = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope #channel-info ytd-channel-name a")
    // for (i = 0; i < num; i++) {
    //     channelList.push(await page.evaluate(el => el.innerText, channels[i]))
    // }

    // var thumbnailList = [];
    // var thumbnails = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope ytd-thumbnail #img")
    // for (i = 0; i < num; i++) {
    //     thumbnailList.push(await page.evaluate(el => el.src, thumbnails[i]))
    // }

    // var idList = [];
    // var ids = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope ytd-thumbnail > a")
    // for (i = 0; i < num; i++) {
    //     var unformattedId = (await page.evaluate(el => (el.href), ids[i]))
    //     idList.push(Utils.getVideoId(unformattedId))
    // }

    // var searchResults = [];
    // for (i = 0; i < num; i++) {
    //     searchResults.push([titleList[i], channelList[i], thumbnailList[i], idList[i]])
    // }

    // // If it failed to get the thumbnail from the scrape, we will instead predict it
    // searchResults.forEach(video => {
    //     if(video[2] == "" ){
    //         video[2] = `https://img.youtube.com/vi/${video[3]}/mqdefault.jpg`;
    //     }
    // })

    // return searchResults;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.scrapeResults = scrapeResults;