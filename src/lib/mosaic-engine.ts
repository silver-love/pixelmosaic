import type { LoadedImage } from './image-utils';
import type { RGB } from './color-utils';
import {
  getBlockAverageColor,
  findNearestColor,
  findNearestColorWeighted,
} from './color-utils';

export type MosaicConfig = {
  blockSize: number;
  matchMode: 'nearest' | 'weighted';
};

export type MosaicResult = {
  dataUrl: string;
  width: number;
  height: number;
};

export type AnimationFrame = {
  canvas: HTMLCanvasElement;
  progress: number;
  phase: 'pixelate' | 'reassemble' | 'reveal';
};

function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }
  return { canvas, ctx };
}

function drawImageToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx };
}

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

export function extractPalette(
  img1: LoadedImage,
  blockSize: number
): RGB[] {
  const { ctx } = drawImageToCanvas(img1.img, img1.width, img1.height);
  const imageData = ctx.getImageData(0, 0, img1.width, img1.height);
  const palette: RGB[] = [];

  for (let y = 0; y < img1.height; y += blockSize) {
    for (let x = 0; x < img1.width; x += blockSize) {
      const avgColor = getBlockAverageColor(
        imageData,
        x,
        y,
        blockSize,
        img1.width,
        img1.height
      );
      palette.push(avgColor);
    }
  }

  return palette;
}

export function generateMosaic(
  img2: LoadedImage,
  palette: RGB[],
  config: MosaicConfig
): MosaicResult {
  if (palette.length === 0) {
    throw new Error('Palette cannot be empty');
  }

  const { canvas, ctx } = drawImageToCanvas(img2.img, img2.width, img2.height);
  const imageData = ctx.getImageData(0, 0, img2.width, img2.height);

  const matchFn =
    config.matchMode === 'weighted'
      ? findNearestColorWeighted
      : findNearestColor;

  for (let y = 0; y < img2.height; y += config.blockSize) {
    for (let x = 0; x < img2.width; x += config.blockSize) {
      const avgColor = getBlockAverageColor(
        imageData,
        x,
        y,
        config.blockSize,
        img2.width,
        img2.height
      );
      const nearest = matchFn(avgColor, palette);
      fillBlock(
        imageData,
        x,
        y,
        config.blockSize,
        nearest,
        img2.width,
        img2.height
      );
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: img2.width,
    height: img2.height,
  };
}

export function generatePixelateFrames(
  img1: LoadedImage,
  targetBlockSize: number,
  frameCount: number
): HTMLCanvasElement[] {
  if (frameCount <= 0) {
    return [];
  }

  const { ctx: baseCtx } = drawImageToCanvas(
    img1.img,
    img1.width,
    img1.height
  );
  const baseImageData = baseCtx.getImageData(0, 0, img1.width, img1.height);
  const frames: HTMLCanvasElement[] = [];

  for (let f = 0; f < frameCount; f++) {
    const progress = (f + 1) / frameCount;
    const currentBlockSize = Math.max(
      1,
      Math.round(1 + (targetBlockSize - 1) * progress)
    );

    const { canvas: frameCanvas, ctx: frameCtx } = createCanvas(
      img1.width,
      img1.height
    );
    frameCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(baseImageData.data),
        img1.width,
        img1.height
      ),
      0,
      0
    );

    if (currentBlockSize > 1) {
      const frameImageData = frameCtx.getImageData(
        0,
        0,
        img1.width,
        img1.height
      );

      for (let y = 0; y < img1.height; y += currentBlockSize) {
        for (let x = 0; x < img1.width; x += currentBlockSize) {
          const avgColor = getBlockAverageColor(
            baseImageData,
            x,
            y,
            currentBlockSize,
            img1.width,
            img1.height
          );
          fillBlock(
            frameImageData,
            x,
            y,
            currentBlockSize,
            avgColor,
            img1.width,
            img1.height
          );
        }
      }

      frameCtx.putImageData(frameImageData, 0, 0);
    }

    frames.push(frameCanvas);
  }

  return frames;
}

export function generateRevealFrames(
  img2: LoadedImage,
  palette: RGB[],
  targetBlockSize: number,
  frameCount: number
): HTMLCanvasElement[] {
  if (frameCount <= 0 || palette.length === 0) {
    return [];
  }

  const { ctx: baseCtx } = drawImageToCanvas(
    img2.img,
    img2.width,
    img2.height
  );
  const baseImageData = baseCtx.getImageData(0, 0, img2.width, img2.height);
  const frames: HTMLCanvasElement[] = [];
  const startBlockSize = targetBlockSize * 4;

  for (let f = 0; f < frameCount; f++) {
    const progress = (f + 1) / frameCount;
    const currentBlockSize = Math.max(
      targetBlockSize,
      Math.round(startBlockSize - (startBlockSize - targetBlockSize) * progress)
    );

    const { canvas: frameCanvas, ctx: frameCtx } = createCanvas(
      img2.width,
      img2.height
    );
    const frameImageData = new ImageData(
      new Uint8ClampedArray(baseImageData.data),
      img2.width,
      img2.height
    );

    for (let y = 0; y < img2.height; y += currentBlockSize) {
      for (let x = 0; x < img2.width; x += currentBlockSize) {
        const avgColor = getBlockAverageColor(
          baseImageData,
          x,
          y,
          currentBlockSize,
          img2.width,
          img2.height
        );
        const nearest = findNearestColor(avgColor, palette);
        fillBlock(
          frameImageData,
          x,
          y,
          currentBlockSize,
          nearest,
          img2.width,
          img2.height
        );
      }
    }

    frameCtx.putImageData(frameImageData, 0, 0);
    frames.push(frameCanvas);
  }

  return frames;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'image/png' | 'image/jpeg' | 'image/webp'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      format
    );
  });
}

export function downloadImage(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}