export function isInvalidHtmlVideoInfoResponse(error: unknown) {
  const value = error as { code?: unknown; cause?: { code?: unknown } };
  return (
    value?.code === "get-links-invalid-response" ||
    value?.cause?.code === "get-links-invalid-response"
  );
}

export async function retryInvalidHtmlResponse<T>(
  execute: (attempt: 1 | 2) => Promise<T>,
  onRetry: () => void,
  delay: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<T> {
  try {
    return await execute(1);
  } catch (error) {
    if (!isInvalidHtmlVideoInfoResponse(error)) throw error;
    onRetry();
    await delay(500);
    return execute(2);
  }
}
