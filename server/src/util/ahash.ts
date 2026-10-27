import sharp from 'sharp';

/** 8x8 average hash → 64-bit hex string. */
export async function averageHash(bytes: Buffer): Promise<string> {
  const { data } = await sharp(bytes)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (const value of data) sum += value;
  const avg = sum / data.length;

  let bits = 0n;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i]! >= avg) bits |= 1n << BigInt(63 - i);
  }
  return bits.toString(16).padStart(16, '0');
}

export function hammingDistanceHex(a: string, b: string): number {
  const x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = x;
  let count = 0;
  while (n > 0n) {
    count += Number(n & 1n);
    n >>= 1n;
  }
  return count;
}

/** Map Hamming distance (0–64) to similarity score 0–1. */
export function hashSimilarity(a: string, b: string): number {
  const distance = hammingDistanceHex(a, b);
  return Math.max(0, 1 - distance / 64);
}
