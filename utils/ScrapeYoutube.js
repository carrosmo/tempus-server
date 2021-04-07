const puppeteer = require('puppeteer');
const Utils = require("../utils/Utils");

const scrapeResults = async (query) => {
    /*

    puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox'], // This was important. Can't remember why
    });

    */
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const num = 10;

    await page.goto(`https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`)
    
    await page.waitForSelector('form');
    const form = await page.evaluate(() => {
        document.querySelector('form').submit();
    });

    await page.waitForNavigation();
    
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 0.1
    });

    var titleList = [];
    var titles = await page.$$("#contents.style-scope ytd-item-section-renderer #video-title")
    for (i = 0; i < num; i++) {
        titleList.push(await page.evaluate(el => el.innerText, titles[i]))
    }

    var channelList = [];
    var channels = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope #channel-info ytd-channel-name a")
    for (i = 0; i < num; i++) {
        channelList.push(await page.evaluate(el => el.innerText, channels[i]))
    }

    var thumbnailList = [];
    var thumbnails = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope ytd-thumbnail #img")
    for (i = 0; i < num; i++) {
        thumbnailList.push(await page.evaluate(el => el.src, thumbnails[i]))
    }

    var idList = [];
    var ids = await page.$$("#contents.style-scope ytd-item-section-renderer .style-scope ytd-thumbnail > a")
    for (i = 0; i < num; i++) {
        var unformattedId = (await page.evaluate(el => (el.href), ids[i]))
        idList.push(Utils.getVideoId(unformattedId))
    }

    var searchResults = [];
    for (i = 0; i < num; i++) {
        searchResults.push([titleList[i], channelList[i], thumbnailList[i], idList[i]])
    }

    // If it failed to get the thumbnail from the scrape, we will instead predict it
    searchResults.forEach(video => {
        if(video[2] == "" ){
            video[2] = `https://img.youtube.com/vi/${video[3]}/mqdefault.jpg`;
        }
    })

    return searchResults;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.scrapeResults = scrapeResults;