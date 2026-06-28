import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /appnotes で配信するためのサブパス
  basePath: "/appnotes",
};

export default nextConfig;
