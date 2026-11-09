import { productImage } from "../images";
import { Button, Form } from "react-bootstrap";
import { AiFillDelete } from "react-icons/ai";
import { FaShoppingCart } from "react-icons/fa";
import { Link } from "react-router-dom";
import { CartState } from "../context/Context";
import SubHeader from "./SubHeader";

export const TAX_RATE = 8;
const money = (n) => `$${n.toFixed(2)}`;

const Cart = () => {
  const {
    state: { cart },
    dispatch,
  } = CartState();

  const subtotal = cart.reduce((acc, item) => acc + Number(item.price) * Number(item.qty), 0);
  const tax = subtotal * (TAX_RATE / 100);
  const itemCount = cart.reduce((acc, item) => acc + Number(item.qty), 0);

  if (cart.length === 0) {
    return (
      <>
        <SubHeader text="Cart" />
        <div className="ea-card ea-empty">
          <FaShoppingCart aria-hidden="true" />
          <p className="mb-3">Your cart is empty.</p>
          <Link to="/" className="btn btn-primary">Browse partners</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SubHeader text="Cart" subtitle={`${itemCount} item${itemCount === 1 ? "" : "s"} from ${new Set(cart.map((c) => c.partner)).size} partner(s)`} />
      <div className="ea-cart">
        <section className="ea-card" aria-label="Cart items">
          {cart.map((prod) => {
            // inStock is a string in the catalog; Array("2") would give one option.
            const maxQty = Math.max(1, Math.min(Number(prod.inStock) || 1, 10));
            return (
              <div className="ea-cart-row" key={prod.itemId}>
                <img src={productImage(prod.itemId)} alt="" />
                <div>
                  <div className="fw-semibold">{prod.name}</div>
                  <div className="text-muted small">{prod.partner} · Size {prod.size}</div>
                </div>
                <div className="text-nowrap">${prod.price}</div>
                <Form.Select size="sm" style={{ width: 80 }} aria-label={`Quantity for ${prod.name}`}
                  value={prod.qty}
                  onChange={(e) => dispatch({ type: "CHANGE_CART_QTY", payload: { itemId: prod.itemId, qty: Number(e.target.value) } })}>
                  {[...Array(maxQty).keys()].map((x) => <option key={x + 1} value={x + 1}>{x + 1}</option>)}
                </Form.Select>
                <Button variant="link" className="text-danger p-1" aria-label={`Remove ${prod.name}`}
                  onClick={() => dispatch({ type: "REMOVE_FROM_CART", payload: prod })}>
                  <AiFillDelete fontSize="20px" />
                </Button>
              </div>
            );
          })}
        </section>

        <aside className="ea-card ea-summary" aria-label="Order summary">
          <h2 className="h5 fw-bold mb-3">Order summary</h2>
          <div className="ea-summary-line"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="ea-summary-line text-muted"><span>Sales tax ({TAX_RATE}%)</span><span>{money(tax)}</span></div>
          <div className="ea-summary-line text-muted"><span>Shipping</span><span>From partner</span></div>
          <div className="ea-summary-line ea-summary-total"><span>Total</span><span>{money(subtotal + tax)}</span></div>
          <Link to="/customer" className="btn btn-primary btn-lg w-100 mt-3">Proceed to checkout</Link>
          <Link to="/products" className="btn btn-link w-100 mt-1">Continue shopping</Link>
        </aside>
      </div>
    </>
  );
};

export default Cart;
