const router = require("express").Router();
const Order = require("../models/Order");


// -----------------------------------
// GET all orders (Admin Only via ADMIN_KEY)
// -----------------------------------
router.get("/", async (req, res) => {
  try {

    const adminKey = req.query.adminKey;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        message: "Access denied: invalid admin key"
      });
    }

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});


// -----------------------------------
// POST create order (Public - Customer checkout)
// -----------------------------------
router.post("/", async (req, res) => {
  try {

    const { customerName, customerEmail, items, total, uid } = req.body;

    if (!customerName || !customerEmail) {
      return res.status(400).json({
        message: "customerName and customerEmail are required"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items must be a non-empty array"
      });
    }

    if (total === undefined || Number.isNaN(Number(total))) {
      return res.status(400).json({
        message: "total is required"
      });
    }

    const cleanedItems = items.map((i) => ({
      productId: i.productId || i._id || undefined,
      name: i.name,
      price: Number(i.price),
      qty: Number(i.qty || 1),
      size: i.size || "Regular"
    }));

    const order = await Order.create({
      uid: uid || null,
      customerName,
      customerEmail,
      items: cleanedItems,
      total: Number(total),
      status: "pending"
    });

    res.status(201).json(order);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});

// -----------------------------------
// GET single order (Customer status check)
// -----------------------------------
router.get("/:id", async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(order);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
});

// -----------------------------------
// PATCH update order status (Admin Only)
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

    const allowed = ["pending", "confirmed", "completed", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(updated);

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});


// -----------------------------------
// DELETE remove order (Admin Only)
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

    const deleted = await Order.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json({
      message: "Order deleted ✅",
      id
    });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }
});

module.exports = router;