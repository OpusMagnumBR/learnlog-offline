import QrScanner from 'https://unpkg.com/qr-scanner@1.4.2/qr-scanner.min.js';
export async function scanOnce(videoEl) {
  return new Promise((resolve, reject) => {
    const scanner = new QrScanner(videoEl, result => {
      scanner.stop();
      resolve(result?.data || result);
    }, { returnDetailedScanResult: true });
    scanner.start().catch(reject);
  });
}
export async function drawQrToCanvas(canvas, text) {
  const { default: QRCode } = await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm');
  await QRCode.toCanvas(canvas, text, { width: 256, errorCorrectionLevel: 'M' });
}
