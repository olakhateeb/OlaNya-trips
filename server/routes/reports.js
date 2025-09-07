// ===== Reports: Surprise Trip Orders =====

// JSON list (עם שמות נהג/מטייל)
router.get("/reports/orders", verifyToken, adminAuth, async (req, res) => {
  try {
    const { whereSql, args } = buildOrdersWhere(req.query);
    const sql = `
      SELECT
        o.order_num,
        o.order_date,
        o.trip_date,
        o.order_participants_num,
        o.o_driver_id,
        o.o_traveler_id,
        o.trip_name,
        o.traveler_address,
        o.status,
        uD.userName AS driver_name,
        uT.userName AS traveler_name
      FROM orders o
      LEFT JOIN users uD ON uD.idNumber = o.o_driver_id
      LEFT JOIN users uT ON uT.idNumber = o.o_traveler_id
      ${whereSql}
      ORDER BY o.order_num DESC
    `;
    const rows = await db.query(sql, args);
    res.json(rows); // אפשר גם res.json({ orders: rows })
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

// Excel export
router.get(
  "/reports/orders/export",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const { whereSql, args } = buildOrdersWhere(req.query);
      const sql = `
      SELECT
        o.order_num,
        o.order_date,
        o.trip_date,
        o.order_participants_num,
        o.o_driver_id,
        o.o_traveler_id,
        o.trip_name,
        o.traveler_address,
        o.status,
        uD.userName AS driver_name,
        uT.userName AS traveler_name
      FROM orders o
      LEFT JOIN users uD ON uD.idNumber = o.o_driver_id
      LEFT JOIN users uT ON uT.idNumber = o.o_traveler_id
      ${whereSql}
      ORDER BY o.order_num DESC
    `;
      const rows = await db.query(sql, args);

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Orders");

      ws.columns = [
        { header: "מס׳ הזמנה", key: "order_num", width: 12 },
        { header: "תאריך הזמנה", key: "order_date", width: 14 },
        { header: "תאריך טיול", key: "trip_date", width: 18 },
        { header: "משתתפים", key: "order_participants_num", width: 10 },
        { header: "נהג (ת.ז.)", key: "o_driver_id", width: 14 },
        { header: "שם נהג", key: "driver_name", width: 18 },
        { header: "מטייל (ת.ז.)", key: "o_traveler_id", width: 14 },
        { header: "שם מטייל", key: "traveler_name", width: 18 },
        { header: "שם טיול", key: "trip_name", width: 22 },
        { header: "כתובת איסוף", key: "traveler_address", width: 24 },
        { header: "סטטוס", key: "status", width: 12 },
      ];

      const fmt = (v) => (v == null ? "" : String(v));
      rows.forEach((r) =>
        ws.addRow({
          order_num: r.order_num,
          order_date: fmt(r.order_date),
          trip_date: fmt(r.trip_date),
          order_participants_num: r.order_participants_num,
          o_driver_id: r.o_driver_id,
          driver_name: r.driver_name,
          o_traveler_id: r.o_traveler_id,
          traveler_name: r.traveler_name,
          trip_name: r.trip_name,
          traveler_address: r.traveler_address,
          status: r.status,
        })
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="orders-report.xlsx"`
      );
      await wb.xlsx.write(res);
      res.end();
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Export failed" });
    }
  }
);
