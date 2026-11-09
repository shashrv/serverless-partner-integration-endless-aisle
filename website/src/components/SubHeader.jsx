// Page title block used at the top of each screen.
function SubHeader({ text, subtitle, children }) {
  return (
    <div className="page-header d-flex flex-wrap align-items-end justify-content-between gap-3">
      <div>
        <h1>{text}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default SubHeader;
