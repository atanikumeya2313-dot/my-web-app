import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /diary で配信するためのサブパス
  basePath: "/diary",
};

export default nextConfig;
