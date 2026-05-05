export function normalizeUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) throw new Error('Empty URL');

  // If no protocol is provided, prepend https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  // Validate via URL constructor
  new URL(trimmed); // Will throw TypeError if invalid

  return trimmed;
}
