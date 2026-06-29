/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep heavy native/onnx packages out of the webpack bundle so they load from node_modules at runtime.
  serverExternalPackages: [
    '@xenova/transformers',
    'onnxruntime-node',
    'sharp',
    'pdf-parse',
    'mammoth',
    'xlsx',
    'docx',
  ],
  // Allow the preview origin to talk to /_next/* during dev.
  allowedDevOrigins: ['*.preview.emergentagent.com', '*.preview.emergentcf.cloud'],
}

module.exports = nextConfig
