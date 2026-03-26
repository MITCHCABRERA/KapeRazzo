const router = require("express").Router();
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/appError");

router.get("/", asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  res.json(product);
}));

module.exports = router;
