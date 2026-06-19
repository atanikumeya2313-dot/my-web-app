import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /quake で配信するためのサブパス
  basePath: '/quake',
};

export default nextConfig;
