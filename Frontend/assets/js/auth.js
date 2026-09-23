// Biến toàn cục để lưu email khi chuyển giữa các form
let currentEmail = "";

async function handleAuthSuccess(token, isRemember) {
  if (!token) return alert("Lỗi token!");
  const decoded = AuthUtils.parseJwt(token);
  try {
    const res = await fetch(`${AppConfig.BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let userDataToSave = {};

    if (res.ok) {
      const user = await res.json();
      userDataToSave = {
        userId: decoded.user_id,
        email: user.email,
        fullName: user.fullName,
        role: decoded.role_name,
        avatar: user.avatar,
        phone: user.phoneNumber || user.phone,
      };
    } else {
      userDataToSave = {
        userId: decoded.user_id,
        email: decoded.email,
        fullName: decoded.full_name,
        role: decoded.role_name,
        phone: decoded.phone || decoded.phone_number || decoded.phoneNumber,
      };
    }

    AuthUtils.saveAuthData(token, userDataToSave, isRemember);
  } catch (e) {
    console.error(e);
  }

  const role = decoded?.role_name || "USER";
  const routes = {
    ADMIN: "dashboard.html",
    USER: "home.html",
  };
  window.location.href = routes[role] || "home.html";
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const btn = document.getElementById("btn-login");

  const rememberMe = document.getElementById("remember-me")?.checked || false;

  if (!email || !password) return alert("Vui lòng nhập đủ thông tin!");

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

    await handleAuthSuccess(data.token, rememberMe);
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btn, false, "Đăng nhập");
  }
}

async function handleRegister() {
  const fullName = document.getElementById("reg-fullname").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const btnRegister = document.getElementById("btn-register");

  if (!fullName || !phone || !email || !password) {
    return alert("Nhập đủ thông tin!");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Vui lòng nhập đúng định dạng email (VD: nguyenvan_a@gmail.com)!");
    document.getElementById("reg-email").focus();
    return;
  }

  const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    alert(
      "Số điện thoại không hợp lệ! Vui lòng nhập số mạng Việt Nam gồm 10 chữ số.",
    );
    document.getElementById("reg-phone").focus();
    return;
  }

  if (password.length < 6) {
    alert("Mật khẩu phải có ít nhất 6 ký tự!");
    document.getElementById("reg-password").focus();
    return;
  }

  UIUtils.setLoading(btnRegister, true, "Đang gửi mã...");

  try {
    const res = await fetch(`${AppConfig.BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phoneNumber: phone, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Đăng ký thất bại");

    sessionStorage.setItem("temp_register_email", email);

    // SỬA Ở ĐÂY: Thay vì chuyển hướng trang, ta chuyển đổi hiển thị các section
    document.getElementById("register-section").classList.add("hidden");
    document.getElementById("otp-section").classList.remove("hidden");

    // Tự động focus vào ô OTP đầu tiên
    const firstOtpInput = document.querySelector("#otp-container input");
    if (firstOtpInput) firstOtpInput.focus();
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btnRegister, false, "Đăng ký");
  }
}

function toggleRegisterButton() {
  // Lấy các phần tử từ HTML thông qua ID
  const checkbox = document.getElementById("terms");
  const btn = document.getElementById("btn-register");

  // Nếu không tìm thấy phần tử, dừng hàm để tránh lỗi
  if (!checkbox || !btn) return;

  // 1. Chuỗi class khi nút ĐƯỢC BẬT (Chuẩn Peak Design)
  const enabledClasses =
    "w-full flex justify-center py-md px-lg border border-transparent rounded bg-carbon-ink font-label-caps text-label-caps text-paper-white hover:bg-true-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-carbon-ink transition-colors duration-200 uppercase cursor-pointer";

  // 2. Chuỗi class khi nút BỊ TẮT (Chuẩn Peak Design: Nền xám Mist, chữ xám Graphite)
  const disabledClasses =
    "w-full flex justify-center py-md px-lg border border-transparent rounded bg-mist font-label-caps text-label-caps text-graphite cursor-not-allowed transition-colors duration-200 uppercase";

  // 3. Kiểm tra điều kiện và áp dụng class
  if (checkbox.checked) {
    btn.disabled = false; // Bật chức năng click
    btn.className = enabledClasses; // Áp dụng giao diện nút đen Carbon Ink
  } else {
    btn.disabled = true; // Khóa chức năng click
    btn.className = disabledClasses; // Áp dụng giao diện nút xám Mist
  }
}

// --- XÁC THỰC OTP ĐĂNG KÝ ---
async function handleVerifyOTP() {
  const code = document.getElementById("verify-code").value.trim();
  const btnVerify = document.getElementById("btn-verify");

  // Đọc lại email đã lưu từ bước đăng ký
  const savedEmail = sessionStorage.getItem("temp_register_email");

  if (!savedEmail) {
    alert("Không tìm thấy thông tin phiên đăng ký. Vui lòng đăng ký lại!");
    window.location.href = "sign_up.html";
    return;
  }

  if (!code || code.length !== 6) return alert("Vui lòng nhập đúng 6 số OTP!");

  UIUtils.setLoading(btnVerify, true, "Đang kiểm tra...");
  try {
    const res = await fetch(
      `${AppConfig.BASE_URL}/auth/verify-register?email=${encodeURIComponent(savedEmail)}&code=${encodeURIComponent(code)}`,
      {
        method: "POST",
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Xác thực thất bại");

    alert("Xác thực thành công! Hệ thống đang đăng nhập...");

    // Dọn dẹp bộ nhớ tạm sau khi dùng xong
    sessionStorage.removeItem("temp_register_email");

    await handleAuthSuccess(data.token, false);
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btnVerify, false, "Xác nhận mã");
  }
}

// --- GỬI YÊU CẦU QUÊN MẬT KHẨU ---
async function handleForgotPassword() {
  const email = document.getElementById("forgot-email").value.trim();
  const btnForgot = document.getElementById("btn-forgot");

  if (!email) return alert("Vui lòng nhập email!");

  UIUtils.setLoading(btnForgot, true, "Đang gửi...");
  try {
    const res = await fetch(
      `${AppConfig.BASE_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
      },
    );
    const msg = await res.text();
    if (!res.ok) throw new Error(msg || "Lỗi gửi yêu cầu");

    currentEmail = email;
    alert("Mã khôi phục đã được gửi vào email của bạn!");

    // Chuyển sang form nhập OTP và mật khẩu mới
    document.getElementById("forgot-password-section").classList.add("hidden");
    document
      .getElementById("reset-password-section")
      .classList.remove("hidden");
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btnForgot, false, "Gửi mã khôi phục");
  }
}

// --- ĐẶT LẠI MẬT KHẨU MỚI ---
async function handleResetPassword() {
  const code = document.getElementById("reset-code").value.trim();
  const newPassword = document
    .getElementById("reset-new-password")
    .value.trim();
  const btnReset = document.getElementById("btn-reset");

  if (!code || !newPassword)
    return alert("Vui lòng nhập đầy đủ mã OTP và mật khẩu mới!");

  UIUtils.setLoading(btnReset, true, "Đang xử lý...");
  try {
    const res = await fetch(`${AppConfig.BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentEmail,
        code: code,
        password: newPassword,
      }),
    });
    const msg = await res.text();
    if (!res.ok) throw new Error(msg || "Lỗi đặt lại mật khẩu");

    alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
    showMainAuth(); // Quay về màn hình đăng nhập
  } catch (err) {
    alert(err.message);
  } finally {
    UIUtils.setLoading(btnReset, false, "Đổi mật khẩu");
  }
}

