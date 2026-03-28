document.addEventListener("DOMContentLoaded", () => {
  const rawName = sessionStorage.getItem("displayName") || sessionStorage.getItem("loggedInUser") || "User";
  const name = String(rawName).includes("@") ? String(rawName).split("@")[0] : rawName;
  const email = sessionStorage.getItem("email") || sessionStorage.getItem("userEmail") || "guest@email.com";
  const photoURL = sessionStorage.getItem("photoURL") || "";
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111827&color=ffffff`;
  const avatar = photoURL || fallbackAvatar;

  const nameTargets = [
    ...document.querySelectorAll('[data-user-name]'),
    document.getElementById("userName")
  ].filter(Boolean);

  const emailTargets = [
    ...document.querySelectorAll('[data-user-email]'),
    document.getElementById("userEmail")
  ].filter(Boolean);

  const photoTargets = [
    ...document.querySelectorAll('[data-user-photo]'),
    document.getElementById("userPhoto")
  ].filter(Boolean);

  nameTargets.forEach((el) => {
    el.textContent = name || "User";
  });

  emailTargets.forEach((el) => {
    el.textContent = email;
    if (email === "guest@email.com") {
      el.classList.add("is-guest-user");
    } else {
      el.classList.remove("is-guest-user");
    }
  });

  photoTargets.forEach((el) => {
    if (el.tagName === "IMG") {
      el.src = avatar;
      el.alt = `${name || "User"} profile`;
      el.loading = "lazy";
      el.decoding = "async";
    } else {
      el.style.backgroundImage = `url("${avatar}")`;
    }
  });
});
