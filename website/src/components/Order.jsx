import { useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { get } from "aws-amplify/api";
import "./styles.css";
import Orders from "./Orders";
import { ORDERS_API } from "../config";

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const Order = () => {
  const [orderId, setOrderId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [customerOrder, setCustomerOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (!orderId.trim()) next.orderId = "Enter an order ID.";
    else if (!ORDER_ID_PATTERN.test(orderId.trim())) next.orderId = "Order IDs contain only letters, digits, - and _.";
    if (!partnerId) next.partnerId = "Select a partner.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCustomerOrder(null);
    setMessage("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { body } = await get({
        apiName: ORDERS_API,
        path: `/orders/${encodeURIComponent(orderId.trim())}`,
        options: { queryParams: { partner: `Partner${partnerId}` } },
      }).response;
      const response = await body.json();
      if (response?.message?.orderId) {
        setCustomerOrder(response.message);
      } else {
        setMessage(typeof response?.message === "string" ? response.message : "Order not found.");
      }
    } catch (error) {
      console.error("Order lookup failed", error?.name);
      setMessage("Order lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 px-3">
      <Card className="mb-4">
        <Card.Header as="h5" className="py-3">Lookup orders</Card.Header>
        <Card.Body>
          <Form noValidate onSubmit={handleSubmit}>
            <Row className="g-3 align-items-start">
              <Form.Group as={Col} md={6} controlId="orderId">
                <Form.Label>Order ID</Form.Label>
                <Form.Control type="search" placeholder="e.g. b7760935-5eab-4de0-99d2-7807ea7ffc09" maxLength={64}
                  value={orderId} onChange={(e) => setOrderId(e.target.value)} isInvalid={Boolean(errors.orderId)} />
                <Form.Control.Feedback type="invalid">{errors.orderId}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={3} controlId="partnerId">
                <Form.Label>Partner</Form.Label>
                <Form.Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} isInvalid={Boolean(errors.partnerId)}>
                  <option value="">Select a partner</option>
                  <option value="1">Partner1</option>
                  <option value="2">Partner2</option>
                  <option value="3">Partner3</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.partnerId}</Form.Control.Feedback>
              </Form.Group>
              <Col md={3} className="d-flex align-items-end" style={{ minHeight: 70 }}>
                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                  {loading ? <><Spinner size="sm" className="me-2" aria-hidden="true" />Looking up…</> : "Lookup order"}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      {customerOrder && <Orders orders={customerOrder} />}
      {message && <Alert variant="warning" role="status">{message}</Alert>}
    </div>
  );
};

export default Order;
