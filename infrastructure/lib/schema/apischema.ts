import { JsonSchemaType } from "aws-cdk-lib/aws-apigateway";
import { EMAIL_PATTERN_SOURCE } from "../lambda/utils/validation";

export const CreateOrderSchema = {
  type: JsonSchemaType.OBJECT,
  properties: {
    requestedItem: {
      type: JsonSchemaType.OBJECT,
      properties: {
        itemId: { type: JsonSchemaType.STRING, maxLength: 64 },
        price: { type: JsonSchemaType.NUMBER },
        size: { type: JsonSchemaType.STRING, },
        quantity: { type: JsonSchemaType.NUMBER },
        sku: { type: JsonSchemaType.STRING },
        category: { type: JsonSchemaType.STRING },
        partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
        partnerId: { type: JsonSchemaType.STRING },
        description: { type: JsonSchemaType.STRING },
        color: { type: JsonSchemaType.STRING }
      }
    },
    customer: {
      type: JsonSchemaType.OBJECT,
      required: ["email", "firstName", "lastName", "address"],
      properties: {
        // Keep in sync with EMAIL_PATTERN in website/src/components/Customer.jsx
        // and lambda/createOrder.ts.
        email: { type: JsonSchemaType.STRING, maxLength: 254, pattern: EMAIL_PATTERN_SOURCE },
        firstName: { type: JsonSchemaType.STRING, minLength: 1, maxLength: 50 },
        lastName: { type: JsonSchemaType.STRING, minLength: 1, maxLength: 50 },
        contact: { type: JsonSchemaType.STRING, maxLength: 50 },
        // JSON-encoded address object built by the website.
        address: { type: JsonSchemaType.STRING, minLength: 2, maxLength: 1000 }
      }
    }
  },
  required: ["requestedItem", "customer"],
};

export const GetOrderSchema = {
  type: JsonSchemaType.OBJECT,
  properties: {
    id: { type: JsonSchemaType.STRING },
  },
};

export const PostPartnerOrderSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["itemId", "partner", "quantity"],
  properties: {
    itemId: { type: JsonSchemaType.STRING, maxLength: 64 },
    sku: { type: JsonSchemaType.STRING, maxLength: 64 },
    quantity: { type: JsonSchemaType.NUMBER },
    partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
    partnerId: { type: JsonSchemaType.STRING }
  },
};

export const UpdateOrderSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["id", "orderStatus", "partnerId"],
  properties: {
    id: { type: JsonSchemaType.STRING },
    orderStatus: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Placed", "Pending", "Failed", "Fulfilled"] },
    partnerId: { type: JsonSchemaType.STRING, maxLength: 64 },
  },
};

export const GetItemSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["id"],
  properties: {
    id: { type: JsonSchemaType.STRING },
    partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
  },
};