import { createContext, useContext, useReducer } from "react";
import { EMPTY_CUSTOMER, INITIAL_PRODUCT_FILTERS, cartReducer, productReducer } from "./Reducers";
import { productDump } from "./productList";

const Cart = createContext();

const Context = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    products: productDump,
    cart: [],
    customerDetails: { ...EMPTY_CUSTOMER },
  });

  const [productState, productDispatch] = useReducer(productReducer, { ...INITIAL_PRODUCT_FILTERS });

  return (
    <Cart.Provider value={{ state, dispatch, productState, productDispatch }}>
      {children}
    </Cart.Provider>
  );
};

export const CartState = () => useContext(Cart);

export default Context;
