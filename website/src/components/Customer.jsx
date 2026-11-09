import { useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { post } from "aws-amplify/api";
import { CartState } from "../context/Context";
import { COUNTRIES, findCountry, postalRule } from "../context/locations";
import SubHeader from "./SubHeader";
import { ORDERS_API } from "../config";

// Same rule the API enforces (infrastructure/lib/schema/apischema.ts).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}' .-]*$/u;

const FIELDS = ["firstName", "lastName", "email", "address", "city", "state", "postalCode", "country"];

export function validateCustomer(details) {
  const errors = {};
  const value = (k) => (details[k] ?? "").trim();
  const country = findCountry(value("country"));

  if (!value("firstName")) errors.firstName = "Enter a first name.";
  else if (!NAME_PATTERN.test(value("firstName"))) errors.firstName = "Use letters, spaces, apostrophes or hyphens.";
  if (!value("lastName")) errors.lastName = "Enter a last name.";
  else if (!NAME_PATTERN.test(value("lastName"))) errors.lastName = "Use letters, spaces, apostrophes or hyphens.";

  if (!value("email")) errors.email = "Enter an email address.";
  else if (!EMAIL_PATTERN.test(value("email"))) errors.email = "Enter a valid email, like name@example.com.";

  if (!value("address")) errors.address = "Enter a street address.";
  if (!value("city")) errors.city = "Enter a city.";

  if (!country) errors.country = "Select a country.";
  if (!value("state")) errors.state = `Select a ${(country?.regionLabel ?? "state").toLowerCase()}.`;
  else if (country?.regions && !country.regions.some(([code]) => code === value("state"))) {
    errors.state = `Select a ${country.regionLabel.toLowerCase()} from the list.`;
  }

  const rule = postalRule(value("country"));
  if (!value("postalCode")) errors.postalCode = `Enter a ${rule.label.toLowerCase()}.`;
  else if (!rule.pattern.test(value("postalCode"))) errors.postalCode = `Enter a valid ${rule.label.toLowerCase()} (${rule.hint}).`;

  return errors;
}

function Customer() {
  const {
    state: { cart, customerDetails },
    dispatch,
    productDispatch,
  } = CartState();
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok: boolean, message: string }

  const errors = useMemo(() => validateCustomer(customerDetails), [customerDetails]);
  const country = findCountry(customerDetails.country);
  const rule = postalRule(customerDetails.country);

  const setField = (field, value) => dispatch({ type: "SET_CUSTOMER_FIELD", payload: { field, value } });
  const touch = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const showError = (field) => touched[field] && errors[field];

  const fieldProps = (field) => ({
    value: customerDetails[field] ?? "",
    onChange: (e) => setField(field, e.target.value),
    onBlur: () => touch(field),
    isInvalid: Boolean(showError(field)),
    "aria-describedby": `${field}-feedback`,
    required: true,
  });

  // A fixed-height line under every field: showing an error never moves the layout
  // (a shift on blur would make a click on the submit button miss).
  const feedback = (field, hint = "") => (
    <div id={`${field}-feedback`} className={`ea-field-msg ${showError(field) ? "text-danger" : "text-muted"}`} aria-live="polite">
      {showError(field) ? errors[field] : hint}
    </div>
  );

  const buildOrder = (item) => ({
    requestedItem: {
      itemId: item.itemId,
      // The cart select stores the value as a string; the API model expects a number.
      quantity: Number(item.qty),
      size: item.size,
      partner: item.partner,
      price: Number(item.price),
      partnerId: item.partnerId,
      sku: item.sku,
      category: item.category,
    },
    customer: {
      address: JSON.stringify({
        address: customerDetails.address.trim(),
        city: customerDetails.city.trim(),
        state: customerDetails.state.trim(),
        country: country?.name ?? customerDetails.country,
        countryCode: customerDetails.country,
        postalCode: customerDetails.postalCode.trim().toUpperCase(),
      }),
      firstName: customerDetails.firstName.trim(),
      lastName: customerDetails.lastName.trim(),
      email: customerDetails.email.trim(),
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));
    if (Object.keys(errors).length > 0 || cart.length === 0) return;

    setSubmitting(true);
    const outcomes = await Promise.allSettled(
      cart.map((item) => post({ apiName: ORDERS_API, path: "/orders", options: { body: buildOrder(item) } }).response)
    );
    setSubmitting(false);

    const failed = outcomes.filter((o) => o.status === "rejected").length;
    if (failed === 0) {
      setResult({ ok: true, message: `Your order${cart.length > 1 ? "s have" : " has"} been sent to the partner.` });
      dispatch({ type: "CLEAR_CART" });
      productDispatch({ type: "CLEAR_FILTERS" });
    } else {
      // Do not log the error object: it can include the request body with customer PII.
      console.error(`Order submission failed for ${failed} item(s)`);
      setResult({ ok: false, message: `${failed} of ${cart.length} item(s) could not be ordered. Please try again.` });
    }
  };

  if (result?.ok) {
    return (
      <div className="ea-card ea-empty">
        <h1 className="h4 text-body mb-2">Order sent</h1>
        <p className="mb-3">{result.message} You can look it up from Order lookup.</p>
        <Link to="/" className="btn btn-primary">Back to partners</Link>
      </div>
    );
  }

  const subtotal = cart.reduce((acc, item) => acc + Number(item.price) * Number(item.qty), 0);

  return (
    <>
    <SubHeader text="Checkout" subtitle="Enter the customer's shipping details. Each item ships directly from its partner." />
    <div className="ea-cart">
      <Card className="ea-card border-0">
        <Card.Header as="h2" className="h5 py-3 bg-transparent">Shipping details</Card.Header>
        <Card.Body>
          {result && !result.ok && <Alert variant="danger">{result.message}</Alert>}
          {cart.length === 0 && <Alert variant="info">Your cart is empty. Add a product before checking out.</Alert>}
          <Form noValidate onSubmit={handleSubmit}>
            <Row className="g-3">
              <Form.Group as={Col} md={6} controlId="firstName">
                <Form.Label>First name</Form.Label>
                <Form.Control type="text" autoComplete="given-name" maxLength={50} {...fieldProps("firstName")} />
                {feedback("firstName")}
              </Form.Group>
              <Form.Group as={Col} md={6} controlId="lastName">
                <Form.Label>Last name</Form.Label>
                <Form.Control type="text" autoComplete="family-name" maxLength={50} {...fieldProps("lastName")} />
                {feedback("lastName")}
              </Form.Group>

              <Form.Group as={Col} xs={12} controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" autoComplete="email" inputMode="email" maxLength={254}
                  placeholder="name@example.com" {...fieldProps("email")} />
                {feedback("email")}
              </Form.Group>

              <Form.Group as={Col} xs={12} controlId="address">
                <Form.Label>Street address</Form.Label>
                <Form.Control type="text" autoComplete="street-address" maxLength={200} {...fieldProps("address")} />
                {feedback("address")}
              </Form.Group>

              <Form.Group as={Col} md={6} controlId="country">
                <Form.Label>Country</Form.Label>
                <Form.Select autoComplete="country" {...fieldProps("country")}
                  onChange={(e) => { setField("country", e.target.value); setField("state", ""); }}>
                  <option value="">Select a country</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </Form.Select>
                {feedback("country")}
              </Form.Group>

              <Form.Group as={Col} md={6} controlId="state">
                <Form.Label>{country?.regionLabel ?? "State"}</Form.Label>
                {country?.regions ? (
                  <Form.Select autoComplete="address-level1" {...fieldProps("state")}>
                    <option value="">Select a {country.regionLabel.toLowerCase()}</option>
                    {country.regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </Form.Select>
                ) : (
                  <Form.Control type="text" autoComplete="address-level1" maxLength={60}
                    disabled={!country} placeholder={country ? "" : "Select a country first"} {...fieldProps("state")} />
                )}
                {feedback("state")}
              </Form.Group>

              <Form.Group as={Col} md={6} controlId="city">
                <Form.Label>City</Form.Label>
                <Form.Control type="text" autoComplete="address-level2" maxLength={60} {...fieldProps("city")} />
                {feedback("city")}
              </Form.Group>

              <Form.Group as={Col} md={6} controlId="postalCode">
                <Form.Label>{rule.label}</Form.Label>
                <Form.Control type="text" autoComplete="postal-code" maxLength={10}
                  inputMode={customerDetails.country === "US" ? "numeric" : "text"} {...fieldProps("postalCode")} />
                {feedback("postalCode", rule.hint)}
              </Form.Group>
            </Row>

            <Button className="mt-4" variant="primary" type="submit" size="lg" disabled={submitting || cart.length === 0}>
              {submitting ? <><Spinner size="sm" className="me-2" aria-hidden="true" />Sending…</> : "Send order to partner"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <aside className="ea-card ea-summary" aria-label="Items in this order">
        <h2 className="h5 fw-bold mb-3">Items</h2>
        {cart.map((item) => (
          <div className="ea-summary-line small" key={item.itemId}>
            <span className="text-truncate me-2">{item.qty} × {item.name}</span>
            <span>${(Number(item.price) * Number(item.qty)).toFixed(2)}</span>
          </div>
        ))}
        <div className="ea-summary-line ea-summary-total">
          <span>Total incl. 8% tax</span><span>${(subtotal * 1.08).toFixed(2)}</span>
        </div>
        <Link to="/cart" className="btn btn-link w-100 mt-1">Edit cart</Link>
      </aside>
    </div>
    </>
  );
}

export default Customer;
