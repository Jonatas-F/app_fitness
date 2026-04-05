function BottomNav({ navItems, activePage, onChangePage }) {
  return (
    <nav className="bottom-nav">
      {navItems.slice(0, 4).map((item) => (
        <button
          key={item.label}
          className={`nav-item ${activePage === item.label ? "active" : ""}`}
          type="button"
          onClick={() => onChangePage(item.label)}
        >
          <span className="nav-icon">{item.short}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;