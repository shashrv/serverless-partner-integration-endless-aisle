import { useMemo } from "react";
import { Button } from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import Filters from "./Filters";
import SubHeader from "./SubHeader";
import { CartState } from "../context/Context";
import SingleProduct from "./SingleProduct";

export const filterProducts = (products, { sort, byStock, byFastDelivery, byRating, searchQuery, byPartner, searchSkuQuery }) => {
  // Copy before sorting: Array.prototype.sort mutates, and `products` is shared state.
  let list = [...products];
  if (byPartner) list = list.filter((p) => p.partner.toLowerCase() === byPartner.toLowerCase());
  if (!byStock) list = list.filter((p) => Number(p.inStock) > 0);
  if (byFastDelivery) list = list.filter((p) => p.fastDelivery);
  if (byRating) list = list.filter((p) => Number(p.ratings) / 2 >= byRating);
  if (searchQuery) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (searchSkuQuery) {
    const q = searchSkuQuery.trim().toLowerCase();
    list = list.filter((p) => p.sku.toLowerCase().includes(q) || p.itemId.toLowerCase() === q);
  }
  if (sort) list.sort((a, b) => (sort === "lowToHigh" ? a.price - b.price : b.price - a.price));
  return list;
};

const Products = ({ title = "Products", showHeader = true }) => {
  const { state: { products }, productState, productDispatch } = CartState();
  const visible = useMemo(() => filterProducts(products, productState), [products, productState]);

  return (
    <>
      {showHeader && (
        <SubHeader text={productState.byPartner ? `${productState.byPartner} catalog` : title}
          subtitle="Items ship directly from the partner to the customer." />
      )}
      <div className="ea-shop">
        <Filters />
        <section aria-label="Product results">
          <div className="ea-results-bar">
            <span aria-live="polite">{visible.length} of {products.length} products</span>
          </div>
          {visible.length > 0 ? (
            <div className="ea-grid">
              {visible.map((prod) => <SingleProduct prod={prod} key={prod.itemId} />)}
            </div>
          ) : (
            <div className="ea-card ea-empty">
              <FaSearch aria-hidden="true" />
              <p className="mb-3">No products match these filters.</p>
              <Button variant="outline-primary" onClick={() => productDispatch({ type: "CLEAR_FILTERS" })}>Clear filters</Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Products;
