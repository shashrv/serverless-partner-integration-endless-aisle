import { productImage } from "../images";
import { Badge } from "react-bootstrap";

const STATUS_VARIANT = { Completed: "success", Delivered: "success", InProgress: "info", Pending: "warning", Failed: "danger", Cancelled: "secondary" };

const Orders = ({ orders }) => {
  const subscriber = orders.subscribers?.[0] ?? {};
  let address = {};
  try {
    address = typeof subscriber.address === "string" ? JSON.parse(subscriber.address) : (subscriber.address ?? {});
  } catch {
    address = {};
  }
  const orderDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(orders.orderDate);

  return (
    <section className="ea-card orderContainer" aria-label={`Order ${orders.orderId}`}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-4 pt-3">
        <div>
          <div className="text-muted small">Order</div>
          <div className="fw-semibold font-monospace">{orders.orderId}</div>
        </div>
        <Badge bg={STATUS_VARIANT[orders.orderStatus] ?? "secondary"} className="fs-6">{orders.orderStatus}</Badge>
      </div>
      <div className="ea-order-grid">
        <img src={productImage(orders.product?.itemId)} alt={`Item ${orders.product?.itemId}`} />
        <dl className="ea-dl">
          <dt>Placed</dt><dd>{orderDate}</dd>
          <dt>Partner</dt><dd>{orders.partner}</dd>
          <dt>Item</dt><dd>#{orders.product?.itemId} · Size {orders.product?.size} · Qty {orders.product?.quantity}</dd>
        </dl>
        <dl className="ea-dl">
          <dt>Price</dt><dd>${orders.price}</dd>
          <dt>Total incl. tax ({orders.salestax})</dt><dd>${Number(orders.subtotal).toFixed(2)}</dd>
          <dt>Status detail</dt><dd className="small">{orders.statusDescription}</dd>
        </dl>
        <dl className="ea-dl">
          <dt>Customer</dt><dd>{subscriber.firstName} {subscriber.lastName}<br /><span className="small">{subscriber.email}</span></dd>
          <dt>Ship to</dt>
          <dd className="small">
            {address.address}<br />
            {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}<br />
            {address.country}
          </dd>
        </dl>
      </div>
    </section>
  );
};

export default Orders;
