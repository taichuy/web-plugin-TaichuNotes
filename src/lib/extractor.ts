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

turndownService.addRule("custom-code-blocks", {
  filter: (node) => {
    return (
      node.nodeName === "DIV" &&
      (node.classList.contains("md-code-block") || node.classList.contains("md-code-block-light"))
    )
  },
  replacement: (_content, node) => {
    const element = node as HTMLElement
    // Extract language from the banner
    const languageSpan = element.querySelector(".d813de27")
    const language = languageSpan?.textContent?.trim() || ""

    // Extract code content
    // Priority: PRE tag > content excluding banner
    const pre = element.querySelector("pre")
    let code = ""
    
    if (pre) {
      code = pre.textContent || ""
    } else {
      // Clone to safely remove banner without affecting original DOM if needed (though we are in a clone already)
      const clone = element.cloneNode(true) as HTMLElement
      const banner = clone.querySelector(".md-code-block-banner-wrap")
      if (banner) banner.remove()
      code = clone.textContent || ""
    }

    return `\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`
  }
})

turndownService.addRule("dumi-code-blocks", {
  filter: (node) => {
    return node.nodeName === "DIV" && node.classList.contains("dumi-default-source-code")
  },
  replacement: (_content, node) => {
    const element = node as HTMLElement
    // Extract language
    const languageSpan = element.querySelector(".dumi-default-source-code-language")
    const language = languageSpan?.textContent?.trim() || ""

    // Extract code content
    const pre = element.querySelector("pre.prism-code")
    let code = ""
    if (pre) {
      code = pre.textContent || ""
    } else {
      code = element.textContent || ""
    }
    return `\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n`
  }
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
        contentHtml = article.content || ""
        if (article.title) {
          // Verify if the extracted title is valid
          // Heuristic: If original title contains extracted title, and extracted title is strictly shorter than the remaining part,
          // it is likely just the site name/brand (e.g. "DeepSeek" from "Analysis - DeepSeek").
          // In this case, we prefer the original full title to ensure we don't lose the main topic.
          const isSubstring = title.includes(article.title)
          const remainingLength = title.length - article.title.length
          const isBrandLike = isSubstring && remainingLength > article.title.length

          if (!isBrandLike) {
            title = article.title
          }
        }
        if (article.byline) author = article.byline
      } else {
        contentHtml = clone.body.innerHTML
      }
    } else if (mode === "full") {
      contentHtml = clone.body.innerHTML
    } else if (mode === "selected") {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        // Special handling: if selection is within a code block, extract as code block
        const range = selection.getRangeAt(0)
        let container: Node | null = range.commonAncestorContainer
        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentElement
        }
        
        const codeBlock = (container as Element)?.closest?.(".md-code-block, .md-code-block-light, pre, .dumi-default-source-code")
        
        if (codeBlock) {
          // It's inside a code block. Extract pure text and wrap in markdown code block.
          let language = ""
          
          // Try to find language for custom md blocks
          const mdLangSpan = codeBlock.querySelector(".d813de27")
          if (mdLangSpan) {
            language = mdLangSpan.textContent?.trim() || ""
          } else {
             // Try to find language for dumi blocks
             const dumiLangSpan = codeBlock.querySelector(".dumi-default-source-code-language")
             if (dumiLangSpan) {
               language = dumiLangSpan.textContent?.trim() || ""
             }
          }
          
          const codeText = selection.toString()
          
          // Construct a virtual HTML for turndown to process, or just handle it directly
          // We bypass turndown for this specific case to ensure exact text preservation
          contentHtml = `<pre><code class="language-${language}">${codeText}</code></pre>`
          
          // We can also return directly here if we want to skip turndown's escaping
          return {
            title,
            content: `\`\`\`${language}\n${codeText}\n\`\`\``,
            url,
            author,
            publishedTime,
            html: contentHtml
          }
        }

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
