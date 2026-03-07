const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // Optional for now until backend verifies real auth server-side
    uid: { type: String, default: null, index: true },

    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true },

    phone: { type: String, default: "", trim: true },
    method: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },

    payment: {
      account: { type: String, default: "", trim: true },
      reference: { type: String, default: "", trim: true }
    },

    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 1 },
        size: { type: String, default: "Regular", trim: true }
      }
    ],

    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);