/** Request abort and downstream stream cancellation both stop the paid provider.
 * A response-body cancellation is not guaranteed to abort NextRequest.signal. */
export function providerCancellation(incoming: AbortSignal) {
  const controller = new AbortController();
  return { signal: AbortSignal.any([incoming, controller.signal]), cancel: (reason?: unknown) => controller.abort(reason) };
}
export function relayProviderBody(body: ReadableStream<Uint8Array>, cancel: (reason?: unknown) => void): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  return new ReadableStream({
    async pull(controller) {
      try { const { done, value } = await reader.read(); if (done) controller.close(); else controller.enqueue(value); }
      catch (error) { cancel(error); controller.error(error); }
    },
    async cancel(reason) { cancel(reason); await reader.cancel(reason).catch(() => {}); },
  });
}
