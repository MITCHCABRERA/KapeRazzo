const router = require("express").Router();
const Order = require("../models/Order");
const { verifyToken, requireVerifiedEmail } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/appError");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");

router.get("/", verifyToken, checkRole("admin"), asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
}));

router.get("/my", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const orders = await Order.find({ uid: req.user.uid }).sort({ createdAt: -1 });
  res.json(orders);
}));

router.post("/", verifyToken, requireVerifiedEmail, [
  body("customerName").trim().notEmpty(),
  body("phone").optional({ values: "falsy" }).isLength({ max: 30 }),
  body("method").optional({ values: "falsy" }).isLength({ max: 40 }),
  body("address").optional({ values: "falsy" }).isLength({ max: 300 }),
  body("total").isFloat({ min: 0 }),
  body("items").isArray({ min: 1 }),
  body("items.*.name").trim().notEmpty(),
  body("items.*.price").isFloat({ min: 0 }),
  body("items.*.qty").optional().isInt({ min: 1, max: 100 })
], validate, asyncHandler(async (req, res) => {
  const { customerName, items, total, phone, method, address, payment } = req.body || {};

  if (!customerName) throw new AppError("customerName is required", 400, "ORDER_CUSTOMER_NAME_REQUIRED");
  if (!Array.isArray(items) || items.length === 0) throw new AppError("items must be a non-empty array", 400, "ORDER_ITEMS_REQUIRED");
  if (total === undefined || Number.isNaN(Number(total))) throw new AppError("total is required", 400, "ORDER_TOTAL_REQUIRED");

  const cleanedItems = items.map((i) => ({
    productId: i.productId || i._id || undefined,
    name: i.name,
    price: Number(i.price),
    qty: Number(i.qty || 1),
    size: i.size || "Regular"
  }));

  const order = await Order.create({
    uid: req.user.uid,
    customerName,
    customerEmail: req.user.email,
    phone: phone || "",
    method: method || "",
    address: address || "",
    payment: { account: payment?.account || "", reference: payment?.reference || "" },
    items: cleanedItems,
    total: Number(total),
    status: "pending"
  });

  res.status(201).json(order);
}));

router.get("/:id", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  if (!req.user.isAdmin && order.uid !== req.user.uid) throw new AppError("Forbidden", 403, "ORDER_FORBIDDEN");
  res.json(order);
}));

router.patch("/:id", verifyToken, requireVerifiedEmail, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ["pending", "confirmed", "completed", "cancelled"];

  if (!allowed.includes(status)) throw new AppError("Invalid status value", 400, "ORDER_STATUS_INVALID", { allowed });

  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");

  const isOwner = order.uid === req.user.uid;
  if (!req.user.isAdmin) {
    if (!isOwner) throw new AppError("Forbidden", 403, "ORDER_FORBIDDEN");
    if (status !== "cancelled") throw new AppError("Customers can only cancel their own orders", 403, "ORDER_CUSTOMER_CANCEL_ONLY");
  }

  order.status = status;
  await order.save();
  res.json(order);
}));

router.delete("/:id", verifyToken, checkRole("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Order.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  res.json({ success: true, message: "Order deleted", id });
}));

module.exports = router;
