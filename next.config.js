/** @type {import('next').NextConfig} */
const nextConfig = {
  // 開発環境用：プロキシキャッシュ対策
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "X-Cache-Bust",
            value: Date.now().toString(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
