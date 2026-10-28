import { defineConfig, loadEnv } from "vite";
import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dispatchShopReceipt } from "./api/send-shop-receipt.js";
import { confirmWalleeReturn } from "./api/confirm-walle-return.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function cleanUrlsPlugin(root) {
  function rewrite(req) {
    const raw = req.url || "/";
    const q = raw.indexOf("?");
    const pathname = q === -1 ? raw : raw.slice(0, q);
    const query = q === -1 ? "" : raw.slice(q);
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/walle-api") ||
      pathname.startsWith("/@") ||
      pathname.startsWith("/node_modules")
    ) {
      return null;
    }
    if (pathname.endsWith(".html")) {
      const clean =
        pathname === "/index.html"
          ? "/"
          : pathname.endsWith("/index.html")
            ? pathname.slice(0, -"/index.html".length) || "/"
            : pathname.slice(0, -5);
      return { redirect: clean + query };
    }
    if (pathname === "/" || pathname.includes(".")) return null;
    const htmlPath = resolve(root, pathname.slice(1) + ".html");
    if (existsSync(htmlPath)) return { rewrite: pathname + ".html" + query };
    const indexPath = resolve(root, pathname.slice(1), "index.html");
    if (existsSync(indexPath)) return { rewrite: pathname + "/index.html" + query };
    return null;
  }

  function middleware(req, res, next) {
    const action = rewrite(req);
    if (!action) {
      next();
      return;
    }
    if (action.redirect) {
      res.statusCode = 302;
      res.setHeader("Location", action.redirect);
      res.end();
      return;
    }
    req.url = action.rewrite;
    next();
  }

  return {
    name: "onurik-clean-urls",
    configureServer: function (server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: function (server) {
      server.middlewares.use(middleware);
    },
  };
}

