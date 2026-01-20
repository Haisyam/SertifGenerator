export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://sertifgenerator.vercel.app/sitemap.xml",
  };
}
