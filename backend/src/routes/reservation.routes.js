const router = require("express").Router();
const Reservation = require("../models/Reservation");
const { verifyToken, requireVerifiedEmail } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/appError");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");

router.get("/", verifyToken, checkRole("admin"), asyncHandler(async (req, res) => {
  const reservations = await Reservation.find().sort({ createdAt: -1 });
  res.json(reservations);
}));

router.get("/my", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const reservations = await Reservation.find({ uid: req.user.uid }).sort({ createdAt: -1 });
  res.json(reservations);
}));

router.post("/", verifyToken, requireVerifiedEmail, [
  body("name").trim().notEmpty(),
  body("phone").trim().notEmpty().isLength({ max: 30 }),
  body("date").trim().notEmpty(),
  body("time").trim().notEmpty(),
  body("guests").isInt({ min: 1, max: 50 }),
  body("notes").optional({ values: "falsy" }).isLength({ max: 500 })
], validate, asyncHandler(async (req, res) => {
  const { name, phone, date, time, guests, notes } = req.body || {};
  if (!name || !phone || !date || !time || guests === undefined) {
    throw new AppError("name, phone, date, time, guests are required", 400, "RESERVATION_REQUIRED_FIELDS");
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
}));

router.get("/:id", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
  if (!req.user.isAdmin && reservation.uid !== req.user.uid) throw new AppError("Forbidden", 403, "RESERVATION_FORBIDDEN");
  res.json(reservation);
}));

router.patch("/:id", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ["pending", "confirmed", "cancelled"];

  if (!allowed.includes(status)) throw new AppError("Invalid status value", 400, "RESERVATION_STATUS_INVALID", { allowed });

  const reservation = await Reservation.findById(id);
  if (!reservation) throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");

  const isOwner = reservation.uid === req.user.uid;
  if (!req.user.isAdmin) {
    if (!isOwner) throw new AppError("Forbidden", 403, "RESERVATION_FORBIDDEN");
    if (status !== "cancelled") throw new AppError("Customers can only cancel their own reservations", 403, "RESERVATION_CUSTOMER_CANCEL_ONLY");
  }

  reservation.status = status;
  await reservation.save();
  res.json(reservation);
}));

router.delete("/:id", verifyToken, checkRole("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Reservation.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
  res.json({ success: true, message: "Reservation deleted", id });
}));

module.exports = router;
