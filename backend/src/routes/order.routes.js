const router = require("express").Router();
const Order = require("../models/Order");
const { verifyToken, requireVerifiedEmail } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

router.get("/", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/my", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const orders = await Order.find({ uid: req.user.uid }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const { customerName, items, total, phone, method, address, payment } = req.body;

    if (!customerName) {
      return res.status(400).json({ message: "customerName is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }

    if (total === undefined || Number.isNaN(Number(total))) {
      return res.status(400).json({ message: "total is required" });
    }

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
      payment: {
        account: payment?.account || "",
        reference: payment?.reference || ""
      },
      items: cleanedItems,
      total: Number(total),
      status: "pending"
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!req.user.isAdmin && order.uid !== req.user.uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", verifyToken, requireVerifiedEmail, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "completed", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.uid === req.user.uid;
    if (!req.user.isAdmin) {
      if (!isOwner) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (status !== "cancelled") {
        return res.status(403).json({ message: "Customers can only cancel their own orders" });
      }
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, checkRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
