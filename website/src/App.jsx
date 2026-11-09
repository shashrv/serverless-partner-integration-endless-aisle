import "./App.css";
import Header from "./components/Header";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Cart from "./components/Cart";
import Customer from "./components/Customer";
import Products from "./components/Products";
import Search from "./components/Search";
import Order from "./components/Order";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import config, { ORDERS_API } from "./config";


// Configure Amplify once at module load (not on every render).
Amplify.configure(
  {
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
      },
    },
    API: {
      REST: {
        [ORDERS_API]: {
          endpoint: (config.apiEndpoint || "").replace(/\/+$/, ""),
          region: config.awsRegion,
        },
      },
    },
  },
  {
    API: {
      REST: {
        // The API uses a Cognito user pool authorizer with OAuth scopes, which
        // requires the access token (not the ID token).
        headers: async () => {
          const { tokens } = await fetchAuthSession();
          const accessToken = tokens?.accessToken?.toString();
          return accessToken ? { Authorization: accessToken } : {};
        },
      },
    },
  }
);

const formFields = {
  signIn: {
    username: {
      labelHidden: false,
      placeholder: "Enter your username here",
      isRequired: true,
      label: "Username:",
    },
  },
};

function App() {
  return (
    <Authenticator hideSignUp={true} formFields={formFields}>
      {({ signOut }) => (
        <BrowserRouter>
          <Header signOut={signOut} />
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/orders" element={<Order />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customer" element={<Customer />} />
            </Routes>
          </div>
        </BrowserRouter>
      )}
    </Authenticator>
  );
}

export default App;
