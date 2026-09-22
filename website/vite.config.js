import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dispatchShopReceipt } from "./api/send-shop-receipt.js";
import { confirmWalleeReturn } from "./api/confirm-walle-return.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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

export default defineConfig(function ({ mode }) {
  const env = loadEnv(mode, resolve(__dirname, ".."), "");
  return {
    root: __dirname,
    envDir: resolve(__dirname, ".."),
    plugins: [shopReceiptApiPlugin(env), walleReturnApiPlugin(env), walleDevProxyPlugin(env)],
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
        },
      },
    },
  };
});
