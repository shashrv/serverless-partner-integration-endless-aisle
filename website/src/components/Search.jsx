import { Form, InputGroup } from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import { CartState } from "../context/Context";
import SubHeader from "./SubHeader";
import Products from "./Products";

const Search = () => {
  const { productDispatch, productState: { searchSkuQuery } } = CartState();
  return (
    <>
      <SubHeader text="Find a product" subtitle="Look up an item across every partner by SKU or item ID." />
      <Form className="mb-4" role="search" onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 560 }}>
        <InputGroup size="lg">
          <InputGroup.Text aria-hidden="true"><FaSearch /></InputGroup.Text>
          <Form.Control
            type="search"
            placeholder="SKU (e.g. 7c405270) or item ID (e.g. 12)"
            aria-label="Search by SKU or item ID"
            value={searchSkuQuery ?? ""}
            onChange={(e) => productDispatch({ type: "FILTER_BY_SEARCH_SKU", payload: e.target.value })}
          />
        </InputGroup>
      </Form>
      <Products showHeader={false} />
    </>
  );
};

export default Search;
