import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import BrandLogo from "./components/common/BrandLogo";

// Public Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import NotFoundPage from "./pages/NotFoundPage";

// Legal & Compliance Pages
import TermsPage from "./pages/legal/TermsPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import RefundPage from "./pages/legal/RefundPage";
import GstCompliancePage from "./pages/legal/GstCompliancePage";

// Authenticated Pages
import DashboardPage from "./pages/dashboard/DashboardPage";
import SmallShopPage from "./pages/small-shop/SmallShopPage";
import PosPage from "./pages/pos/PosPage";
import ProductsPage from "./pages/products/ProductsPage";
import ReportsPage from "./pages/reports/ReportsPage";
import CustomersPage from "./pages/customers/CustomersPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import ReturnsPage from "./pages/returns/ReturnsPage";
import FinancePage from "./pages/finance/FinancePage";
import StaffPage from "./pages/staff/StaffPage";
import ShopSettingsPage from "./pages/shop/ShopSettingsPage";
import AuditPage from "./pages/audit/AuditPage";
import TeamPage from "./pages/team/TeamPage";
import SubscriptionPage from "./pages/subscription/SubscriptionPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";

function Protected({ children, requiredFeature }) {
  const { user, loading, enableUdhar, enableStaff } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center" }}>
        <BrandLogo size={48} alt="DukanKhata" />
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--mute)" }}>Loading DukanKhata...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredFeature === "udhar" && !enableUdhar) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredFeature === "staff" && !enableStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Legal & Compliance Public Routes */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPage />} />
        <Route path="/refunds" element={<RefundPage />} />
        <Route path="/gst-compliance" element={<GstCompliancePage />} />

        {/* Authenticated Workspace Routes wrapped in AppShell */}
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/small-shop"
          element={
            <Protected>
              <SmallShopPage />
            </Protected>
          }
        />
        <Route
          path="/pos"
          element={
            <Protected>
              <PosPage />
            </Protected>
          }
        />
        <Route
          path="/products"
          element={
            <Protected>
              <ProductsPage />
            </Protected>
          }
        />
        <Route
          path="/reports"
          element={
            <Protected>
              <ReportsPage />
            </Protected>
          }
        />
        <Route
          path="/customers"
          element={
            <Protected requiredFeature="udhar">
              <CustomersPage />
            </Protected>
          }
        />
        <Route
          path="/inventory"
          element={
            <Protected>
              <InventoryPage />
            </Protected>
          }
        />
        <Route
          path="/purchases"
          element={
            <Protected>
              <PurchasesPage />
            </Protected>
          }
        />
        <Route
          path="/returns"
          element={
            <Protected>
              <ReturnsPage />
            </Protected>
          }
        />
        <Route
          path="/bills"
          element={
            <Protected>
              <ReturnsPage />
            </Protected>
          }
        />
        <Route
          path="/finance"
          element={
            <Protected>
              <FinancePage />
            </Protected>
          }
        />
        <Route
          path="/staff"
          element={
            <Protected requiredFeature="staff">
              <StaffPage />
            </Protected>
          }
        />
        <Route
          path="/shop-settings"
          element={
            <Protected>
              <ShopSettingsPage />
            </Protected>
          }
        />
        <Route
          path="/audit"
          element={
            <Protected>
              <AuditPage />
            </Protected>
          }
        />
        <Route
          path="/team"
          element={
            <Protected>
              <TeamPage />
            </Protected>
          }
        />
        <Route
          path="/subscription"
          element={
            <Protected>
              <SubscriptionPage />
            </Protected>
          }
        />
        <Route
          path="/notifications"
          element={
            <Protected>
              <NotificationsPage />
            </Protected>
          }
        />

        {/* 404 Not Found Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
