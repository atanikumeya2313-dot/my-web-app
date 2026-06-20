import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /todo で配信するためのサブパス
  basePath: "/todo",
};

export default nextConfig;
