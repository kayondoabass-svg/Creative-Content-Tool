declare module "qrcode" {
  const QRCode: {
    toDataURL(text: string, options?: { width?: number; margin?: number; color?: { dark: string; light: string }; errorCorrectionLevel?: string }): Promise<string>;
  };
  export default QRCode;
}
