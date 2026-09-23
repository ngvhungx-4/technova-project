document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();

  const avatarInput = document.getElementById("admin-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = function (event) {
          const preview = document.getElementById("admin-avatar-preview");
          preview.style.backgroundImage = `url('${event.target.result}')`;
          preview.innerHTML = "";
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

let selectedAvatarFile = null;

function loadAdminData() {
  const fullName = AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "";
  const email = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL) || "";
  const phone = AuthUtils.getUserInfo(AppConfig.KEYS.PHONE) || "";
  const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);

  document.getElementById("admin-fullname").value = fullName;
  document.getElementById("admin-email").value = email;
  document.getElementById("admin-phone").value = phone;

  const preview = document.getElementById("admin-avatar-preview");
  if (avatarUrl && avatarUrl !== "null" && avatarUrl.startsWith("http")) {
    preview.style.backgroundImage = `url('${avatarUrl}')`;
    preview.innerHTML = "";
  } else {
    preview.style.backgroundImage = "none";
    preview.innerHTML = `<span class="tracking-wide">${UIUtils.getInitials(fullName)}</span>`;
  }
}

async function updateAdminProfile() {
  const btn = document.getElementById("btn-update-profile");
  const fullName = document.getElementById("admin-fullname").value.trim();
  const email = document.getElementById("admin-email").value.trim();
  const phone = document.getElementById("admin-phone").value.trim();
  let currentAvatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR) || "";

  if (!fullName || !email || !phone) {
    alert("Vui lòng không để trống các thông tin bắt buộc!");
    return;
  }

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    if (selectedAvatarFile) {
      const formData = new FormData();
      formData.append("file", selectedAvatarFile);

      const uploadRes = await fetch(`${AppConfig.BASE_URL}/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
        body: formData,
      });

      if (uploadRes.ok) {
        currentAvatarUrl = await uploadRes.text();
      } else {
        alert("Lỗi upload ảnh! Vui lòng thử lại.");
        UIUtils.setLoading(btn, false, "Lưu thay đổi");
        return;
      }
    }

    const response = await fetch(`${AppConfig.BASE_URL}/users/admin/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify({
        fullName: fullName,
        email: email,
        phoneNumber: phone,
        avatar: currentAvatarUrl,
      }),
    });

    if (response.ok) {
      alert("Cập nhật thông tin thành công!");
      selectedAvatarFile = null;

      const currentEmail = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL);
      if (email !== currentEmail) {
        alert(
          "Bạn vừa thay đổi Email đăng nhập. Hệ thống sẽ tự động đăng xuất!",
        );
        AuthUtils.logout(true);
      } else {
        const userData = {
          userId: AuthUtils.getUserInfo(AppConfig.KEYS.USER_ID),
          fullName: fullName,
          email: email,
          phone: phone,
          avatar: currentAvatarUrl,
          role: AuthUtils.getUserInfo(AppConfig.KEYS.ROLE),
        };
        AuthUtils.saveAuthData(
          AuthUtils.getToken(),
          userData,
          localStorage.getItem(AppConfig.KEYS.TOKEN) !== null,
        );
        if (typeof HeaderLogic !== "undefined") HeaderLogic.updateHeaderState();
      }
    } else {
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi kết nối đến máy chủ!");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu thay đổi");
  }
}

async function changeAdminPassword() {
  const btn = document.getElementById("btn-change-password");
  const currentPass = document.getElementById("admin-current-pass").value;
  const newPass = document.getElementById("admin-new-pass").value;
  const confirmPass = document.getElementById("admin-confirm-pass").value;

  if (!currentPass || !newPass || !confirmPass) {
    alert("Vui lòng điền đầy đủ các trường mật khẩu!");
    return;
  }

  if (currentPass === newPass) {
    alert("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
    document.getElementById("admin-new-pass").focus();
    return;
  }

  if (newPass.length < 8) {
    alert("Mật khẩu mới phải có ít nhất 8 ký tự!");
    document.getElementById("admin-new-pass").focus();
    return;
  }

  if (newPass !== confirmPass) {
    alert("Mật khẩu xác nhận không khớp!");
    document.getElementById("admin-confirm-pass").focus();
    return;
  }

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    const response = await fetch(
      `${AppConfig.BASE_URL}/users/change-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AuthUtils.getToken()}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
          confirmationPassword: confirmPass,
        }),
      },
    );

    if (response.ok) {
      alert(
        "Đổi mật khẩu thành công! Hệ thống sẽ tự động đăng xuất để bảo mật.",
      );
      AuthUtils.logout(true);
    } else {
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (error) {
    console.error("Lỗi gọi API:", error);
    alert("Lỗi kết nối đến máy chủ! Vui lòng thử lại sau.");
  } finally {
    UIUtils.setLoading(btn, false, "Cập nhật mật khẩu");

    document.getElementById("admin-current-pass").value = "";
    document.getElementById("admin-new-pass").value = "";
    document.getElementById("admin-confirm-pass").value = "";
  }
}
