const router = require("express").Router();
const Reservation = require("../models/Reservation");

// GET all reservations (admin use)
router.get("/", async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create reservation (customer)
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, date, time, guests, notes } = req.body;

    if (!name || !phone || !date || !time || guests === undefined) {
      return res.status(400).json({
        message: "name, phone, date, time, guests are required"
      });
    }

    const reservation = await Reservation.create({
      name,
      phone,
      email: email || "guest@email.com",
      date,
      time,
      guests: Number(guests),
      notes: notes || "",
      status: "pending" // ✅ default status
    });

    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ PATCH update reservation status (pending / confirmed / cancelled)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updated = await Reservation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE reservation permanently
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Reservation.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({ message: "Reservation deleted ✅", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
