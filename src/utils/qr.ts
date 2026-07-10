import qrcode from 'qrcode-generator'

// A QR code for a URL as an inline SVG string (self-generated markup, safe to
// v-html). Error correction M is plenty for clean print scans.
export function qrSvg(url: string): string {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true })
}
