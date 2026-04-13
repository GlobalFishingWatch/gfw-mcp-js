export function createToolResponse(text: string, structured: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: structured,
    isError: false,
  };
}

export function createErrorResponse(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}
