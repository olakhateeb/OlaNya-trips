// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import classes from "./app.module.css";

// PayPal Provider נטען פעם אחת בשורש האפליקציה
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// Import components
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ForgotPassword from "../pages/forgotPassword/ForgotPassword";
import ContactUs from "../pages/contact/ContactUs";
import VerifyAndReset from "../pages/verifyAndReset/VerifyAndReset";
import Auth from "../pages/auth/Auth";
import Camping from "../pages/camping/Camping";
import ProfilePage from "../pages/profile/ProfilePage";
import Attractions from "../pages/attraction/Attraction";
import Home from "../pages/home/Home";
import Trips from "../pages/trips/Trips";
import SurpriseTripView from "../pages/surpriseTrip/SurpriseTripView";
import TripDetails from "../pages/tripDetails/TripDetails";
import CampingDetails from "../pages/campingDetails/CampingDetails";
import AttractionDetails from "../pages/attractionDetails/AttractionDetails";
import SearchPage from "../pages/search/SearchPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import DriverDashboard from "../pages/driver/DriverDashboard";

/* ==== Helpers for role-based routing ==== */
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};
const getRole = () => getUser()?.role;

/** דף נחיתה: תמיד מפנה ל-/home (לא בודק תפקיד) */
const RoleLanding = () => <Navigate to="/home" replace />;

/** לא מפנים מנהל/משתמש מתוך דפי הבית — כולם יכולים לראות את העמודים הכלליים */
const HomeGate = ({ children }) => children;

/** אם כבר מחובר—להפנות למסך לפי תפקיד במקום טפסי login/register */
const AuthGate = ({ children }) => {
  const role = getRole();
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "driver") return <Navigate to="/driver" replace />;
  if (role) return <Navigate to="/home" replace />;
  return children;
};

/** שמירת הגנה על נתיבים של תפקידים ספציפיים */
const RequireRole = ({ allow, children }) => {
  const role = getRole();
  return role === allow ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const user = getUser();
  const travelerId = user?._id;

  return (
    <div className={classes.appContainer}>
      <PayPalScriptProvider options={{ clientId: "YOUR_PAYPAL_CLIENT_ID" }}>
        <Header />

        <main className={classes.mainContent}>
          <Routes>
            {/* דף נחיתה */}
            <Route path="/" element={<RoleLanding />} />

            {/* Auth pages: אם כבר מחובר, ננתב אוטומטית */}
            <Route
              path="/login"
              element={
                <AuthGate>
                  <Auth isLogin={true} />
                </AuthGate>
              }
            />
            <Route
              path="/register"
              element={
                <AuthGate>
                  <Auth isLogin={false} />
                </AuthGate>
              }
            />

            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify" element={<VerifyAndReset />} />
            <Route path="/contact" element={<ContactUs />} />

            {/* עמודי תוכן כלליים */}
            <Route
              path="/home"
              element={
                <HomeGate>
                  <Home />
                </HomeGate>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/camping" element={<Camping />} />
            <Route path="/attractions" element={<Attractions />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/trip/:id" element={<TripDetails />} />
            <Route
              path="/camping-detail/:camping_location_name"
              element={<CampingDetails />}
            />
            <Route path="/attraction/:id" element={<AttractionDetails />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Surprise trip (זקוק ל־travelerId) */}
            <Route
              path="/surprise"
              element={<SurpriseTripView travelerId={travelerId} />}
            />

            {/* Admin and Driver Routes (מוגנים) */}
            <Route
              path="/admin"
              element={
                <RequireRole allow="admin">
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/driver"
              element={
                <RequireRole allow="driver">
                  <DriverDashboard />
                </RequireRole>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>

        <Footer />
      </PayPalScriptProvider>
    </div>
  );
}
