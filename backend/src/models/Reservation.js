const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    // ✅ Firebase user id (Google account)
    uid: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "guest@email.com", trim: true, lowercase: true },

    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // e.g. "18:30"
    guests: { type: Number, required: true, min: 1 },

    notes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);
