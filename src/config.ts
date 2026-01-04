export const SITE = {
  website: "https://shivamrajdev.com", // Will update when domain is configured
  author: "Shivam Rajdev",
  profile: "https://shivamrajdev.com",
  desc: "Markets, mathematics, metaphysics—exploring ideas at the intersection of order and chaos",
  title: "Order in Chaos",
  ogImage: "og-image.png",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false, // Simplified design - remove archives page
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false, // Disable edit links since content is in Notion
    text: "Edit page",
    url: "",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Kolkata", // IST - Indian Standard Time
  googleAnalyticsId: "G-XXXXXXXXXX", // Replace with your GA4 Measurement ID
} as const;
