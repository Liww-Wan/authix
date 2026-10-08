// QR local: leitura com jsQR (arquivo/câmera) e geração com qrcode-generator. Nada sai do navegador.
/* global jsQR, qrcode */
function scan(src, w, h) {
  const c = document.createElement('canvas'), s = Math.min(1, 1200 / Math.max(w, h));
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height);
  return jsQR(d.data, d.width, d.height);
}
export function decodeFile(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const r = scan(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); r ? res(r.data) : rej(new Error('QR Code não encontrado na imagem')); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagem inválida')); };
    img.src = url;
  });
}
export async function startCamera(video, onResult) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream; await video.play();
  let on = true;
  const stop = () => { on = false; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
  (function loop() {
    if (!on) return;
    if (video.videoWidth) { const r = scan(video, video.videoWidth, video.videoHeight); if (r) { stop(); onResult(r.data); return; } }
    requestAnimationFrame(loop);
  })();
  return stop;
}
export function makeQR(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(6); }
