import { auth, storage } from "./firebaseConfig.js";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { fetchJSON } from "./api.js";
import { getFriendlyErrorMessage } from "./error-handler.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isFirebaseStorageUrl(url) {
  return typeof url === "string" && url.includes("firebasestorage.googleapis.com");
}

function storagePathFromUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/o\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("profileForm");
  const msg = document.getElementById("profileMsg");
  const nameInput = document.getElementById("profileDisplayName");
  const photoInput = document.getElementById("profilePhotoURL");
  const photoFileInput = document.getElementById("profilePhotoFile");
  const previewImg = document.getElementById("profilePhotoPreview");
  const removePhotoCheckbox = document.getElementById("removeProfilePhoto");
  const photoHint = document.getElementById("profilePhotoHint");
  const emailInput = document.getElementById("profileEmail");
  const roleEl = document.getElementById("profileRole");
  const verifiedEl = document.getElementById("profileVerified");
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const dropzone = document.getElementById("profileDropzone");
  const browseBtn = document.getElementById("profileBrowseBtn");
  const clearBtn = document.getElementById("clearSelectedPhotoBtn");
  const progressWrap = document.getElementById("uploadProgressWrap");
  const progressBar = document.getElementById("uploadProgressBar");
  const progressLabel = document.getElementById("uploadProgressLabel");
  const fileMeta = document.getElementById("selectedFileMeta");

  let currentProfile = null;
  let previewObjectUrl = null;
  let selectedFile = null;

  function show(message, type = "info") {
    msg.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }

  function clearPreviewObjectUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function updateProgress(percent = 0, label = "") {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    progressWrap.classList.toggle("d-none", safePercent <= 0 || safePercent >= 100 ? !label : false);
    progressBar.style.width = `${safePercent}%`;
    progressBar.setAttribute("aria-valuenow", String(safePercent));
    progressBar.textContent = `${safePercent}%`;
    progressLabel.textContent = label || (safePercent > 0 ? `Uploading ${safePercent}%` : "Waiting for upload...");
    if (safePercent >= 100 && !label) {
      progressLabel.textContent = "Upload complete.";
    }
  }

  function resetProgress() {
    progressWrap.classList.add("d-none");
    progressBar.style.width = "0%";
    progressBar.setAttribute("aria-valuenow", "0");
    progressBar.textContent = "0%";
    progressLabel.textContent = "";
  }

  function setPreview(url) {
    if (url) {
      previewImg.src = url;
      previewImg.classList.remove("d-none");
      if (!selectedFile) {
        photoHint.textContent = "Preview ready.";
      }
    } else {
      previewImg.src = "";
      previewImg.classList.add("d-none");
      photoHint.textContent = "No profile photo selected.";
    }
  }

  function setDropzoneActive(active) {
    dropzone?.classList.toggle("drag-active", !!active);
  }

  function clearSelectedFile(opts = {}) {
    selectedFile = null;
    if (photoFileInput) photoFileInput.value = "";
    fileMeta.textContent = "No new file selected.";
    clearBtn?.classList.add("d-none");
    clearPreviewObjectUrl();
    if (!opts.keepExistingPreview) {
      setPreview(photoInput.value.trim());
    }
    if (!opts.keepHint) {
      photoHint.textContent = photoInput.value.trim() ? "Preview ready." : "No profile photo selected.";
    }
    resetProgress();
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = units[0];
    for (let i = 0; i < units.length && size >= 1024; i += 1) {
      unit = units[Math.min(i + 1, units.length - 1)];
      size /= 1024;
      if (size < 1024) break;
    }
    return `${size.toFixed(size >= 10 || unit === "B" ? 0 : 1)} ${unit}`;
  }

  function validateFile(file) {
    if (!file) return "Please choose an image file.";
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return "Only JPG, PNG, WEBP, or GIF images are allowed.";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "Image size must be 5 MB or below.";
    }
    return "";
  }

  function applySelectedFile(file) {
    const validationError = validateFile(file);
    if (validationError) {
      clearSelectedFile({ keepHint: true });
      setPreview(photoInput.value.trim());
      show(validationError, "danger");
      return;
    }

    selectedFile = file;
    if (photoFileInput?.files?.[0] !== file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      photoFileInput.files = dt.files;
    }

    clearPreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(file);
    setPreview(previewObjectUrl);
    removePhotoCheckbox.checked = false;
    fileMeta.textContent = `${file.name} • ${formatBytes(file.size)}`;
    clearBtn?.classList.remove("d-none");
    photoHint.textContent = "New image selected. Save changes to upload it.";
    resetProgress();
  }

  async function loadProfile() {
    try {
      const profile = await fetchJSON("/api/users/me");
      currentProfile = profile;
      nameInput.value = profile.displayName || sessionStorage.getItem("displayName") || "";
      photoInput.value = profile.photoURL || sessionStorage.getItem("photoURL") || "";
      emailInput.value = profile.email || sessionStorage.getItem("email") || "";
      roleEl.textContent = profile.role || "customer";
      verifiedEl.textContent = profile.emailVerified ? "verified" : "not verified";
      removePhotoCheckbox.checked = false;
      clearSelectedFile({ keepExistingPreview: true, keepHint: true });
      setPreview(photoInput.value.trim());
      fileMeta.textContent = photoInput.value.trim() ? "Current profile image loaded." : "No new file selected.";
    } catch (err) {
      show(escapeHtml(getFriendlyErrorMessage(err, "Failed to load profile")), "danger");
    }
  }

  async function uploadPhoto(file, user) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `profile-photos/${user.uid}/${Date.now()}-${safeName}`;
    const fileRef = ref(storage, path);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, file, {
        contentType: file.type || "application/octet-stream",
        customMetadata: {
          uid: user.uid,
          uploadedBy: user.email || user.uid
        }
      });

      updateProgress(1, "Starting upload...");

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = snapshot.totalBytes
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;
          updateProgress(percent, `Uploading ${Math.round(percent)}%`);
        },
        (error) => reject(error),
        async () => {
          try {
            updateProgress(100, "Upload complete.");
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  async function maybeDeleteOldPhoto(oldUrl) {
    const oldPath = storagePathFromUrl(oldUrl);
    if (!oldPath) return;
    try {
      await deleteObject(ref(storage, oldPath));
    } catch {
      // Ignore cleanup failures for old files.
    }
  }

  photoInput?.addEventListener("input", () => {
    if (selectedFile) return;
    const url = photoInput.value.trim();
    setPreview(url);
  });

  photoFileInput?.addEventListener("change", () => {
    const file = photoFileInput.files?.[0];
    if (!file) {
      clearSelectedFile();
      return;
    }
    applySelectedFile(file);
  });

  browseBtn?.addEventListener("click", () => photoFileInput?.click());
  clearBtn?.addEventListener("click", () => {
    clearSelectedFile();
    removePhotoCheckbox.checked = false;
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropzoneActive(true);
    });
  });

  ["dragleave", "dragend"].forEach((evt) => {
    dropzone?.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropzoneActive(false);
    });
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropzoneActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) applySelectedFile(file);
  });

  removePhotoCheckbox?.addEventListener("change", () => {
    if (removePhotoCheckbox.checked) {
      clearSelectedFile({ keepExistingPreview: true, keepHint: true });
      setPreview("");
      photoHint.textContent = "Current photo will be removed when you save changes.";
      fileMeta.textContent = "Photo removal selected.";
    } else {
      setPreview(selectedFile ? previewObjectUrl : photoInput.value.trim());
      fileMeta.textContent = selectedFile ? `${selectedFile.name} • ${formatBytes(selectedFile.size)}` : (photoInput.value.trim() ? "Current profile image loaded." : "No new file selected.");
      if (!selectedFile) {
        photoHint.textContent = photoInput.value.trim() ? "Preview ready." : "No profile photo selected.";
      }
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      let nextPhotoURL = photoInput.value.trim();
      const oldPhotoURL = currentProfile?.photoURL || "";

      if (removePhotoCheckbox.checked) {
        nextPhotoURL = "";
      }

      if (selectedFile) {
        if (!user) throw new Error("You must be logged in to upload a photo.");
        show("Uploading profile photo...", "info");
        nextPhotoURL = await uploadPhoto(selectedFile, user);
      }

      const payload = {
        displayName: nameInput.value.trim(),
        photoURL: nextPhotoURL
      };

      if (user) {
        await updateProfile(user, payload).catch(() => {});
        if (newPassword.value.trim()) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword.value);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword.value.trim());
        }
      }

      const updated = await fetchJSON("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      if (oldPhotoURL && oldPhotoURL !== nextPhotoURL && isFirebaseStorageUrl(oldPhotoURL)) {
        await maybeDeleteOldPhoto(oldPhotoURL);
      }

      sessionStorage.setItem("displayName", updated.displayName || payload.displayName || "");
      sessionStorage.setItem("photoURL", updated.photoURL || payload.photoURL || "");
      photoInput.value = updated.photoURL || "";
      clearSelectedFile({ keepExistingPreview: true, keepHint: true });
      clearPreviewObjectUrl();
      setPreview(updated.photoURL || "");
      fileMeta.textContent = updated.photoURL ? "Current profile image loaded." : "No new file selected.";
      show("Profile updated successfully.", "success");
      currentPassword.value = "";
      newPassword.value = "";
      resetProgress();
      await loadProfile();
    } catch (err) {
      updateProgress(0, "");
      show(escapeHtml(err.message || "Failed to update profile"), "danger");
    }
  });

  await loadProfile();
});
