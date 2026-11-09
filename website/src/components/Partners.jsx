import { partnerImage } from "../images";
import { Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { CartState } from "../context/Context";
import { productDump } from "../context/productList";

// Only partners 1-3 are integrated with the backend.
const isAvailable = (partnerId) => partnerId > 0 && partnerId < 4;

const Partners = ({ partner }) => {
  const { productDispatch } = CartState();
  const navigate = useNavigate();
  const available = isAvailable(partner.partnerId);
  const itemCount = productDump.filter((p) => p.partner === partner.partner && Number(p.inStock) > 0).length;

  const select = () => {
    productDispatch({ type: "FILTER_BY_PARTNER", payload: partner.partner });
    navigate("/products");
  };

  return (
    <div className={`ea-card ea-tile${available ? "" : " opacity-75"}`}>
      <img className="ea-tile-img" src={partnerImage(partner.partnerId)} alt="" />
      <div className="ea-tile-body">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <h2 className="ea-tile-title">{partner.name}</h2>
          {available ? <Badge bg="success-subtle" text="success-emphasis">Live</Badge>
            : <Badge bg="secondary-subtle" text="secondary-emphasis">Coming soon</Badge>}
        </div>
        <span className="ea-tile-meta">{available ? `${itemCount} items in stock` : "Catalog not connected yet"}</span>
        <div className="ea-tile-actions">
          <button type="button" className="btn btn-primary w-100" id={`${partner.partner}-btn`}
            onClick={select} disabled={!available}>
            {available ? `Shop ${partner.name}` : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Partners;
