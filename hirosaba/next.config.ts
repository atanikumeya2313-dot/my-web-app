import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /hirosaba で配信するためのサブパス
  basePath: "/hirosaba",
};

export default nextConfig;
