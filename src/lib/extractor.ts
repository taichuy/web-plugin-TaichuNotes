import { Readability } from "@mozilla/readability"
import TurndownService from "turndown"

import type { ExtractedData, ExtractMode } from "./types"

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced"
})

turndownService.addRule("remove-irrelevant", {
  filter: ["script", "style", "noscript", "iframe", "nav", "footer", "form"],
  replacement: () => ""
})

function getMetaContent(doc: Document, name: string): string | undefined {
  const element = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
  return element?.getAttribute("content") || undefined
}

export function extractContent(
  mode: ExtractMode,
  doc: Document = document,
  targetElement?: Element
): ExtractedData {
  const url = doc.location.href
  let title = doc.title
  let contentHtml = ""
  let author = getMetaContent(doc, "author") || getMetaContent(doc, "article:author")
  const publishedTime = getMetaContent(doc, "article:published_time") || getMetaContent(doc, "date")

  // Clone document to avoid modifying the actual page during Readability parsing
  const clone = doc.cloneNode(true) as Document
  // CSP: Prevent script execution in clone
  const scripts = clone.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  try {
    if (mode === "smart") {
      const reader = new Readability(clone)
      const article = reader.parse()
      if (article) {
        contentHtml = article.content
        if (article.title) title = article.title
        if (article.byline) author = article.byline
      } else {
        contentHtml = clone.body.innerHTML
      }
    } else if (mode === "full") {
      contentHtml = clone.body.innerHTML
    } else if (mode === "selected") {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const div = doc.createElement("div")
        for (let i = 0; i < selection.rangeCount; i++) {
          div.appendChild(selection.getRangeAt(i).cloneContents())
        }
        contentHtml = div.innerHTML
      }
    } else if (mode === "selection" && targetElement) {
      contentHtml = targetElement.outerHTML
    }
  } catch (e) {
    console.error("Extraction failed", e)
    contentHtml = clone.body.innerHTML // Fallback
  }

  const content = turndownService.turndown(contentHtml || "")

  return {
    title,
    content,
    url,
    author,
    publishedTime,
    html: contentHtml
  }
}
