import { QRCodeSVG } from 'qrcode.react';

export default function ReportQr({ value, size = 80 }: { value: string; size?: number }) {
  return (
    <div className="rept-qr" aria-label="Report verification QR code">
      <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0f172a" level="M" />
    </div>
  );
}