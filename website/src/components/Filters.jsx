import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { CartState } from "../context/Context";
import { partnerList } from "../context/productList";
import Rating from "./Rating";

const LIVE_PARTNERS = [...new Set(partnerList.filter((p) => p.partnerId < 4).map((p) => p.partner))];

const Filters = () => {
  const {
    productDispatch,
    productState: { byStock, byFastDelivery, sort, byRating, byPartner },
  } = CartState();
  const [open, setOpen] = useState(false);

  return (
    <aside className={`ea-card ea-filters${open ? " is-open" : ""}`} aria-label="Filter products">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="mb-0">Filters</h2>
        {/* Only shown on narrow screens, where the panel starts collapsed. */}
        <Button variant="outline-secondary" size="sm" className="ea-filters-toggle"
          aria-expanded={open} aria-controls="filter-body" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      <div id="filter-body" className="ea-filters-body mt-3">

      <div className="ea-filter-group">
        <Form.Label htmlFor="filter-partner" className="ea-filter-label">Partner</Form.Label>
        <Form.Select id="filter-partner" size="sm" value={byPartner ?? ""}
          onChange={(e) => productDispatch({ type: "FILTER_BY_PARTNER", payload: e.target.value })}>
          <option value="">All partners</option>
          {LIVE_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Form.Select>
      </div>

      <fieldset className="ea-filter-group">
        <legend className="ea-filter-label">Sort by price</legend>
        <Form.Check type="radio" name="sort" id="sort-asc" label="Low to high"
          checked={sort === "lowToHigh"} onChange={() => productDispatch({ type: "SORT_BY_PRICE", payload: "lowToHigh" })} />
        <Form.Check type="radio" name="sort" id="sort-desc" label="High to low"
          checked={sort === "highToLow"} onChange={() => productDispatch({ type: "SORT_BY_PRICE", payload: "highToLow" })} />
      </fieldset>

      <fieldset className="ea-filter-group">
        <legend className="ea-filter-label">Availability</legend>
        <Form.Check type="switch" id="filter-stock" label="Include out of stock"
          checked={byStock} onChange={() => productDispatch({ type: "FILTER_BY_STOCK" })} />
        <Form.Check type="switch" id="filter-delivery" label="Fast delivery only"
          checked={byFastDelivery} onChange={() => productDispatch({ type: "FILTER_BY_DELIVERY" })} />
      </fieldset>

      <div className="ea-filter-group">
        <span className="ea-filter-label">Customer rating</span>
        <Rating rating={byRating} label="Minimum rating"
          onClick={(i) => productDispatch({ type: "FILTER_BY_RATING", payload: i + 1 })} />
      </div>

      <div className="ea-filter-group">
        <Button variant="outline-secondary" size="sm" className="w-100"
          onClick={() => productDispatch({ type: "CLEAR_FILTERS" })}>
          Clear filters
        </Button>
      </div>
      </div>
    </aside>
  );
};

export default Filters;
