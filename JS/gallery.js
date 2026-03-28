document.addEventListener("DOMContentLoaded", () => {
  const galleryImages = document.querySelectorAll(".gallery-img");
  const modalImage = document.getElementById("modalImage");
  if (!galleryImages.length || !modalImage) return;

  galleryImages.forEach((img) => {
    img.addEventListener("click", () => {
      modalImage.src = img.dataset.bsImg || img.getAttribute("src") || "";
      modalImage.alt = img.getAttribute("alt") || "Gallery image";
    });
  });
});
