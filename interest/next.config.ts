import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /interest で配信するためのサブパス
  basePath: '/interest',
};

export default nextConfig;
