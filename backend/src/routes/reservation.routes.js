const router = require("express").Router();
const Reservation = require("../models/Reservation");


// -----------------------------------
// GET all reservations (Admin Only via ADMIN_KEY)
// -----------------------------------
router.get("/", async (req, res) => {
  try {

    const adminKey = req.query.adminKey;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        message: "Access denied: invalid admin key"
      });
    }

    const reservations = await Reservation.find().sort({ createdAt: -1 });

    res.json(reservations);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});


// -----------------------------------
// POST create reservation (Public - customer)
// -----------------------------------
router.post("/", async (req, res) => {
  try {

    const { uid, name, phone, email, date, time, guests, notes } = req.body;

    // uid is required because your schema requires it
    if (!uid || !name || !phone || !date || !time || guests === undefined) {
      return res.status(400).json({
        message: "uid, name, phone, date, time, guests are required"
      });
    }

    const reservation = await Reservation.create({
      uid,
      name,
      phone,
      email: email || "guest@email.com",
      date,
      time,
      guests: Number(guests),
      notes: notes || "",
      status: "pending"
    });

    res.status(201).json(reservation);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});


// -----------------------------------
// PATCH update reservation status (Admin Only)
// -----------------------------------
router.patch("/:id", async (req, res) => {
  try {

    const adminKey = req.query.adminKey;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        message: "Access denied: invalid admin key"
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const updated = await Reservation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    res.json(updated);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});


// -----------------------------------
// DELETE reservation (Admin Only)
// -----------------------------------
router.delete("/:id", async (req, res) => {
  try {

    const adminKey = req.query.adminKey;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        message: "Access denied: invalid admin key"
      });
    }

    const { id } = req.params;

    const deleted = await Reservation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    res.json({
      message: "Reservation deleted ✅",
      id
    });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});

module.exports = router;