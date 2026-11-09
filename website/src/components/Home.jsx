import Partners from "./Partners";
import SubHeader from "./SubHeader";
import { partnerList } from "../context/productList";

const Home = () => (
  <>
    <SubHeader text="Choose a partner" subtitle="Browse a partner's catalog and order items that aren't on our shelves." />
    <div className="ea-grid">
      {partnerList.map((partner) => (
        <Partners partner={partner} key={partner.partnerId} />
      ))}
    </div>
  </>
);

export default Home;