function showRegisterForm() {
  document.getElementById("otp-section").classList.add("hidden");
  document.getElementById("register-section").classList.remove("hidden");
}

// Xử lý sự kiện cho các ô nhập OTP (tự động chuyển ô và gom dữ liệu)
document.addEventListener("DOMContentLoaded", function () {
  const otpInputs = document.querySelectorAll("#otp-container input");

  otpInputs.forEach((input, index) => {
    // Tự động chuyển focus khi nhập 1 số
    input.addEventListener("input", function () {
      // Lọc chỉ giữ lại số
      this.value = this.value.replace(/[^0-9]/g, "");

      if (this.value !== "" && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
      // Cập nhật giá trị vào input ẩn mỗi khi có thay đổi
      updateHiddenOTP();
    });

    // Xử lý khi bấm nút Backspace (xóa và lùi lại ô trước)
    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && this.value === "" && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });
});

// --- CÁC HÀM HIỂN THỊ GIAO DIỆN CHUYỂN FORM ---
function showMainAuth() {
  document.getElementById("verify-section").classList.add("hidden");
  document.getElementById("forgot-password-section").classList.add("hidden");
  document.getElementById("reset-password-section").classList.add("hidden");
  document.getElementById("auth-main-section").classList.remove("hidden");
}

function showForgotPasswordForm() {
  document.getElementById("auth-main-section").classList.add("hidden");
  document.getElementById("forgot-password-section").classList.remove("hidden");
}

// Hàm để thu thập và gộp giá trị của 6 ô OTP lại thành 1 chuỗi
function updateHiddenOTP() {
  const inputs = document.querySelectorAll("#otp-container input"); // Chọn tất cả 6 ô
  let otpValue = "";
  inputs.forEach((input) => {
    otpValue += input.value; // Nối từng giá trị lại với nhau
  });
  // Gán kết quả vào ô input ẩn mà hàm handleVerifyOTP mong muốn
  document.getElementById("verify-code").value = otpValue;
}

function goToResetPassword() {
  // 1. Gom 6 số OTP lại
  const inputs = document.querySelectorAll("#otp-container input");
  let otpValue = "";
  inputs.forEach((input) => {
    otpValue += input.value;
  });

  // Kiểm tra xem đã nhập đủ 6 số chưa
  if (otpValue.length !== 6) {
    alert("Vui lòng nhập đủ 6 số OTP!");
    return;
  }

  // 2. Lưu tạm OTP vào bộ nhớ trình duyệt
  sessionStorage.setItem("temp_reset_otp", otpValue);

  // 3. Chuyển hướng người dùng sang trang đặt lại mật khẩu mới
  window.location.href = "reset_password.html";
}
