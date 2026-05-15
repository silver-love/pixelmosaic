export type LoadedImage = {
  img: HTMLImageElement;
  width: number;
  height: number;
};

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
];

const MAX_DIMENSION = 2048;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

function scaleImageIfNeeded(
  img: HTMLImageElement
): { img: HTMLImageElement; width: number; height: number } {
  if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
    return { img, width: img.width, height: img.height };
  }

  const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { img, width: img.width, height: img.height };
  }
  ctx.drawImage(img, 0, 0, width, height);

  const scaledImg = new Image();
  scaledImg.src = canvas.toDataURL();
  return { img: scaledImg, width, height };
}

function loadImageFromDataUrl(dataUrl: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scaled = scaleImageIfNeeded(img);
      resolve({
        img: scaled.img,
        width: scaled.width,
        height: scaled.height,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      loadImageFromDataUrl(dataUrl).then(resolve).catch(reject);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function loadImageFromUrl(url: string): Promise<LoadedImage> {
  return loadImageFromDataUrl(url);
}