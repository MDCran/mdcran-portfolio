/** Incremental SSE line decoding: network chunks are not message boundaries. */
export function createStreamLines() {
  const decoder = new TextDecoder();
  let pending = "";
  return (chunk?: Uint8Array): string[] => {
    pending += chunk
      ? decoder.decode(chunk, { stream: true })
      : decoder.decode();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    if (!chunk && pending) {
      lines.push(pending);
      pending = "";
    }
    return lines;
  };
}
export function isNoisyTranscript(text: string): boolean {
  const clean = text.trim();
  return (
    !clean ||
    /^(?:um+|uh+|hmm+|mm+)[.!?\s]*$/i.test(clean) ||
    !/[\p{L}\p{N}]/u.test(clean)
  );
}
