// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import classes from "./app.module.css";

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
import Search from "../pages/search/Search";
// Simple home component for after login
// function Home() {
//   return (
//     <div style={{ padding: "2rem" }}>
//       <h1>Welcome to DoOlanyaTrips!</h1>
//       <p>Discover amazing attractions and plan your next adventure.</p>
//     </div>
//   );
// }

export default function App() {
  const user = JSON.parse(localStorage.getItem("user"));
  const travelerId = user?._id;

  return (
    <div className={classes.appContainer}>
      <Header />

      <main className={classes.mainContent}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/login" element={<Auth isLogin={true} />} />
          <Route path="/register" element={<Auth isLogin={false} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify" element={<VerifyAndReset />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/home" element={<Home />} />
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

          {/* 🔥 כאן אתה כבר משתמש במזהה של המטייל */}
          <Route
            path="/surprise"
            element={<SurpriseTripView travelerId={travelerId} />}
          />
          <Route path="/search" element={<Search />} />

          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
