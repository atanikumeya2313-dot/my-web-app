import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ハブ（統合ドメイン）配下 /newshops で配信するためのサブパス
  basePath: "/newshops",
};

export default nextConfig;
