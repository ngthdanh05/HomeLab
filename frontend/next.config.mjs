/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  // Lets a production build run beside a `next dev` that is using .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // E2E coverage maps V8 coverage of the browser bundles back to src/ (e2e/playwright.config.ts).
  productionBrowserSourceMaps: process.env.E2E_SOURCEMAPS === "1",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config, { isServer, webpack }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Chặn triệt để các dependency không cần thiết từ @wagmi/connectors / baseAccount
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/svm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/evm": false,
      "@x402/svm": false,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      // React Native-only optional dependency of @metamask/sdk
      "@react-native-async-storage/async-storage": false,
    };

    // NormalModuleReplacementPlugin hỗ trợ cả Unix và Windows path
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /[\\/]@wagmi[\\/]connectors[\\/]dist[\\/]esm[\\/]baseAccount\.js$/,
        (resource) => {
          resource.request =
            "data:text/javascript,export function baseAccount(){ return {}; }";
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /[\\/]@base-org[\\/]account/,
        (resource) => {
          resource.request =
            "data:text/javascript,export default {}; export function getOrCreateSubscriptionOwnerWallet(){ return {}; } export function charge(){ return {}; }";
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /[\\/]@coinbase[\\/]cdp-sdk/,
        (resource) => {
          resource.request =
            "data:text/javascript,export default {}; export class CdpClient {}";
        }
      )
    );

    return config;
  },
};

export default nextConfig;
