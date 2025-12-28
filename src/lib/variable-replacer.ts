
export function replaceVariables(
  template: unknown,
  variables: Record<string, string>
): unknown {
  if (typeof template === "string") {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      // Use a global regex to replace all occurrences
      // Escape the key for regex usage (though $ is special, we want literal match)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      result = result.replace(new RegExp(escapedKey, "g"), value)
    }
    return result
  } else if (Array.isArray(template)) {
    return template.map((item) => replaceVariables(item, variables))
  } else if (typeof template === "object" && template !== null) {
    const newObj: Record<string, unknown> = {}
    for (const key in template) {
      newObj[key] = replaceVariables((template as Record<string, unknown>)[key], variables)
    }
    return newObj
  }
  return template
}
