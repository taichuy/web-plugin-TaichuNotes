
export function replaceVariables(
  template: unknown,
  variables: Record<string, string>
): unknown {
  if (typeof template === "string") {
    // Optimization: if template is exactly one of the variables, return the value directly
    // This avoids regex overhead and ensures raw content is preserved exactly as the user intended
    if (Object.prototype.hasOwnProperty.call(variables, template)) {
      return variables[template]
    }

    // Sort keys by length to ensure longest match wins (e.g. $var_name vs $var)
    const keys = Object.keys(variables).sort((a, b) => b.length - a.length)
    if (keys.length === 0) return template

    // Escape all keys for regex
    const escapedKeys = keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    const pattern = new RegExp(escapedKeys.join("|"), "g")

    // Use callback to prevent replacement pattern substitution (e.g. $&, $`, $')
    return template.replace(pattern, (matched) => variables[matched])
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
