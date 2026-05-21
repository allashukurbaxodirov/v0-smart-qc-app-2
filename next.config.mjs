/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // jspdf va html2canvas faqat client-side ishlaydi
  serverExternalPackages: ['jspdf', 'html2canvas', 'fflate', 'pptxgenjs'],
}

export default nextConfig
