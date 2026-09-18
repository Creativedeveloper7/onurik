import { formatKes } from "../shop/format.js";
import { orderStats } from "../shop/orders-store.js";
import { getCatalog, loadCatalog } from "../shop/products.js";

function fill(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

(async function init() {
  await loadCatalog({ includeHidden: true });
  const catalog = getCatalog();
  const stats = orderStats();
  const live = catalog.filter(function (item) {
    return item.published !== false;
  }).length;

  fill("admin-shop-products", String(live));
  fill(
    "admin-shop-products-note",
    catalog.length + " in catalog · " + live + " live on the shop"
  );
  fill("admin-shop-orders", String(stats.open));
  fill("admin-shop-orders-note", stats.total ? stats.total + " total orders" : "No orders yet.");
  fill("admin-shop-revenue", stats.revenue ? formatKes(stats.revenue) : "—");
  fill(
    "admin-shop-revenue-note",
    stats.revenue
      ? "Excludes cancelled orders"
      : "Revenue appears after a confirmed checkout."
  );
})();
