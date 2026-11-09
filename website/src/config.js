const config = {
  apiEndpoint: import.meta.env.VITE_API_URL,
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  awsRegion: import.meta.env.VITE_AWS_REGION,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
};

export default config;

export const ORDERS_API = "orders";
