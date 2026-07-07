import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /subsc で配信するためのサブパス
  basePath: "/subsc",
};

export default nextConfig;
