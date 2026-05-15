import type { RGB } from '../lib/color-utils';
import { buildColorLUT, lookupLUT } from '../lib/color-utils';

type GenerateMessage = {
  type: 'generate';
  img2Buffer: ArrayBuffer;
  width: number;
  height: number;
  palette: RGB[];
  blockSize: number;
  matchMode: 'nearest' | 'weighted';
};

type ProgressResponse = {
  type: 'progress';
  percent: number;
};

type CompleteResponse = {
  type: 'complete';
  dataUrl: string;
};

type ErrorResponse = {
  type: 'error';
  message: string;
};

function getBlockAverage(
  data: Uint8ClampedArray,
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
      const idx = (y * imgWidth + x) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function fillBlock(
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  blockSize: number,
  color: RGB,
  imgWidth: number,
  imgHeight: number
): void {
  const endX = Math.min(startX + blockSize, imgWidth);
  const endY = Math.min(startY + blockSize, imgHeight);
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imgWidth + x) * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
    }
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

async function generateMosaic(
  img2Buffer: ArrayBuffer,
  width: number,
  height: number,
  palette: RGB[],
  blockSize: number,
  matchMode: 'nearest' | 'weighted'
): Promise<string> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  const imgData = new ImageData(new Uint8ClampedArray(img2Buffer), width, height);
  ctx.putImageData(imgData, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const lut = buildColorLUT(palette, matchMode);

  const totalRows = Math.ceil(height / blockSize);
  let lastReportPercent = 0;

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const avgColor = getBlockAverage(data, x, y, blockSize, width, height);
      const nearest = lookupLUT(lut, avgColor.r, avgColor.g, avgColor.b);
      fillBlock(data, x, y, blockSize, nearest, width, height);
    }

    const rowIndex = Math.floor(y / blockSize) + 1;
    const percent = Math.round((rowIndex / totalRows) * 100);
    if (percent - lastReportPercent >= 5 || percent === 100) {
      lastReportPercent = percent;
      self.postMessage({ type: 'progress', percent } satisfies ProgressResponse);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(blob);
}

self.onmessage = async (e: MessageEvent<GenerateMessage>) => {
  const { type, img2Buffer, width, height, palette, blockSize, matchMode } = e.data;
  if (type !== 'generate') return;

  try {
    const dataUrl = await generateMosaic(
      img2Buffer, width, height, palette, blockSize, matchMode
    );
    self.postMessage({ type: 'complete', dataUrl } satisfies CompleteResponse);
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    } satisfies ErrorResponse);
  }
};