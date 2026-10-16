import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import BrandLogo from "./components/common/BrandLogo";

// Route-based Code Splitting (Lazy-loaded chunks for instant initial render)
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Legal & Compliance Pages
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const RefundPage = lazy(() => import("./pages/legal/RefundPage"));
const GstCompliancePage = lazy(() => import("./pages/legal/GstCompliancePage"));

// Authenticated Pages
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const SmallShopPage = lazy(() => import("./pages/small-shop/SmallShopPage"));
const PosPage = lazy(() => import("./pages/pos/PosPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const PurchasesPage = lazy(() => import("./pages/purchases/PurchasesPage"));
const ReturnsPage = lazy(() => import("./pages/returns/ReturnsPage"));
const FinancePage = lazy(() => import("./pages/finance/FinancePage"));
const StaffPage = lazy(() => import("./pages/staff/StaffPage"));
const ShopSettingsPage = lazy(() => import("./pages/shop/ShopSettingsPage"));
const AuditPage = lazy(() => import("./pages/audit/AuditPage"));
const TeamPage = lazy(() => import("./pages/team/TeamPage"));
const SubscriptionPage = lazy(() => import("./pages/subscription/SubscriptionPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));

function PageLoader() {
  return (
    <div
      className="loading"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BrandLogo size={42} alt="DukanKhata" />
      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--mute)" }}>
        Loading workspace...
      </span>
    </div>
  );
}

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

  if ((requiredFeature === "team" || requiredFeature === "audit") && user?.operatingMode === "SMALL") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
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
            <Protected requiredFeature="audit">
              <AuditPage />
            </Protected>
          }
        />
        <Route
          path="/team"
          element={
            <Protected requiredFeature="team">
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
    </Suspense>
  </AuthProvider>
);
}
