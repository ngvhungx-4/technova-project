document.addEventListener("DOMContentLoaded", async () => {
  loadUserProfile();
});

async function loadUserProfile() {
  if (!AuthUtils.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (res.status === 403) {
      alert("Phiên đăng nhập hết hạn.");
      AuthUtils.logout();
      return;
    }

    if (!res.ok) throw new Error("Lỗi tải thông tin");

    const data = await res.json();
    fillUserProfile(data);
    HeaderLogic.updateHeaderState();
  } catch (e) {
    console.error(e);
  }
}

function fillUserProfile(data) {
  // Đổ dữ liệu vào các ô input form theo ID của HTML mới
  const fullnameInput = document.getElementById("fullname");
  if (fullnameInput) fullnameInput.value = data.fullName || "";

  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.value = data.email || "";

  const phoneInput = document.getElementById("phone");
  if (phoneInput) phoneInput.value = data.phoneNumber || "";

  const dobInput = document.getElementById("dob");
  if (dobInput) dobInput.value = data.birthDate || "";

  // Xử lý Giới tính cho thẻ <select>
  const genderSelect = document.getElementById("gender");
  if (genderSelect) {
    if (data.gender === 1) genderSelect.value = "male";
    else if (data.gender === 0) genderSelect.value = "female";
    else genderSelect.value = "other";
  }

  // Đổ dữ liệu Tên ra các vị trí hiển thị (Sidebar và Avatar chính)
  const sidebarName = document.getElementById("sidebar-fullname");
  if (sidebarName) sidebarName.innerText = data.fullName || "";

  const mainName = document.getElementById("main-fullname");
  if (mainName) mainName.innerText = data.fullName || "";

  const membershipTierEl = document.getElementById("membership-tier");
  if (membershipTierEl) {
    const tier = data.membershipTier || "BASIC";
    membershipTierEl.innerText = `${tier} MEMBER`;
  }

  // Cập nhật ảnh đại diện
  updateAvatarUI(data.avatar);
}

async function handleUpdateProfile() {
  const btnSave = document.getElementById("btn-save-profile");

  // Lấy dữ liệu từ các ID mới
  const fullName = document.getElementById("fullname")?.value || "";
  const phoneNumber = document.getElementById("phone")?.value || "";
  const birthDate = document.getElementById("dob")?.value || "";

  // Chuyển đổi giá trị select thành số
  const genderValue = document.getElementById("gender")?.value;
  let gender = 2; // Mặc định là khác
  if (genderValue === "male") gender = 1;
  if (genderValue === "female") gender = 0;

  const payload = { fullName, phoneNumber, birthDate, gender };

  UIUtils.setLoading(btnSave, true, "Đang lưu...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${AuthUtils.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updatedUser = await res.json();
      alert("Cập nhật thành công!");

      const isRemember = !!localStorage.getItem(AppConfig.KEYS.TOKEN);
      AuthUtils.saveAuthData(AuthUtils.getToken(), updatedUser, isRemember);

      fillUserProfile(updatedUser);
      HeaderLogic.updateHeaderState();
      syncReviewsUserInfo();
    } else {
      alert("Cập nhật thất bại.");
    }
  } catch (error) {
    alert("Lỗi kết nối.");
  } finally {
    UIUtils.setLoading(btnSave, false, "Cập nhật");
  }
}

async function handleUploadAvatar(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  if (file.size > 1048576) return alert("File quá lớn (>1MB)");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      body: formData,
    });

    if (res.ok) {
      const newUrl = await res.text();

      const isRemember = !!localStorage.getItem(AppConfig.KEYS.TOKEN);
      const storage = isRemember ? localStorage : sessionStorage;
      storage.setItem(AppConfig.KEYS.AVATAR, newUrl);

      updateAvatarUI(newUrl);
      HeaderLogic.updateHeaderState();
      alert("Đã đổi ảnh đại diện!");
      syncReviewsUserInfo();
    }
  } catch (e) {
    alert("Lỗi upload.");
  } finally {
    inputElement.value = ""; // Reset file input
  }
}

function updateAvatarUI(url) {
  // 1. Khai báo đường dẫn tới ảnh mặc định của bạn
  const defaultAvatar = "assets/img/avatar-default-svgrepo-com.svg";

  // 2. Kiểm tra: Nếu có url hợp lệ thì dùng url đó, nếu không thì dùng ảnh mặc định
  const avatarSrc = url && url.trim() !== "" ? url : defaultAvatar;

  // 3. Cập nhật ảnh chính ở giữa màn hình (thẻ img)
  const img = document.getElementById("avatar-img");
  if (img) {
    img.src = avatarSrc;
  }

  // 4. Cập nhật ảnh nhỏ ở Sidebar bên trái (thuộc tính background-image)
  const sidebarAvatar = document.getElementById("sidebar-avatar");
  if (sidebarAvatar) {
    sidebarAvatar.style.backgroundImage = `url('${avatarSrc}')`;
  }
}

// Giữ nguyên các hàm đồng bộ và mật khẩu của bạn
function togglePasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) {
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) resetPasswordForm();
  } else {
    alert(
      "Vui lòng tạo HTML cho hộp thoại Đổi mật khẩu có id='password-modal' nhé!",
    );
  }
}

function resetPasswordForm() {
  ["current-pass", "new-pass", "confirm-pass"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function handleChangePassword() {
  const currentPassword = document.getElementById("current-pass").value;
  const newPassword = document.getElementById("new-pass").value;
  const confirmationPassword = document.getElementById("confirm-pass").value;
  const btn = document.getElementById("btn-change-pass");
  if (currentPassword === newPassword) {
    alert("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
    return;
  }
  if (!currentPassword || !newPassword || !confirmationPassword)
    return alert("Nhập đủ thông tin!");
  if (newPassword.length < 8) return alert("Mật khẩu mới phải >= 8 ký tự.");
  if (newPassword !== confirmationPassword)
    return alert("Mật khẩu xác nhận không khớp.");

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/change-password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${AuthUtils.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmationPassword,
      }),
    });

    if (res.ok) {
      alert("Đổi mật khẩu thành công!");
      togglePasswordModal();
      resetPasswordForm();
    } else {
      const txt = await res.text();
      try {
        alert(JSON.parse(txt).message);
      } catch (e) {
        alert(txt);
      }
    }
  } catch (error) {
    alert("Lỗi server.");
  } finally {
    UIUtils.setLoading(btn, false, "Cập nhật mật khẩu");
  }
}

function setInputAndText(inputId, displayId, val) {
  const v = val || "";
  const inp = document.getElementById(inputId);
  if (inp) inp.value = v;
  const disp = document.getElementById(displayId);
  if (disp) disp.innerText = v;
}
function getValue(id) {
  return document.getElementById(id)?.value || "";
}
function enableEdit(field) {
  const d = document.getElementById(`display-${field}`);
  const i = document.getElementById(`input-${field}`);
  if (d && i) {
    d.classList.add("hidden");
    i.classList.remove("hidden");
    i.focus();
  }
}
function togglePassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("span");
  input.type = input.type === "password" ? "text" : "password";
  icon.innerText = input.type === "password" ? "visibility_off" : "visibility";
}

async function syncReviewsUserInfo() {
  try {
    const token = AuthUtils.getToken();
    const fullName =
      AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
    const avatar = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR) || "";

    await fetch(`${AppConfig.PRODUCT_API_URL}/products/reviews/sync`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: fullName,
        avatar: avatar,
      }),
    });
    console.log("Đã đồng bộ thông tin đánh giá thành công!");
  } catch (e) {
    console.error("Lỗi đồng bộ đánh giá:", e);
  }
}
