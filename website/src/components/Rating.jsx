import { AiFillStar, AiOutlineStar } from "react-icons/ai";

// Read-only stars by default; pass onClick to make each star a keyboard-accessible button.
const Rating = ({ rating, onClick, label = "Rating" }) => {
  const value = Number(rating) || 0;
  const stars = [...Array(5)].map((_, i) =>
    value > i ? <AiFillStar key={i} aria-hidden="true" /> : <AiOutlineStar key={i} aria-hidden="true" />
  );

  if (!onClick) {
    return <span className="ea-rating" role="img" aria-label={`${label}: ${Math.min(value, 5)} out of 5`}>{stars}</span>;
  }
  return (
    <span className="ea-rating" role="group" aria-label={label}>
      {stars.map((star, i) => (
        <button key={i} type="button" onClick={() => onClick(i)} aria-pressed={value === i + 1}
          aria-label={`${i + 1} star${i ? "s" : ""} and up`}>
          {star}
        </button>
      ))}
    </span>
  );
};

export default Rating;
