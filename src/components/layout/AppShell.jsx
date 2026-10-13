import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../common/BrandLogo";

export default function AppShell({ children, pageTitle, breadcrumbs = [] }) {
  const { user, logout, enableUdhar, enableStaff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("dk_sidebar_collapsed") === "true";
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  // Sync sidebar collapsed state
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dk_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close menus on route change or click outside
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      navigate("/login", { replace: true });
    }
  };

  // Determine Operating Mode
  const mode = user?.operatingMode || "BOTH";
  const isOwner = user?.role === "OWNER";
  const showSmallShop = mode === "SMALL" || mode === "BOTH";
  const showLargeShop = mode === "LARGE" || mode === "BOTH";

  // Dynamic Title Determination if not explicitly provided
  const getComputedTitle = () => {
    if (pageTitle) return pageTitle;
    const path = location.pathname;
    if (path === "/dashboard") return "Store Dashboard";
    if (path === "/small-shop") return "Daily Closing";
    if (path === "/pos") return "Point of Sale (POS)";
    if (path === "/products") return "Product Catalogue";
    if (path === "/reports") return "Sales Reports";
    if (path === "/customers") return "Customers & Udhar Khata";
    if (path === "/inventory") return "Inventory & Stock";
    if (path === "/purchases") return "Supplier Purchases";
    if (path === "/returns") return "Sales Returns";
    if (path === "/finance") return "Financial Analytics";
    if (path === "/staff") return "Staff & Commissions";
    if (path === "/shop-settings") return "Shop Settings";
    if (path === "/team") return "Team & Access Control";
    if (path === "/notifications") return "Notifications & SMS";
    if (path === "/audit") return "Security & Audit Logs";
    if (path === "/subscription") return "Plans & Subscription";
    return "DukanKhata Workspace";
  };

  return (
    <div className="app-shell">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* ================= SIDEBAR NAVIGATION ================= */}
      <aside
        className={`app-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${
          mobileDrawerOpen ? "mobile-open" : ""
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <Link className="sidebar-brand-wrapper" to="/dashboard">
            <BrandLogo size={32} alt="DukanKhata" />
            {!sidebarCollapsed && (
              <span className="brand" style={{ fontSize: "17px" }}>
                <span>Dukan</span>
                <span style={{ color: "var(--gold-dark)" }}>Khata</span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"></polyline>
              ) : (
                <polyline points="15 18 9 12 15 6"></polyline>
              )}
            </svg>
          </button>

          {/* Mobile Close Drawer Button */}
          <button
            className="sidebar-mobile-close-btn"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close sidebar navigation"
            title="Close navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Operating Mode Indicator Badge in Sidebar */}
        {!sidebarCollapsed && (
          <div className="sidebar-mode-badge-box">
            <div className="sidebar-mode-badge">
              <span>
                {mode === "SMALL" ? "☕ Small Shop" : mode === "LARGE" ? "🛒 Large POS" : "⚡ Hybrid Mode"}
              </span>
              <span style={{ fontSize: "10px", color: "var(--mute)", textTransform: "uppercase" }}>
                {user?.role || "OWNER"}
              </span>
            </div>
          </div>
        )}

        {/* Grouped Navigation Links */}
        <nav className="sidebar-nav-scroll">
          {/* 1. Overview */}
          <div>
            <div className="nav-group-title">
              {sidebarCollapsed ? "•" : "Overview"}
            </div>
            <div className="sidebar-nav-list">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? "active" : ""}`
                }
                title="Dashboard"
              >
                <span className="sidebar-nav-icon">📊</span>
                <span className="sidebar-nav-label">Dashboard</span>
              </NavLink>
            </div>
          </div>

          {/* 2. Small Shop Group */}
          {showSmallShop && (
            <div>
              <div className="nav-group-title">
                {sidebarCollapsed ? "•" : "Small Shop Mode"}
              </div>
              <div className="sidebar-nav-list">
                <NavLink
                  to="/small-shop"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Daily Closing"
                >
                  <span className="sidebar-nav-icon">🧾</span>
                  <span className="sidebar-nav-label">Daily Closing</span>
                </NavLink>
                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Closing Reports"
                >
                  <span className="sidebar-nav-icon">📈</span>
                  <span className="sidebar-nav-label">Closing Reports</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* 3. Large Shop Group */}
          {showLargeShop && (
            <div>
              <div className="nav-group-title">
                {sidebarCollapsed ? "•" : "Large Shop POS"}
              </div>
              <div className="sidebar-nav-list">
                <NavLink
                  to="/pos"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="POS Billing"
                >
                  <span className="sidebar-nav-icon">🛒</span>
                  <span className="sidebar-nav-label">POS Billing</span>
                </NavLink>
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Product Catalogue"
                >
                  <span className="sidebar-nav-icon">🏷️</span>
                  <span className="sidebar-nav-label">Products</span>
                </NavLink>
                <NavLink
                  to="/inventory"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Inventory & Stock"
                >
                  <span className="sidebar-nav-icon">📦</span>
                  <span className="sidebar-nav-label">Inventory &amp; Stock</span>
                </NavLink>
                <NavLink
                  to="/purchases"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Purchases"
                >
                  <span className="sidebar-nav-icon">🚚</span>
                  <span className="sidebar-nav-label">Purchases</span>
                </NavLink>
                <NavLink
                  to="/returns"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Bills, Invoices & Sales Returns"
                >
                  <span className="sidebar-nav-icon">📜</span>
                  <span className="sidebar-nav-label">Bills &amp; Invoices</span>
                </NavLink>
                <NavLink
                  to="/small-shop"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Daily Closing & Reconciliation Desk"
                >
                  <span className="sidebar-nav-icon">🧾</span>
                  <span className="sidebar-nav-label">Daily Closing Desk</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* 4. Shared Management */}
          <div>
            <div className="nav-group-title">
              {sidebarCollapsed ? "•" : "Store Workflows"}
            </div>
            <div className="sidebar-nav-list">
              {enableUdhar && (
                <NavLink
                  to="/customers"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Customers & Udhar"
                >
                  <span className="sidebar-nav-icon">📒</span>
                  <span className="sidebar-nav-label">Udhar Khata</span>
                </NavLink>
              )}

              {isOwner && (
                <>
                  <NavLink
                    to="/finance"
                    className={({ isActive }) =>
                      `sidebar-nav-item ${isActive ? "active" : ""}`
                    }
                    title="Financial Analytics"
                  >
                    <span className="sidebar-nav-icon">💰</span>
                    <span className="sidebar-nav-label">Financials</span>
                  </NavLink>
                  {enableStaff && (
                    <NavLink
                      to="/staff"
                      className={({ isActive }) =>
                        `sidebar-nav-item ${isActive ? "active" : ""}`
                      }
                      title="Staff & Commissions"
                    >
                      <span className="sidebar-nav-icon">👥</span>
                      <span className="sidebar-nav-label">Staff &amp; Comm.</span>
                    </NavLink>
                  )}
                </>
              )}

              <NavLink
                to="/shop-settings"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? "active" : ""}`
                }
                title="Shop Settings"
              >
                <span className="sidebar-nav-icon">⚙️</span>
                <span className="sidebar-nav-label">Shop Settings</span>
              </NavLink>
            </div>
          </div>

          {/* 5. Administration (Owner Only) */}
          {isOwner && (
            <div>
              <div className="nav-group-title">
                {sidebarCollapsed ? "•" : "Admin & Security"}
              </div>
              <div className="sidebar-nav-list">
                <NavLink
                  to="/team"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Team Access"
                >
                  <span className="sidebar-nav-icon">🔑</span>
                  <span className="sidebar-nav-label">Team &amp; Access</span>
                </NavLink>
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Notifications"
                >
                  <span className="sidebar-nav-icon">🔔</span>
                  <span className="sidebar-nav-label">Notifications</span>
                </NavLink>
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Activity Audit"
                >
                  <span className="sidebar-nav-icon">🔐</span>
                  <span className="sidebar-nav-label">Activity Audit</span>
                </NavLink>
                <NavLink
                  to="/subscription"
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  title="Plans & Billing"
                >
                  <span className="sidebar-nav-icon">💳</span>
                  <span className="sidebar-nav-label">Subscription</span>
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--deep)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.shopName || "My Store"}
                </strong>
                <small style={{ display: "block", fontSize: "11.5px", color: "var(--mute)" }}>
                  {user?.name || "Merchant"}
                </small>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ================= MAIN APPLICATION LAYOUT ================= */}
      <div className="app-main-layout">
        {/* Top App Header */}
        <header className="app-top-header" role="banner">
          <div className="header-left-section">
            {/* Mobile Nav Toggle */}
            <button
              className="mobile-nav-toggle-btn"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              aria-label="Toggle navigation drawer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Breadcrumbs / Page Title */}
            <div className="header-breadcrumbs">
              <Link to="/dashboard" style={{ color: "var(--mute)", fontWeight: 600 }}>
                {user?.shopName || "Store"}
              </Link>
              <span>/</span>
              <span className="header-page-title">{getComputedTitle()}</span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="header-right-section">
            {/* Plan Chip */}
            <span
              className={`header-chip ${
                user?.planStatus === "ACTIVE" ? "active" : "trial"
              }`}
            >
              {user?.planStatus === "ACTIVE" ? "PRO ACTIVE" : "TRIAL ACCESS"}
            </span>

            {/* Notifications Button */}
            <Link
              to="/notifications"
              className="header-icon-btn"
              title="Notifications & Delivery Status"
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="header-badge-dot"></span>
            </Link>

            {/* User Account Menu Dropdown */}
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="sidebar-avatar" style={{ width: "30px", height: "30px", fontSize: "12px" }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--deep)" }}>
                  {user?.name?.split(" ")[0] || "Account"}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--mute)" }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown" role="menu">
                  <div className="user-menu-header">
                    <strong>{user?.name}</strong>
                    <small>{user?.mobile} • {user?.role}</small>
                  </div>
                  <Link className="user-menu-item" to="/shop-settings" role="menuitem">
                    <span>⚙️</span>
                    <span>Shop Settings</span>
                  </Link>
                  <Link className="user-menu-item" to="/subscription" role="menuitem">
                    <span>💳</span>
                    <span>Billing &amp; Plans</span>
                  </Link>
                  {isOwner && (
                    <Link className="user-menu-item" to="/team" role="menuitem">
                      <span>🔑</span>
                      <span>Manage Team</span>
                    </Link>
                  )}
                  <button
                    className="user-menu-item logout-btn"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <span>🚪</span>
                    <span>Logout Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="app-content-container" id="main-app-content">
          {children}
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Quick Bar">
        <div className="mobile-bottom-nav-list">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </NavLink>

          {showSmallShop && mode === "SMALL" ? (
            <NavLink
              to="/small-shop"
              className={({ isActive }) =>
                `mobile-bottom-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="icon">🧾</span>
              <span>Closing</span>
            </NavLink>
          ) : (
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                `mobile-bottom-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="icon">🛒</span>
              <span>POS Bill</span>
            </NavLink>
          )}

          {enableUdhar && (
            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `mobile-bottom-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="icon">📒</span>
              <span>Udhar</span>
            </NavLink>
          )}

          <NavLink
            to={showLargeShop ? "/inventory" : "/reports"}
            className={({ isActive }) =>
              `mobile-bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="icon">{showLargeShop ? "📦" : "📈"}</span>
            <span>{showLargeShop ? "Stock" : "Reports"}</span>
          </NavLink>

          <button
            className="mobile-bottom-nav-item"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open full menu"
          >
            <span className="icon">☰</span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
