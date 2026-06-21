import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /cards で配信するためのサブパス
  basePath: "/cards",
};

export default nextConfig;
