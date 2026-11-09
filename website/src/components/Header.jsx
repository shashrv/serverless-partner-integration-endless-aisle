import { productImage } from "../images";
import { FaShoppingCart, FaStore } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";
import { Badge, Button, Container, Dropdown, Form, Nav, Navbar } from "react-bootstrap";
import { Link, NavLink, useLocation } from "react-router-dom";
import { CartState } from "../context/Context";
import "./styles.css";

const Header = ({ signOut, username }) => {
  const {
    state: { cart },
    dispatch,
    productDispatch,
    productState: { searchQuery },
  } = CartState();
  const section = useLocation().pathname.split("/")[1];
  const itemCount = cart.reduce((n, item) => n + Number(item.qty || 1), 0);

  return (
    <Navbar expand="lg" variant="dark" sticky="top" className="ea-navbar py-3">
      <Container fluid="xl">
        <Navbar.Brand as={Link} to="/" className="ea-brand">
          <span className="ea-brand-mark" aria-hidden="true"><FaStore /></span>
          AnyCompany
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto gap-1">
            <Nav.Link as={NavLink} to="/" end>Partners</Nav.Link>
            <Nav.Link as={NavLink} to="/search">Find a product</Nav.Link>
            <Nav.Link as={NavLink} to="/orders">Order lookup</Nav.Link>
          </Nav>

          {section === "products" && (
            <Form className="ea-header-search flex-grow-1 me-lg-3 my-2 my-lg-0" role="search" onSubmit={(e) => e.preventDefault()}>
              <Form.Control
                type="search"
                placeholder="Search products by name…"
                aria-label="Search products by name"
                value={searchQuery ?? ""}
                onChange={(e) => productDispatch({ type: "FILTER_BY_SEARCH", payload: e.target.value })}
              />
            </Form>
          )}

          <div className="d-flex align-items-center gap-2">
            <Dropdown align="end">
              <Dropdown.Toggle variant="warning" className="ea-cart-btn" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}>
                <FaShoppingCart aria-hidden="true" />
                <Badge bg="dark" pill>{itemCount}</Badge>
              </Dropdown.Toggle>
              <Dropdown.Menu style={{ minWidth: 340 }} className="py-2">
                {cart.length > 0 ? (
                  <>
                    {cart.map((prod) => (
                      <div className="cartitem" key={prod.itemId}>
                        <img src={productImage(prod.itemId)} className="cartItemImg" alt="" />
                        <div className="cartItemDetail">
                          <span>{prod.name}</span>
                          <span className="text-muted">${prod.price} · {prod.partner}</span>
                        </div>
                        <Button variant="link" className="text-danger p-1" aria-label={`Remove ${prod.name}`}
                          onClick={() => dispatch({ type: "REMOVE_FROM_CART", payload: prod })}>
                          <AiFillDelete fontSize="18px" />
                        </Button>
                      </div>
                    ))}
                    <div className="px-3 pt-2">
                      {/* Dropdown.Item closes the menu on click, unlike a plain Link. */}
                      <Dropdown.Item as={Link} to="/cart" className="ea-dropdown-cta">Go to cart</Dropdown.Item>
                    </div>
                  </>
                ) : (
                  <span className="d-block px-3 py-2 text-muted">Your cart is empty.</span>
                )}
              </Dropdown.Menu>
            </Dropdown>
            {username && <span className="text-white-50 small d-none d-xl-inline">{username}</span>}
            <Button variant="outline-light" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
