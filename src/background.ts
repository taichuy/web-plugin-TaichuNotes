import { localStorage } from "~lib/storage"

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "CLIPPER_DATA") {
    console.log("Received clipper data", request.data)
    await localStorage.set("current_clip", request.data)
    
    // Optional: Notify user
    chrome.action.setBadgeText({ text: "1", tabId: sender.tab?.id })
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId: sender.tab?.id })
  }
})

// Open side panel on icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

