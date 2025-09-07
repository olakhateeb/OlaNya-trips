//src/components/header/Header.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../navbar/NavBar";
import classes from "./header.module.css";
import logo from "../../assets/logo.png";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={classes.header}>
      {/* שמאל: לוגו */}
      <div className={classes.logo} onClick={() => navigate("/")}>
        <img src={logo} alt="Do OlaNya Trips" className={classes.logoImg} />
      </div>

      {/* אמצע: ניווט */}
      <div className={classes.nav}>
        <NavBar />
      </div>
    </header>
  );
}
