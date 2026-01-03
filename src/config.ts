export const SITE = {
  website: "https://yourname.pages.dev/", // replace with custom domain later
  author: "Shivam",
  profile: "https://yourname.pages.dev/",
  desc: "Personal blog about quantitative finance, philosophy, and building things.",
  title: "Shivam's Blog",
  ogImage: "og-image.jpg",
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
} as const;
