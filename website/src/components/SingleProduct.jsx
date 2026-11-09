import { productImage } from "../images";
import { Badge, Button } from "react-bootstrap";
import { FaShippingFast } from "react-icons/fa";
import { CartState } from "../context/Context";
import Rating from "./Rating";

const SingleProduct = ({ prod }) => {
  const {
    state: { cart },
    dispatch,
  } = CartState();
  const inCart = cart.some((p) => p.itemId === prod.itemId);
  const inStock = Number(prod.inStock) > 0;

  return (
    <article className="ea-card ea-tile">
      <img className="ea-tile-img" src={productImage(prod.itemId)} alt={prod.name} loading="lazy" />
      <div className="ea-tile-body">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h2 className="ea-tile-title">{prod.name}</h2>
          <Badge bg="light" text="dark" className="border">{prod.partner}</Badge>
        </div>
        <span className="ea-tile-meta">{prod.category} · Size {prod.size} · SKU {prod.sku.slice(0, 8)}</span>
        <Rating rating={prod.ratings / 2} label={`${prod.name} rating`} />
        <div className="d-flex align-items-baseline justify-content-between">
          <span className="ea-price">${prod.price}</span>
          <span className={`small ${prod.fastDelivery ? "text-success" : "text-muted"}`}>
            {prod.fastDelivery ? <><FaShippingFast aria-hidden="true" /> Fast delivery</> : "4-day delivery"}
          </span>
        </div>
        <span className={`small ${inStock ? "text-muted" : "text-danger"}`}>
          {inStock ? `${prod.inStock} in stock` : "Out of stock"}
        </span>
        <div className="ea-tile-actions">
          {inCart ? (
            <Button variant="outline-danger" className="w-100"
              onClick={() => dispatch({ type: "REMOVE_FROM_CART", payload: prod })}>
              Remove from cart
            </Button>
          ) : (
            <Button variant="primary" className="w-100" disabled={!inStock}
              onClick={() => dispatch({ type: "ADD_TO_CART", payload: prod })}>
              {inStock ? "Add to cart" : "Out of stock"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default SingleProduct;
