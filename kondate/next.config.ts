import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /kondate で配信するためのサブパス
  basePath: "/kondate",
};

export default nextConfig;
