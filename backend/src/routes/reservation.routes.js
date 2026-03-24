const router = require("express").Router();
const Reservation = require("../models/Reservation");
const { verifyToken, requireVerifiedEmail } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

router.get("/", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/my", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const reservations = await Reservation.find({ uid: req.user.uid }).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const { name, phone, date, time, guests, notes } = req.body;

    if (!name || !phone || !date || !time || guests === undefined) {
      return res.status(400).json({ message: "name, phone, date, time, guests are required" });
    }

    const reservation = await Reservation.create({
      uid: req.user.uid,
      name,
      phone,
      email: req.user.email,
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

router.get("/:id", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    if (!req.user.isAdmin && reservation.uid !== req.user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const isOwner = reservation.uid === req.user.uid;
    if (!req.user.isAdmin) {
      if (!isOwner) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (status !== "cancelled") {
        return res.status(403).json({ message: "Customers can only cancel their own reservations" });
      }
    }

    reservation.status = status;
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Reservation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json({ message: "Reservation deleted", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
