import { useStorage } from "@plasmohq/storage/hook"
import { useCallback } from "react"

import enMessages from "../../_locales/en/messages.json"
import zhMessages from "../../_locales/zh_CN/messages.json"

export type Locale = "en" | "zh"

// Type for message object
type MessageData = {
  message: string
  description?: string
}

const messages: Record<Locale, Record<string, MessageData>> = {
  en: enMessages,
  zh: zhMessages
}

export const useI18n = () => {
  const [lang, setLang] = useStorage<Locale>("user_language", "zh")

  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>) => {
      // Default to zh if lang is not yet loaded or invalid
      const currentLang = lang || "zh"
      const localeMessages = messages[currentLang] || messages["zh"]
      let message = localeMessages[key]?.message || key

      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          message = message.replace(`{${placeholder}}`, String(value))
        })
      }

      return message
    },
    [lang]
  )

  return { t, lang, setLang }
}
