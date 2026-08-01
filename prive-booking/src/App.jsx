import "./styles.css";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Strip from "./sections/Strip";
import Booking from "./Booking";
import Work from "./sections/Work";
import Videos from "./sections/Videos";
import Reviews from "./sections/Reviews";
import Celebrities from "./sections/Celebrities";
import Ceo from "./sections/CEO";
import HairCare from "./sections/HairCare";
import Footer from "./sections/Footer";

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Strip />
      <Booking />
      <Work />
      <Videos />
      <Reviews />
      <Celebrities />
      <Ceo />
      <HairCare />
      <Footer />
    </>
  );
}