function readRequestBody(req) {
  return new Promise(function (resolveBody, reject) {
    const chunks = [];
    req.on("data", function (chunk) {
      chunks.push(chunk);
    });
    req.on("end", function () {
      resolveBody(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function shopReceiptApiPlugin(env) {
  function receiptMiddleware(req, res, next) {
    const url = req.url ? req.url.split("?")[0] : "";
    if (url !== "/api/shop-receipt") {
      next();
      return;
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      return;
    }
    readRequestBody(req)
      .then(function (raw) {
        const payload = JSON.parse(raw || "{}");
        return dispatchShopReceipt(payload.order, env);
      })
      .then(function (result) {
        res.statusCode = result.ok ? 200 : 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      })
      .catch(function () {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Invalid receipt request." }));
      });
  }
  return {
    name: "onurik-shop-receipt-api",
    configureServer: function (server) {
      server.middlewares.use(receiptMiddleware);
    },
    configurePreviewServer: function (server) {
      server.middlewares.use(receiptMiddleware);
    },
  };
}

function walleReturnApiPlugin(env) {
  function returnMiddleware(req, res, next) {
    const url = req.url ? req.url.split("?")[0] : "";
    if (url !== "/api/walle-return") {
      next();
      return;
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      return;
    }
    readRequestBody(req)
      .then(function (raw) {
        return confirmWalleeReturn(JSON.parse(raw || "{}"), env);
      })
      .then(function (result) {
        res.statusCode = result.ok ? 200 : 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      })
      .catch(function () {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Invalid payment return." }));
      });
  }
  return {
    name: "onurik-walle-return-api",
    configureServer: function (server) {
      server.middlewares.use(returnMiddleware);
    },
    configurePreviewServer: function (server) {
      server.middlewares.use(returnMiddleware);
    },
  };
}

function walleDevProxyPlugin(env) {
  const target = String(
    env.VITE_WALLE_API_URL || "https://pmtlwsdythsngetkaalq.supabase.co/functions/v1/api"
  ).replace(/\/$/, "");
  const allowedOrigin = "https://www.onurik.space";

  function proxyMiddleware(req, res, next) {
    const rawUrl = req.url || "";
    const pathname = rawUrl.split("?")[0];
    if (!pathname.startsWith("/walle-api/")) {
      next();
      return;
    }
    const suffix = pathname.replace(/^\/walle-api/, "");
    const query = rawUrl.includes("?") ? rawUrl.slice(rawUrl.indexOf("?")) : "";
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    const proceed = hasBody ? readRequestBody(req) : Promise.resolve("");
    proceed
      .then(function (raw) {
        const headers = {
          Authorization: req.headers.authorization || "",
          Origin: allowedOrigin,
        };
        if (hasBody) headers["Content-Type"] = "application/json";
        return fetch(target + suffix + query, {
          method: req.method,
          headers: headers,
          body: hasBody ? raw : undefined,
        });
      })
      .then(function (upstream) {
        return upstream.text().then(function (text) {
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
          res.end(text);
        });
      })
      .catch(function () {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Payment proxy failed." }));
      });
  }

  return {
    name: "onurik-walle-dev-proxy",
    configureServer: function (server) {
      server.middlewares.use(proxyMiddleware);
    },
    configurePreviewServer: function (server) {
      server.middlewares.use(proxyMiddleware);
    },
  };
}

const SITE_ORIGIN = "https://www.onurik.space";
const SITEMAP_STATIC = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/works", priority: "0.9", changefreq: "weekly" },
  { path: "/about", priority: "0.8", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/shop", priority: "0.8", changefreq: "weekly" },
  { path: "/shop/returns", priority: "0.4", changefreq: "yearly" },
];

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Published rows from a public Supabase table (same anon access the site itself uses). */
async function fetchRows(env, table, query) {
  const base = String(env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!base || !key) return [];
  try {
    const res = await fetch(base + "/rest/v1/" + table + "?" + query, {
      headers: { apikey: key, Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Writes dist/sitemap.xml after each build: the main pages plus every published project
 * (/work?id=) and product (/shop/product?id=) when Supabase credentials are available.
 */
function sitemapPlugin(env) {
  let outDir = "";
  return {
    name: "onurik-sitemap",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = SITEMAP_STATIC.map(function (u) {
        return { loc: SITE_ORIGIN + u.path, lastmod: today, changefreq: u.changefreq, priority: u.priority };
      });
      const projects = await fetchRows(env, "onurik_projects", "select=id,updated_at,status&status=eq.published");
      projects.forEach(function (row) {
        urls.push({
          loc: SITE_ORIGIN + "/work?id=" + encodeURIComponent(row.id),
          lastmod: String(row.updated_at || today).slice(0, 10),
          changefreq: "monthly",
          priority: "0.7",
        });
      });
      const products = await fetchRows(env, "onurik_shop_products", "select=id,updated_at,published&published=eq.true");
      products.forEach(function (row) {
        urls.push({
          loc: SITE_ORIGIN + "/shop/product?id=" + encodeURIComponent(row.id),
          lastmod: String(row.updated_at || today).slice(0, 10),
          changefreq: "weekly",
          priority: "0.6",
        });
      });
      const body =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls
          .map(function (u) {
            return (
              "  <url><loc>" +
              xmlEscape(u.loc) +
              "</loc><lastmod>" +
              u.lastmod +
              "</lastmod><changefreq>" +
              u.changefreq +
              "</changefreq><priority>" +
              u.priority +
              "</priority></url>"
            );
          })
          .join("\n") +
        "\n</urlset>\n";
      const { writeFileSync } = await import("fs");
      writeFileSync(resolve(outDir, "sitemap.xml"), body);
    },
  };
}

export default defineConfig(function ({ mode }) {
  const env = loadEnv(mode, resolve(__dirname, ".."), "");
  return {
    root: __dirname,
    envDir: resolve(__dirname, ".."),
    plugins: [
      cleanUrlsPlugin(__dirname),
      shopReceiptApiPlugin(env),
      walleReturnApiPlugin(env),
      walleDevProxyPlugin(env),
      sitemapPlugin(env),
    ],
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
          adminShop: resolve(__dirname, "admin/shop.html"),
          adminRevenue: resolve(__dirname, "admin/revenue.html"),
          shop: resolve(__dirname, "shop/index.html"),
          shopProduct: resolve(__dirname, "shop/product.html"),
          shopCart: resolve(__dirname, "shop/cart.html"),
          shopCheckout: resolve(__dirname, "shop/checkout.html"),
          shopReturns: resolve(__dirname, "shop/returns.html"),
        },
      },
    },
  };
});
