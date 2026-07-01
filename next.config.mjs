/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  // Export estatico para hospedar no Firebase Hosting (sem Cloud Functions).
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
