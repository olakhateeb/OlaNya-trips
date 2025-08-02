const db = require("../db");

exports.createSurpriseTrip = async (req, res) => {
  const { travelerId, participantsNum } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. צור טיול חדש
    const [tripResult] = await conn.execute(
      "INSERT INTO trip (destination, is_surprise) VALUES (?, ?)",
      ["hidden", 1]
    );
    const tripId = tripResult.insertId;

    // 2. צור הזמנה
    const [orderResult] = await conn.execute(
      "INSERT INTO `order` (order_date, order_participants_num, o_driver_id, o_traveler_id) VALUES (NOW(), ?, NULL, ?)",
      [participantsNum, travelerId]
    );
    const orderId = orderResult.insertId;

    // 3. חפש נהג מטבלת users
    const [drivers] = await conn.execute(
      "SELECT username FROM users WHERE role = 'driver' LIMIT 1"
    );

    if (drivers.length === 0) {
      throw new Error("No available drivers");
    }

    const driverUsername = drivers[0].username;

    // 4. עדכון ההזמנה עם שם הנהג
    await conn.execute(
      "UPDATE `order` SET o_driver_id = ? WHERE order_num = ?",
      [driverUsername, orderId]
    );

    // 5. שיוך הנהג להזמנה
    await conn.execute(
      "INSERT INTO driver_receives_order (order_id, username) VALUES (?, ?)",
      [orderId, driverUsername]
    );

    await conn.commit();

    res.json({ success: true, tripId, orderId, driver: driverUsername });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};
