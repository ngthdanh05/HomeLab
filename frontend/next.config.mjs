/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
