export type RGB = { r: number; g: number; b: number };

export function getPixelColor(
  imageData: ImageData,
  x: number,
  y: number
): RGB {
  const index = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
  };
}

export function getBlockAverageColor(
  imageData: ImageData,
  startX: number,
  startY: number,
  blockSize: number,
  imgWidth: number,
  imgHeight: number
): RGB {
  const endX = Math.min(startX + blockSize, imgWidth);
  const endY = Math.min(startY + blockSize, imgHeight);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4;
      r += imageData.data[index];
      g += imageData.data[index + 1];
      b += imageData.data[index + 2];
      count++;
    }
  }

  if (count === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}

export function weightedColorDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    2 * (a.r - b.r) ** 2 + 4 * (a.g - b.g) ** 2 + 3 * (a.b - b.b) ** 2
  );
}

export function findNearestColor(target: RGB, palette: RGB[]): RGB {
  if (palette.length === 0) {
    return target;
  }

  let best = palette[0];
  let bestDist = colorDistance(target, best);

  for (let i = 1; i < palette.length; i++) {
    const dist = colorDistance(target, palette[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = palette[i];
    }
  }

  return best;
}

export function findNearestColorWeighted(target: RGB, palette: RGB[]): RGB {
  if (palette.length === 0) {
    return target;
  }

  let best = palette[0];
  let bestDist = weightedColorDistance(target, best);

  for (let i = 1; i < palette.length; i++) {
    const dist = weightedColorDistance(target, palette[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = palette[i];
    }
  }

  return best;
}

const LUT_SIZE = 32;
const LUT_STEP = 256 / LUT_SIZE;

function sqDist(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function sqDistWeighted(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

export function buildColorLUT(
  palette: RGB[],
  matchMode: 'nearest' | 'weighted'
): Uint8Array {
  const distFn = matchMode === 'weighted' ? sqDistWeighted : sqDist;
  const lut = new Uint8Array(LUT_SIZE * LUT_SIZE * LUT_SIZE * 3);

  for (let ri = 0; ri < LUT_SIZE; ri++) {
    for (let gi = 0; gi < LUT_SIZE; gi++) {
      for (let bi = 0; bi < LUT_SIZE; bi++) {
        const target: RGB = {
          r: Math.round(ri * LUT_STEP + LUT_STEP / 2),
          g: Math.round(gi * LUT_STEP + LUT_STEP / 2),
          b: Math.round(bi * LUT_STEP + LUT_STEP / 2),
        };

        let best = palette[0];
        let bestDist = distFn(target, best);
        for (let i = 1; i < palette.length; i++) {
          const d = distFn(target, palette[i]);
          if (d < bestDist) {
            bestDist = d;
            best = palette[i];
          }
        }

        const base = (ri * LUT_SIZE * LUT_SIZE + gi * LUT_SIZE + bi) * 3;
        lut[base] = best.r;
        lut[base + 1] = best.g;
        lut[base + 2] = best.b;
      }
    }
  }

  return lut;
}

export function lookupLUT(lut: Uint8Array, r: number, g: number, b: number): RGB {
  const ri = Math.min(Math.floor(r / LUT_STEP), LUT_SIZE - 1);
  const gi = Math.min(Math.floor(g / LUT_STEP), LUT_SIZE - 1);
  const bi = Math.min(Math.floor(b / LUT_STEP), LUT_SIZE - 1);
  const base = (ri * LUT_SIZE * LUT_SIZE + gi * LUT_SIZE + bi) * 3;
  return { r: lut[base], g: lut[base + 1], b: lut[base + 2] };
}