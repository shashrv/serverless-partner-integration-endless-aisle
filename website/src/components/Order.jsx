import { useState } from "react";
import {
  FormControl, Form
} from "react-bootstrap";
import { MDBCard, MDBCardBody, MDBCardHeader, MDBCol, MDBRow, MDBTypography } from 'mdb-react-ui-kit';
import "./styles.css";
import { Button } from "react-bootstrap";
import { get } from "aws-amplify/api";
import Orders from "./Orders";
import { ORDERS_API } from "../config";

const Order = () => {
  const [orderId, setOrderId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [customerOrder, setCustomerOrder] = useState("");
  const [message, setMessage] = useState("");


  const [errors, setErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!orderId) {
      errors.orderId = "Please provide OrderId";
    }
    if (!partnerId) {
      errors.partnerId = "Please provide PartnerId";
    }
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmit = async (event) => {
    setCustomerOrder();
    setMessage();
    event.preventDefault();
    if (validate()) {
      // Submit the form
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
          setMessage(typeof response?.message === "string" ? response.message : "Order not found");
        }
      } catch (error) {
        console.error("Order lookup failed", error?.name);
        setMessage("Order lookup failed");
      }
    }
  };

  return (
    <>
      <MDBCard className="mb-4">
        <MDBCardHeader className="py-3">
          <MDBTypography tag="h5" className="mb-0">Lookup Orders</MDBTypography>
          {errors.orderId && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.orderId}</md-subheader></div>}
          {errors.partnerId && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}> ! {errors.partnerId}</md-subheader></div>}
        </MDBCardHeader>
        <MDBCardBody>
          <form className="mb-0" noValidate onSubmit={handleSubmit} >
            <MDBRow className="mb-4">
              <MDBCol>
                <FormControl
                  style={{ width: 500 }}
                  type="search"
                  placeholder="Lookup Orders with OrderId"
                  className="m-auto"
                  aria-label="OrderLookup"
                  onChange={(e) =>
                    setOrderId(e.target.value)}
                />
              </MDBCol>
              <MDBCol>
                <Form.Select aria-label="Default select example"
                  onChange={(e) =>
                    setPartnerId(e.target.value)}
                >
                  <option>Select Partner</option>
                  <option value="1">Partner1</option>
                  <option value="2">Partner2</option>
                  <option value="3">Partner3</option>
                </Form.Select>
              </MDBCol>
              <MDBCol>
                <Button variant="primary" type="submit" onClick={handleSubmit} size="lg">
                  Lookup Order
                </Button>
              </MDBCol>
            </MDBRow>
          </form>
        </MDBCardBody>
      </MDBCard>
      {customerOrder ? (
        <>
          <Orders orders={customerOrder} />
        </>
      ) : (
        <>
          <MDBCard>
            <MDBCardBody>
              <MDBRow>
                <MDBCol>
                </MDBCol>
                <MDBCol>
                  <span>{message}</span>
                </MDBCol>
              </MDBRow>
            </MDBCardBody>
          </MDBCard>
        </>
      )}

    </>
  );
};

export default Order;
