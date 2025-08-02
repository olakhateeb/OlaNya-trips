import { useNavigate } from "react-router-dom";
import Navbar from "../navbar/NavBar";
import classes from "./header.module.css";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={classes.header}>
      <div className={classes.logo} onClick={() => navigate("/")}>
      </div>
      <Navbar />
    </header>
  );
}
