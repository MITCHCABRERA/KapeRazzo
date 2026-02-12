const router = require("express").Router();
const Order = require("../models/Order");

// ✅ SECURE GET orders
// - User:  GET /api/orders?uid=xxx  -> only their orders
// - Admin: GET /api/orders?adminKey=SECRET -> all orders
router.get("/", async (req, res) => {
  try {
    const { uid, adminKey } = req.query;

    // ✅ Admin access (see all orders)
    if (adminKey && adminKey === process.env.ADMIN_KEY) {
      const all = await Order.find().sort({ createdAt: -1 });
      return res.json(all);
    }

    // ✅ Otherwise require uid
    if (!uid) {
      return res.status(401).json({
        message: "Unauthorized: provide uid or valid adminKey"
      });
    }

    const orders = await Order.find({ uid }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST create order (checkout) - requires uid
router.post("/", async (req, res) => {
  try {
    const { uid, customerName, customerEmail, items, total, phone, method, address, payment } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    if (!customerName || !customerEmail) {
      return res.status(400).json({ message: "customerName and customerEmail are required" });
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
      uid,
      customerName,
      customerEmail,
      items: cleanedItems,
      total: Number(total),

      // optional fields (only saved if your schema allows them)
      phone: phone || "",
      method: method || "",
      address: address || "",
      payment: payment || {}
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ PATCH update order (status + other fields)
// requires uid so users can only update their own order
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowedStatus = ["pending", "confirmed", "completed", "cancelled"];
    const updates = {};
    const { uid, customerName, customerEmail, items, total, status } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    if (customerName !== undefined) updates.customerName = customerName;
    if (customerEmail !== undefined) updates.customerEmail = customerEmail;

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items must be a non-empty array" });
      }

      updates.items = items.map((i) => ({
        productId: i.productId || i._id || undefined,
        name: i.name,
        price: Number(i.price),
        qty: Number(i.qty || 1),
        size: i.size || "Regular"
      }));
    }

    if (total !== undefined) {
      if (Number.isNaN(Number(total))) {
        return res.status(400).json({ message: "total must be a number" });
      }
      updates.total = Number(total);
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

    const updated = await Order.findOneAndUpdate({ _id: id, uid }, updates, { new: true });

    if (!updated) return res.status(404).json({ message: "Order not found (or not yours)" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ DELETE remove order permanently
// requires uid so users can only delete their own
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(401).json({ message: "Missing uid (login required)" });
    }

    const deleted = await Order.findOneAndDelete({ _id: id, uid });
    if (!deleted) {
      return res.status(404).json({ message: "Order not found (or not yours)" });
    }

    res.json({ message: "Order deleted ✅", id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
