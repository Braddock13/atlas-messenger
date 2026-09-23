const AVATAR_MAX_BYTES = 80_000;
const IMAGE_MAX_BYTES = 240_000;
const AVATAR_MAX_DIM = 320;
const IMAGE_MAX_DIM = 1280;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = src;
  });
}

async function encodeJpeg(
  file: File,
  maxDim: number,
  maxBytes: number,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Seules les images sont acceptées.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Fichier trop volumineux (8 Mo max).");
  }
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Compression impossible.");
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    let quality = 0.86;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > maxBytes && quality > 0.4) {
      quality -= 0.08;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > maxBytes) {
      throw new Error("Image trop lourde même après compression.");
    }
    return data;
  } finally {
    URL.revokeObjectURL(src);
  }
}

export function compressAvatar(file: File): Promise<string> {
  return encodeJpeg(file, AVATAR_MAX_DIM, AVATAR_MAX_BYTES);
}

export function compressChatImage(file: File): Promise<string> {
  return encodeJpeg(file, IMAGE_MAX_DIM, IMAGE_MAX_BYTES);
}

export function isAllowedDataImage(url: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(url);
}
