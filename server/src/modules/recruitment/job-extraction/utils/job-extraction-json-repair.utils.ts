/** Remove leading ``` / ```json so we can find `{` even without a closing fence. */
export function stripLeadingMarkdownCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "");
}

/**
 * Finds the top-level JSON object: brace-aware, string-aware. If the model
 * output was truncated (e.g. maxOutputTokens), appends missing `}` / `]` and
 * strips a trailing comma before repair.
 */
export function extractOrRepairTopLevelJsonObject(raw: string): string | null {
  const unfenced = stripLeadingMarkdownCodeFence(raw).replace(
    /\s*```\s*$/i,
    ""
  );
  const start = unfenced.indexOf("{");
  if (start < 0) return null;

  const sliceIn = unfenced.slice(start);
  let inString = false;
  let escaped = false;
  const stack: ("{" | "[")[] = [];

  for (let i = 0; i < sliceIn.length; i += 1) {
    const c = sliceIn[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === "{") {
      stack.push("{");
    } else if (c === "[") {
      stack.push("[");
    } else if (c === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") {
        stack.pop();
        if (stack.length === 0) {
          return sliceIn.slice(0, i + 1);
        }
      }
    } else if (c === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  let s = sliceIn.trimEnd();
  s = s.replace(/,\s*$/g, "");
  if (stack.length === 0) {
    return s;
  }

  const closers: string[] = [];
  for (let k = stack.length - 1; k >= 0; k -= 1) {
    closers.push(stack[k] === "{" ? "}" : "]");
  }
  return s + closers.join("");
}

/**
 * JSON.parse requires newlines inside string values to be escaped as \n.
 * LLMs often emit literal line breaks inside quotes; this repairs that subset.
 */
export function escapeNewlinesInsideJsonStrings(jsonText: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonText.length; i += 1) {
    const c = jsonText[i];

    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }

    if (c === "\\") {
      result += c;
      escaped = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      result += c;
      continue;
    }

    if (inString) {
      if (c === "\r") {
        const next = jsonText[i + 1];
        if (next === "\n") {
          i += 1;
        }
        result += "\\n";
        continue;
      }
      if (c === "\n") {
        result += "\\n";
        continue;
      }
    }

    result += c;
  }

  return result;
}

/**
 * Text -> object for AI responses that must contain a single JSON object.
 *
 * Extraction is string-aware, so a `}` inside a reason or verdict string is not
 * mistaken for the end of the object. Literal newlines inside strings — which
 * JSON.parse rejects — are repaired on a second attempt.
 *
 * Throws when no JSON object can be recovered, so callers can retry the call.
 */
export function parseJsonObjectFromAiResponse(responseText: string): unknown {
  const jsonText = extractOrRepairTopLevelJsonObject(responseText);
  if (!jsonText) {
    throw new Error("No JSON object in provider response");
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    return JSON.parse(escapeNewlinesInsideJsonStrings(jsonText));
  }
}
