import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: __dirname,
  envDir: resolve(__dirname, ".."),
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        works: resolve(__dirname, "works.html"),
        work: resolve(__dirname, "work.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
        admin: resolve(__dirname, "admin/index.html"),
        adminWorks: resolve(__dirname, "admin/works.html"),
        adminEnquiries: resolve(__dirname, "admin/enquiries.html"),
        adminBookings: resolve(__dirname, "admin/bookings.html"),
        adminSettings: resolve(__dirname, "admin/settings.html"),
        adminCarousel: resolve(__dirname, "admin/carousel.html"),
      },
    },
  },
});
