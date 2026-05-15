import type { RGB } from '../lib/color-utils';
import type { MosaicConfig } from '../lib/mosaic-engine';
import {
  getBlockAverageColor,
  findNearestColor,
  findNearestColorWeighted,
} from '../lib/color-utils';

type WorkerMessage = {
  type: 'generate';
  img2ImageData: ImageData;
  palette: RGB[];
  config: MosaicConfig;
  width: number;
  height: number;
};

type WorkerResponse = {
  type: 'complete';
  dataUrl: string;
};

function fillBlock(
  imageData: ImageData,
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
      const index = (y * imgWidth + x) * 4;
      imageData.data[index] = color.r;
      imageData.data[index + 1] = color.g;
      imageData.data[index + 2] = color.b;
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

async function generateMosaicInWorker(
  img2ImageData: ImageData,
  palette: RGB[],
  config: MosaicConfig,
  width: number,
  height: number
): Promise<string> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context in worker');
  }

  ctx.putImageData(img2ImageData, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);

  const matchFn =
    config.matchMode === 'weighted'
      ? findNearestColorWeighted
      : findNearestColor;

  for (let y = 0; y < height; y += config.blockSize) {
    for (let x = 0; x < width; x += config.blockSize) {
      const avgColor = getBlockAverageColor(
        imageData,
        x,
        y,
        config.blockSize,
        width,
        height
      );
      const nearest = matchFn(avgColor, palette);
      fillBlock(imageData, x, y, config.blockSize, nearest, width, height);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, img2ImageData, palette, config, width, height } = e.data;

  if (type !== 'generate') {
    return;
  }

  try {
    const dataUrl = await generateMosaicInWorker(
      img2ImageData,
      palette,
      config,
      width,
      height
    );

    const response: WorkerResponse = { type: 'complete', dataUrl };
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};