const router = require("express").Router();
const Product = require("../models/Product");

const { verifyToken } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

// Import validation tools
const { body, validationResult } = require("express-validator");


// -----------------------------------
// GET all products (Public)
// -----------------------------------
router.get("/", async (req, res) => {

  try {

    const products = await Product.find().sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});


// -----------------------------------
// POST create product (Admin Only)
// -----------------------------------
router.post(
  "/",
  verifyToken,
  checkRole("admin"),

  //  Input validation
  [
    body("name")
      .notEmpty()
      .withMessage("Product name is required"),

    body("category")
      .notEmpty()
      .withMessage("Category is required"),

    body("price")
      .isNumeric()
      .withMessage("Price must be a number")
  ],

  async (req, res) => {

    //  Check validation result
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    try {

      const { name, category, price, imageUrl, isAvailable } = req.body;

      const product = await Product.create({
        name,
        category,
        price,
        imageUrl: imageUrl || "",
        isAvailable: isAvailable ?? true
      });

      res.status(201).json(product);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);

module.exports = router;