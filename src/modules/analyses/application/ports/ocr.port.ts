import { ImageUpload, OcrResult } from '../../domain/analysis.types';

export const OCR_PORT = Symbol('OCR_PORT');

export interface OcrPort {
  recognize(image: ImageUpload): Promise<OcrResult>;
}
