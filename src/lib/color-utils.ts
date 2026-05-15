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