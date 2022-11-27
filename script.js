function convertYoutubeVideoDurationSyntaxToSeconds(youtubeDurationString) {
    var a = youtubeDurationString.match(/\d+/g);

    if (youtubeDurationString.indexOf('M') >= 0 && youtubeDurationString.indexOf('H') == -1 && youtubeDurationString.indexOf('S') == -1) {
        a = [0, a[0], 0];
    }

    if (youtubeDurationString.indexOf('H') >= 0 && youtubeDurationString.indexOf('M') == -1) {
        a = [a[0], 0, a[1]];
    }
    if (youtubeDurationString.indexOf('H') >= 0 && youtubeDurationString.indexOf('M') == -1 && youtubeDurationString.indexOf('S') == -1) {
        a = [a[0], 0, 0];
    }

    youtubeDurationString = 0;

    if (a.length == 3) {
        youtubeDurationString = youtubeDurationString + parseInt(a[0]) * 3600;
        youtubeDurationString = youtubeDurationString + parseInt(a[1]) * 60;
        youtubeDurationString = youtubeDurationString + parseInt(a[2]);
    }

    if (a.length == 2) {
        youtubeDurationString = youtubeDurationString + parseInt(a[0]) * 60;
        youtubeDurationString = youtubeDurationString + parseInt(a[1]);
    }

    if (a.length == 1) {
        youtubeDurationString = youtubeDurationString + parseInt(a[0]);
    }

    return youtubeDurationString
}

async function getShortLength(shortId) {
    key = '<apiKey>'

    const url = `https://www.googleapis.com/youtube/v3/videos?key=${key}&part=contentDetails&id=${shortId}`

    response = await fetch(url)
    shortLengthYoutubeSyntax = (await response.json()).items[0].contentDetails.duration
    shortLengthInSeconds = convertYoutubeVideoDurationSyntaxToSeconds(shortLengthYoutubeSyntax)
    return shortLengthInSeconds
}

function isShortId(shortId) {
    return shortId.length == 11 // short ids are 11 chars long
}

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let tabs = await chrome.tabs.query(queryOptions);

    if(tabs && tabs[0] && tabs[0].url) {
        return tabs[0]
    }
    return undefined
}

async function isInYoutubeShortsPage() {
    currentTab = await getCurrentTab()

    if (currentTab == undefined) return false

    url = currentTab.url

    if (url == undefined) {
        return false
    } else {
        return /https\:\/\/www\.youtube\.com\/shorts\/.+/.test(url)
    }
}

function getShortId(url) {
    return url.replace('https://www.youtube.com/shorts/','')
}

async function isUrlChanged(previousUrl) {
    currentTab = await getCurrentTab()

    if (!currentTab) return false

    currentUrl = currentTab.url

    if(previousUrl == '') return false

    return previousUrl != currentUrl ? true : false
}

async function sleepInSeconds(shortLength, previousUrl) {
    for (let index = 0; index < shortLength; index++) {
        await new Promise(r => setTimeout(r, 1000))
        if (changedUrl) {
            changedUrl = false
            return true
        }
    }
    return false
}

function clickNextShort() {
    buttonXpath = '//*[@id="navigation-button-down"]/ytd-button-renderer/yt-button-shape/button'
    element = document.evaluate(buttonXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    element.click()
}

function clickNextShortInjectScript(tabId) {
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: clickNextShort
    })
}

async function main() {
    chrome.action.setIcon({ path: {"128": "paused_player_icon128.png"} })
    isPlayerEnabled = false
    changedUrl = false

    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        changedUrl = true
    })

    await chrome.action.onClicked.addListener(async function(tab) { 
        isPlayerEnabled = !isPlayerEnabled

        if(isPlayerEnabled) {
            await chrome.action.setIcon({ path: {"128": "started_player_icon128.png"} })
        } else {
            await chrome.action.setIcon({ path: {"128": "paused_player_icon128.png"} })
        }
    })

    while(true) {
        // checks every second if in shorts page
        await sleepInSeconds(1, '')

        if (!isPlayerEnabled) continue
        if (!(await isInYoutubeShortsPage())) continue

        currentTab = await getCurrentTab()
        shortId = getShortId(currentTab.url)

        if(isShortId(shortId)) {
            shortLengthInSeconds = await getShortLength(shortId)
            console.log(`id: ${shortId} | length: ${shortLengthInSeconds}`)
            brokeSleep = await sleepInSeconds(shortLengthInSeconds - 1, currentTab.url)
            if (!brokeSleep && isPlayerEnabled) clickNextShortInjectScript(currentTab.id)
        }
    }
}



main()