import "./App.css";
import "./components/styles.css";
import Header from "./components/Header";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Cart from "./components/Cart";
import Customer from "./components/Customer";
import Products from "./components/Products";
import Search from "./components/Search";
import Order from "./components/Order";
import ScrollToTop from "./components/ScrollToTop";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import config, { ORDERS_API } from "./config";

// Local UI preview (`npm run dev:ui`): renders the app without signing in so the
// layout can be reviewed without a deployed backend. `import.meta.env.DEV` is the
// literal `false` in production builds, so this branch is removed from the bundle.
const UI_PREVIEW = import.meta.env.DEV && import.meta.env.MODE === "uipreview";

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

function Shell({ signOut, username }) {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-shell">
        {UI_PREVIEW && (
          <div className="preview-banner" role="status">
            Local UI preview: not signed in, and API calls (order lookup, checkout) are not connected.
          </div>
        )}
        <Header signOut={signOut} username={username} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/orders" element={<Order />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customer" element={<Customer />} />
          </Routes>
        </main>
        <footer className="app-footer">AnyCompany Endless Aisle · Orders are fulfilled by our partners</footer>
      </div>
    </BrowserRouter>
  );
}

function App() {
  if (UI_PREVIEW) {
    return <Shell signOut={() => {}} username="preview" />;
  }
  return (
    <Authenticator hideSignUp={true} formFields={formFields}>
      {({ signOut, user }) => <Shell signOut={signOut} username={user?.username} />}
    </Authenticator>
  );
}

export default App;
