import QRCode from 'qrcode';
import type { QrPayload } from './scanner';

export async function makeQrDataUrl(payload: QrPayload): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
  });
}
