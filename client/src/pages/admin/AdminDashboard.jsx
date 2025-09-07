// AdminDashboard.jsx
import React, { useState } from "react";
import AdminTrips from "./AdminTrips";
import AdminCamping from "./AdminCamping";
import AdminAttractions from "./AdminAttractions";
import AdminUsers from "./AdminUsers";
import AdminReports from "./AdminReports";
import styles from "./admin-dashboard.module.css";

/* אייקונים */
import { MdHiking, MdAttractions } from "react-icons/md";
import { GiCampingTent } from "react-icons/gi";
import { FaUsers } from "react-icons/fa6";
import { HiOutlineDocumentReport } from "react-icons/hi";

const AdminDashboard = () => {
  const [tab, setTab] = useState("reports"); // trips | camping | attractions | users | reports

  const TabButton = ({ id, label, Icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`${styles.tabBtn} ${tab === id ? styles.tabBtnActive : ""}`}
    >
      {Icon && <Icon className={styles.tabIcon} aria-hidden="true" />}
      <span className={styles.tabLabel}>{label}</span>
    </button>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ממשק מנהל</h1>

      <div className={styles.tabs}>
        <TabButton id="trips" label="טיולים" Icon={MdHiking} />
        <TabButton id="camping" label="קמפינג" Icon={GiCampingTent} />
        <TabButton id="attractions" label="אטרקציות" Icon={MdAttractions} />
        <TabButton id="users" label="משתמשים" Icon={FaUsers} />
        <TabButton id="reports" label="דוחות" Icon={HiOutlineDocumentReport} />
      </div>

      <div className={styles.content}>
        {tab === "trips" && <AdminTrips />}
        {tab === "camping" && <AdminCamping />}
        {tab === "attractions" && <AdminAttractions />}
        {tab === "users" && <AdminUsers />}
        {tab === "reports" && <AdminReports />}
      </div>
    </div>
  );
};

export default AdminDashboard;
