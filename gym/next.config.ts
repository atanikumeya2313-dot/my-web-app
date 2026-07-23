import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /gym で配信するためのサブパス
  basePath: "/gym",
};

export default nextConfig;
