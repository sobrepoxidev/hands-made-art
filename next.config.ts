import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mzeixepwwyowiqgwkopw.supabase.co', // TU dominio de Supabase
        pathname: '/storage/v1/object/public/**', // Permitir todas las imágenes en el bucket público
      },
    ],
  },
};

export default withNextIntl(nextConfig);
