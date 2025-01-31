let pageData = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'pageData') {
        pageData = message.data;
    }
});


// Send data to popup when requested
chrome.runtime.onConnect.addListener(port => {
    if (port.name === "popup") {
        port.postMessage(pageData);
    }
});