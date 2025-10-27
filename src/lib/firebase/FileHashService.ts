/**
 * FileHashService.ts
 * Utility for generating file hashes for deduplication
 * Uses SHA-256 hash to create unique identifier for files
 */

/**
 * Generate a SHA-256 hash of file contents
 * @param file File object to hash
 * @returns Promise<string> - Hex string representation of SHA-256 hash
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generate a SHA-256 hash from text content
 * @param text Text content to hash
 * @returns Promise<string> - Hex string representation of SHA-256 hash
 */
export async function generateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generate a unique filename hash combining the original filename and content hash
 * Useful for creating human-readable deduplication keys
 * @param fileName Original file name
 * @param contentHash SHA-256 hash of file contents
 * @returns string - Combined hash for deduplication
 */
export function createFileDeduplicationKey(fileName: string, contentHash: string): string {
  // Combine filename with first 8 chars of content hash for readability
  return `${fileName}-${contentHash.slice(0, 8)}`;
}
