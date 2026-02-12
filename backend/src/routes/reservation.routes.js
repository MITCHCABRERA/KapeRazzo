const router = require("express").Router();
const Reservation = require("../models/Reservation");

// ✅ SECURE GET reservations
// - User:  GET /api/reservations?uid=xxx  -> only their reservations
// - Admin: GET /api/reservations?adminKey=SECRET -> all reservations
router.get("/", async (req, res) => {
  try {
    const { uid, adminKey } = req.query;

    // ✅ Admin access (see all reservations)
    if (adminKey && adminKey === process.env.ADMIN_KEY) {
      const all = await Reservation.find().sort({ createdAt: -1 });
      return res.json(all);
    }

    // ✅ Otherwise require uid
    if (!uid) {
      return res.status(401).json({
        message: "Unauthorized: provide uid or valid adminKey"
      });
    }

    const reservations = await Reservation.find({ uid }).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST create reservation (customer) - requires uid
router.post("/", async (req, res) => {
  try {
    const { uid, name, phone, email, date, time, guests, notes } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    if (!name || !phone || !date || !time || guests === undefined) {
      return res.status(400).json({
        message: "name, phone, date, time, guests are required"
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

// ✅ PATCH update reservation (status + other fields)
// requires uid so users can only update their own reservation
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const allowedStatus = ["pending", "confirmed", "cancelled"];

    const updates = {};
    const { uid, name, phone, email, date, time, guests, notes, status } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (notes !== undefined) updates.notes = notes;

    if (guests !== undefined) {
      const g = Number(guests);
      if (Number.isNaN(g) || g < 1) {
        return res.status(400).json({ message: "guests must be a number >= 1" });
      }
      updates.guests = g;
    }

    if (status !== undefined) {
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    // ✅ Only update if reservation belongs to this uid
    const updated = await Reservation.findOneAndUpdate(
      { _id: id, uid },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Reservation not found (or not yours)" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE reservation permanently
// requires uid so users can only delete their own
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    const deleted = await Reservation.findOneAndDelete({ _id: id, uid });

    if (!deleted) {
      return res.status(404).json({ message: "Reservation not found (or not yours)" });
    }

    res.json({ message: "Reservation deleted ✅", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
