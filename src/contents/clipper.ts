import type { PlasmoCSConfig } from "plasmo"

import { extractContent } from "~lib/extractor"
import type { ExtractedData, ExtractMode } from "~lib/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

let selectionMode = false
let highlightedElement: HTMLElement | null = null

// Style for highlighter
const style = document.createElement("style")
style.textContent = `
  .taichuy-clipper-highlight {
    outline: 2px solid #3b82f6 !important;
    cursor: pointer !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
`
document.head.appendChild(style)

function enableSelectionMode() {
  selectionMode = true
  document.addEventListener("mouseover", handleMouseOver)
  document.addEventListener("click", handleClick, { capture: true })
  document.addEventListener("keydown", handleKeyDown)
}

function disableSelectionMode() {
  selectionMode = false
  if (highlightedElement) {
    highlightedElement.classList.remove("taichuy-clipper-highlight")
    highlightedElement = null
  }
  document.removeEventListener("mouseover", handleMouseOver)
  document.removeEventListener("click", handleClick, { capture: true })
  document.removeEventListener("keydown", handleKeyDown)
}

function handleMouseOver(e: MouseEvent) {
  if (!selectionMode) return
  const target = e.target as HTMLElement
  if (highlightedElement && highlightedElement !== target) {
    highlightedElement.classList.remove("taichuy-clipper-highlight")
  }
  highlightedElement = target
  highlightedElement.classList.add("taichuy-clipper-highlight")
}

function handleClick(e: MouseEvent) {
  if (!selectionMode) return
  e.preventDefault()
  e.stopPropagation()

  if (highlightedElement) {
    const data = extractContent("selection", document, highlightedElement)
    chrome.runtime.sendMessage({
      type: "CLIPPER_DATA",
      data
    })
    disableSelectionMode()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    disableSelectionMode()
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    const mode = request.mode as ExtractMode
    if (mode === "selection") {
      enableSelectionMode()
      sendResponse({ status: "selection-mode-started" })
    } else {
      try {
        const data = extractContent(mode, document)
        sendResponse({ status: "success", data })
      } catch (e) {
        sendResponse({ status: "error", message: e.message })
      }
    }
  }
  return true // Keep channel open for async response
})
