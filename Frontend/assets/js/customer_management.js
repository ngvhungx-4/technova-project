let currentPage = 0;
const pageSize = 10;
let currentSearch = "";
let currentTier = "";
let currentStatus = "";

document.addEventListener("DOMContentLoaded", () => {
  loadCustomerStats();
  loadCustomers();

  // Lắng nghe sự kiện tìm kiếm bằng bàn phím
  const searchInput = document.getElementById("search-customer");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0;
        loadCustomers();
      }
    });
  }

  // THÊM MỚI: Lắng nghe sự kiện thay đổi bộ lọc Cấp bậc
  const tierFilter = document.getElementById("filter-tier");
  if (tierFilter) {
    tierFilter.addEventListener("change", (e) => {
      currentTier = e.target.value;
      currentPage = 0; // Reset về trang 1
      loadCustomers();
    });
  }

  // THÊM MỚI: Lắng nghe sự kiện thay đổi bộ lọc Trạng thái
  const statusFilter = document.getElementById("filter-status");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatus = e.target.value;
      currentPage = 0; // Reset về trang 1
      loadCustomers();
    });
  }
});

async function loadCustomers() {
  const tbody = document.getElementById("customer-table-body");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải dữ liệu...</td></tr>`;

  try {
    let isActiveParam = "";
    if (currentStatus === "active") isActiveParam = "&isActive=true";
    else if (currentStatus === "locked") isActiveParam = "&isActive=false";

    const tierParam = currentTier ? `&tier=${currentTier}` : "";
    const url = `${AppConfig.BASE_URL}/users/admin/customers?keyword=${encodeURIComponent(currentSearch)}${tierParam}${isActiveParam}&page=${currentPage}&size=${pageSize}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi tải danh sách");
    const data = await response.json();

    renderTable(data.content);
    renderPagination(data);
    
    // THÊM DÒNG NÀY: Gọi API lấy chi tiêu sau khi đã vẽ bảng
    fetchTotalSpending(data.content); 

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-4">Lỗi tải dữ liệu khách hàng!</td></tr>`;
  }
}

function renderTable(users) {
  const tbody = document.getElementById("customer-table-body");

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-secondary font-body-lg">Không tìm thấy khách hàng nào.</td></tr>`;
    return;
  }

  // Hàm định dạng số
  const formatNum = (num) =>
    (num || 0).toLocaleString("vi-VN", { style: "decimal" }).replace(/,/g, ".");

  tbody.innerHTML = users
    .map((u) => {
      const initials = UIUtils.getInitials(u.fullName || "KH");

      // 1. Logic Giao diện theo Hạng Thành Viên
      let tierBadge = "";
      let avatarClass = "";
      const tier = u.membershipTier ? u.membershipTier : "BASIC";

      if (tier === "ELITE") {
        avatarClass =
          "bg-obsidian text-paper-white border-graphite/40 font-body-lg text-xs";
        tierBadge = `<span class="inline-block mt-0.5 px-2 py-0.5 bg-obsidian text-amber-300 border border-graphite/50 font-label-caps text-[12px] uppercase tracking-wider rounded-full">ELITE</span>`;
      } else if (tier === "GOLD") {
        avatarClass =
          "bg-surface-container-high text-carbon-ink border-ash-border font-technical-mono text-xs";
        tierBadge = `<span class="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 font-label-caps text-[12px] uppercase tracking-wider rounded-full">GOLD</span>`;
      } else if (tier === "SILVER") {
        avatarClass =
          "bg-surface-container-high text-carbon-ink border-ash-border font-technical-mono text-xs";
        tierBadge = `<span class="inline-block mt-0.5 px-2 py-0.5 bg-fog text-secondary border border-ash-border font-label-caps text-[12px] uppercase tracking-wider rounded-full">SILVER</span>`;
      } else {
        avatarClass =
          "bg-mist text-secondary border-ash-border font-technical-mono text-xs";
        tierBadge = `<span class="inline-block mt-0.5 px-2 py-0.5 bg-fog text-secondary border border-mist font-label-caps text-[12px] uppercase tracking-wider rounded-full">BASIC</span>`;
      }

      const avatarHtml = u.avatar
        ? `<img src="${u.avatar}" class="w-full h-full object-cover rounded-full"/>`
        : initials;

      // 2. Logic Giao diện theo Trạng Thái (Active / Locked)
      const statusHtml = u.isActive
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-body-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Hoạt động
         </span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-body-sm bg-error-container text-on-error-container border border-error/30">
             <span class="w-1.5 h-1.5 rounded-full bg-ember-red"></span> Tạm khóa
         </span>`;

      // Nền đỏ nhạt nếu bị khóa
      const rowBgClass = !u.isActive ? "bg-error-container/10" : "";

      // 3. Render HTML
      return `
      <tr class="hover:bg-fog/80 transition-colors duration-150 ${rowBgClass}">
          <!-- Cột 1: Thông tin User -->
          <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold border ${avatarClass}">
                      ${avatarHtml}
                  </div>
                  <div>
                      <div class="font-medium text-carbon-ink leading-snug text-[14px]">${u.fullName || "Chưa cập nhật"}</div>
                      ${tierBadge}
                  </div>
              </div>
          </td>
          <!-- Cột 2 & 3: Liên hệ -->
          <td class="py-3.5 px-4 font-body-lg text-[14px] text-secondary text-center">${u.email}</td>
          <td class="py-3.5 px-4 font-body-lg text-[14px] text-secondary text-center">${u.phoneNumber || "---"}</td>
          <!-- Cột 4: Tổng chi tiêu (Tạm thời để 0đ nếu chưa gọi OrderService) -->
          <td class="py-3.5 px-4 text-center font-body-lg text-[14px] text-carbon-ink font-semibold" id="spending-${u.userId}">
            <span class="material-symbols-outlined animate-spin text-[14px] text-secondary">progress_activity</span>
          </td>
          <!-- Cột 5 & 6: Điểm số -->
          <td class="py-3.5 px-4 text-center font-body-lg text-[14px] text-secondary">${formatNum(u.currentPoints)}</td>
          <td class="py-3.5 px-4 text-center font-body-lg text-[14px] text-carbon-ink font-medium">${formatNum(u.cyclePoints)}</td>
          <!-- Cột 7: Trạng thái -->
          <td class="py-3.5 px-4 text-center">${statusHtml}</td>
          <!-- Cột 8: Hành động -->
          <td class="py-3.5 px-4 text-center">
              <div class="flex items-center justify-center mx-auto text-center gap-1.5">
                  <button onclick="openCustomerModal(${u.userId}, 'view')" class="w-8 h-8 flex items-center justify-center text-center text-graphite hover:text-carbon-ink hover:bg-mist/70 rounded-full transition-all duration-200 hover:scale-110 active:scale-95" title="Xem chi tiết">
                      <span class="material-symbols-outlined text-[18px] leading-none" data-icon="visibility">visibility</span>
                  </button>
                  <button onclick="openPointsModal(${u.userId}, '${u.fullName || "Chưa cập nhật"}', '${u.email}')" class="w-8 h-8 flex items-center justify-center text-center text-graphite hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-all duration-200 hover:scale-110 active:scale-95" title="Cộng điểm">
                      <span class="material-symbols-outlined text-[18px] leading-none" data-icon="add_circle">add_circle</span>
                  </button>
                  ${
                    u.isActive
                      ? `<button onclick="toggleCustomerStatus(${u.userId}, ${u.isActive})" class="w-8 h-8 flex items-center justify-center text-center text-graphite hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all duration-200 hover:scale-110 active:scale-95" title="Khóa tài khoản">
                           <span class="material-symbols-outlined text-[18px] leading-none" data-icon="lock">lock</span>
                       </button>`
                      : `<button onclick="toggleCustomerStatus(${u.userId}, ${u.isActive})" class="w-8 h-8 flex items-center justify-center text-center text-emerald-700 hover:bg-emerald-100 rounded-full transition-all duration-200 hover:scale-110 active:scale-95" title="Mở khóa tài khoản">
                           <span class="material-symbols-outlined text-[18px] leading-none" data-icon="lock_open">lock_open</span>
                       </button>`
                  }
              </div>
          </td>
      </tr>
    `;
    })
    .join("");
}

async function toggleCustomerStatus(userId, currentStatus) {
  const action = currentStatus ? "KHÓA" : "MỞ KHÓA";
  if (!confirm(`Bạn có chắc chắn muốn ${action} tài khoản này không?`)) return;

  try {
    const response = await fetch(
      `${AppConfig.BASE_URL}/users/admin/${userId}/toggle-status`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (response.ok) {
      alert(await response.text());
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    alert("Lỗi hệ thống!");
  }
}

// Hàm phân trang cơ bản
function renderPagination(pageData) {
  const info = document.getElementById("pagination-info");
  if (info) {
    const start = pageData.pageable.offset + 1;
    const end = Math.min(start + pageData.size - 1, pageData.totalElements);

    if (pageData.totalElements === 0) {
      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Không có dữ liệu</span>`;
    } else {
      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Hiển thị <span class="font-medium text-carbon-ink">${start} - ${end}</span> trong tổng số <span class="font-medium text-carbon-ink">${pageData.totalElements}</span> khách hàng</span>`;
    }
  }

  document.getElementById("btn-prev-page").disabled = pageData.first;
  document.getElementById("btn-next-page").disabled = pageData.last;
}

function changePage(dir) {
  currentPage += dir;
  loadCustomers();
}
async function loadCustomerStats() {
  try {
    // Gọi API thống kê hạng thành viên (Chúng ta sẽ viết API này ở bước 3)
    const url = `${AppConfig.BASE_URL}/users/admin/statistics/tiers`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      const stats = await response.json();

      // Hàm tiện ích để format số (VD: 12850 -> 12.850)
      const formatNum = (num) =>
        (num || 0)
          .toLocaleString("vi-VN", { style: "decimal" })
          .replace(/,/g, ".");

      // Cập nhật dữ liệu lên UI
      const elTotal = document.getElementById("stat-total");
      const elBasic = document.getElementById("stat-basic");
      const elGold = document.getElementById("stat-gold");
      const elElite = document.getElementById("stat-elite");

      if (elTotal) elTotal.innerText = formatNum(stats.total);
      if (elBasic) elBasic.innerText = formatNum(stats.basic);
      if (elGold) elGold.innerText = formatNum(stats.gold);
      if (elElite) elElite.innerText = formatNum(stats.elite);
    }
  } catch (error) {
    console.error("Lỗi tải thống kê:", error);
  }
}

// =======================
// XEM CHI TIẾT KHÁCH HÀNG
// =======================

let modalAvatarFile = null;
let currentCustomerAvatar = "";

async function openCustomerModal(id, mode) {
  const modal = document.getElementById("customer-modal");
  const title = document.getElementById("modal-title");
  const saveBtn = document.getElementById("btn-save-customer");
  const changeAvatarBtn = document.getElementById("btn-change-avatar");
  const passGroup = document.getElementById("modal-password-group");

  modalAvatarFile = null;
  document.getElementById("modal-avatar-input").value = "";

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  // Cập nhật Tiêu đề & Nút bấm
  if (isAdd) title.innerText = "Thêm khách hàng mới";
  else if (isEdit) title.innerText = "Sửa thông tin khách hàng";
  else title.innerText = "Chi tiết khách hàng";

  saveBtn.style.display = isEdit || isAdd ? "block" : "none";
  changeAvatarBtn.style.display = isEdit || isAdd ? "block" : "none";

  // Ẩn hiện ô mật khẩu
  if (passGroup) passGroup.classList.toggle("hidden", !isAdd);

  // Mở khóa các ô input
  const inputs = [
    "modal-fullname",
    "modal-email",
    "modal-phone",
    "modal-dob",
    "modal-password",
  ];
  inputs.forEach(
    (inputId) =>
      (document.getElementById(inputId).disabled = !(isEdit || isAdd)),
  );
  document
    .getElementsByName("modal-gender")
    .forEach((radio) => (radio.disabled = !(isEdit || isAdd)));

  // NẾU LÀ THÊM MỚI -> Xóa trắng form và mở Modal
  if (isAdd) {
    document.getElementById("modal-user-id").value = "";
    inputs.forEach((inputId) => (document.getElementById(inputId).value = ""));
    document
      .getElementsByName("modal-gender")
      .forEach((r) => (r.checked = false));

    currentCustomerAvatar = "";
    const preview = document.getElementById("modal-avatar-preview");
    preview.style.backgroundImage = "none";
    preview.innerHTML =
      '<span class="material-symbols-outlined text-4xl">person_add</span>';

    modal.classList.remove("hidden");
    return;
  }

  // NẾU LÀ XEM/SỬA -> Gọi API lấy dữ liệu như cũ
  try {
    const res = await fetch(
      `${AppConfig.BASE_URL}/users/admin/customers/${id}`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (!res.ok) throw new Error("Không thể lấy dữ liệu khách hàng");
    const data = await res.json();

    document.getElementById("modal-user-id").value = data.userId;
    document.getElementById("modal-fullname").value = data.fullName || "";
    document.getElementById("modal-email").value = data.email || "";
    document.getElementById("modal-phone").value = data.phoneNumber || "";
    document.getElementById("modal-dob").value = data.birthDate || "";
    document.getElementById("modal-password").value = ""; // Luôn ẩn mật khẩu khi xem/sửa

    if (data.gender !== null && data.gender !== undefined) {
      document.querySelector(
        `input[name="modal-gender"][value="${data.gender}"]`,
      ).checked = true;
    } else {
      document
        .getElementsByName("modal-gender")
        .forEach((r) => (r.checked = false));
    }

    currentCustomerAvatar = data.avatar;
    const preview = document.getElementById("modal-avatar-preview");
    if (data.avatar) {
      preview.style.backgroundImage = `url('${data.avatar}')`;
      preview.innerHTML = "";
    } else {
      preview.style.backgroundImage = "none";
      preview.innerHTML = UIUtils.getInitials(data.fullName);
    }

    modal.classList.remove("hidden");
  } catch (error) {
    alert("Lỗi: " + error.message);
  }
}

function closeCustomerModal() {
  document.getElementById("customer-modal").classList.add("hidden");
}

// Bắt sự kiện chọn ảnh trong Modal
document
  .getElementById("modal-avatar-input")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      modalAvatarFile = file;
      const reader = new FileReader();
      reader.onload = function (event) {
        const preview = document.getElementById("modal-avatar-preview");
        preview.style.backgroundImage = `url('${event.target.result}')`;
        preview.innerHTML = "";
      };
      reader.readAsDataURL(file);
    }
  });

async function saveCustomerDetails() {
  const id = document.getElementById("modal-user-id").value;
  const isAdd = !id; // Nếu không có ID tức là đang Thêm Mới
  const btn = document.getElementById("btn-save-customer");

  const fullName = document.getElementById("modal-fullname").value.trim();
  const email = document.getElementById("modal-email").value.trim();
  const phone = document.getElementById("modal-phone").value.trim();
  const password = document.getElementById("modal-password").value;
  const dob = document.getElementById("modal-dob").value;
  const genderEl = document.querySelector('input[name="modal-gender"]:checked');
  const gender = genderEl ? parseInt(genderEl.value) : null;

  if (!fullName || !email) {
    alert("Họ tên và Email không được để trống!");
    return;
  }

  if (isAdd && !password) {
    alert("Vui lòng nhập mật khẩu khởi tạo cho khách hàng mới!");
    return;
  }

  UIUtils.setLoading(btn, true, "Đang xử lý...");

  try {
    let avatarUrlToSave = currentCustomerAvatar;

    if (modalAvatarFile) {
      const formData = new FormData();
      formData.append("file", modalAvatarFile);
      const uploadRes = await fetch(
        `${AppConfig.BASE_URL}/users/admin/upload-avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
          body: formData,
        },
      );
      if (uploadRes.ok) {
        avatarUrlToSave = await uploadRes.text();
      } else {
        throw new Error("Lỗi upload ảnh đại diện!");
      }
    }

    const payload = {
      fullName: fullName,
      email: email,
      phoneNumber: phone,
      gender: gender,
      birthDate: dob || null,
      avatar: avatarUrlToSave,
    };

    if (isAdd) payload.password = password; // Đính kèm pass nếu là tạo mới

    const endpoint = isAdd
      ? `${AppConfig.BASE_URL}/users/admin/customers`
      : `${AppConfig.BASE_URL}/users/admin/customers/${id}`;

    const method = isAdd ? "POST" : "PUT";

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert(
        isAdd
          ? "Tạo khách hàng mới thành công!"
          : "Cập nhật thông tin thành công!",
      );
      closeCustomerModal();
      loadCustomerStats();
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Lỗi kết nối máy chủ!");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu thay đổi");
  }
}

// =======================
// THÊM KHÁCH HÀNG MỚI
// =======================

function openAddCustomerModal() {
  // Xóa rỗng các ô nhập liệu mỗi khi mở form
  document.getElementById("add-fullname").value = "";
  document.getElementById("add-email").value = "";
  document.getElementById("add-phone").value = "";
  document.getElementById("add-password").value = "";

  // Hiển thị modal
  document.getElementById("add-customer-modal").classList.remove("hidden");
}

function closeAddCustomerModal() {
  // Ẩn modal
  document.getElementById("add-customer-modal").classList.add("hidden");
}

async function submitAddCustomer(event) {
  // Ngăn chặn hành vi reload trang mặc định của form
  event.preventDefault();

  const btn = document.getElementById("btn-submit-add");
  const fullName = document.getElementById("add-fullname").value.trim();
  const email = document.getElementById("add-email").value.trim();
  const phone = document.getElementById("add-phone").value.trim();
  const password = document.getElementById("add-password").value;

  if (password.length < 6) {
    alert("Mật khẩu phải có ít nhất 6 ký tự!");
    return;
  }

  // Thay đổi giao diện nút bấm thành trạng thái đang tải
  const originalBtnHTML = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>ĐANG XỬ LÝ...</span>`;
  btn.disabled = true;

  try {
    const payload = {
      fullName: fullName,
      email: email,
      phoneNumber: phone,
      password: password,
      gender: null, // Tạo qua admin mặc định là null hoặc tùy chọn
      birthDate: null,
      avatar: null,
    };

    const response = await fetch(
      `${AppConfig.BASE_URL}/users/admin/customers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AuthUtils.getToken()}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      alert("Tạo khách hàng mới thành công!");
      closeAddCustomerModal();

      // Load lại dữ liệu thống kê và danh sách bảng
      loadCustomerStats();
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối máy chủ!");
  } finally {
    // Khôi phục lại trạng thái nút bấm
    btn.innerHTML = originalBtnHTML;
    btn.disabled = false;
  }
}

// =======================
// ĐIỀU CHỈNH ĐIỂM KHÁCH HÀNG
// =======================

function openPointsModal(userId, fullName, email) {
  // Gán ID để lưu lại dùng khi submit
  document.getElementById("point-user-id").value = userId;

  // Hiển thị tên và email để Admin kiểm tra chắc chắn đúng người
  document.getElementById("point-user-info").value = `${fullName} (${email})`;

  // Xóa rỗng các trường nhập liệu trước đó
  document.getElementById("point-amount").value = "";
  document.getElementById("point-reason").value = "";

  // Hiển thị modal
  document.getElementById("points-modal").classList.remove("hidden");
}

function closePointsModal() {
  document.getElementById("points-modal").classList.add("hidden");
}

async function submitPointsChange(event) {
  event.preventDefault();

  const btn = document.getElementById("btn-submit-points");
  const userId = document.getElementById("point-user-id").value;
  const points = parseInt(document.getElementById("point-amount").value, 10);
  const reason = document.getElementById("point-reason").value.trim();

  if (points === 0 || isNaN(points)) {
    alert("Số điểm điều chỉnh không được bằng 0!");
    return;
  }

  // Đổi trạng thái nút thành đang xử lý
  const originalBtnHTML = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>ĐANG XỬ LÝ...</span>`;
  btn.disabled = true;

  try {
    // Tận dụng API add-points đã viết ở Backend. Ta truyền Lý do (reason) vào tham số orderCode
    const url = `${AppConfig.BASE_URL}/users/internal/${userId}/add-points?points=${points}&orderCode=${encodeURIComponent(reason)}&applyBonus=false`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
    });

    if (response.ok) {
      alert("Điều chỉnh điểm số thành công!");
      closePointsModal();

      // Load lại danh sách khách hàng để cập nhật số điểm hiển thị trên bảng
      loadCustomers();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối máy chủ!");
  } finally {
    // Khôi phục nút
    btn.innerHTML = originalBtnHTML;
    btn.disabled = false;
  }
}
// HÀM MỚI: Lấy tổng chi tiêu cho danh sách user hiện tại trên bảng
async function fetchTotalSpending(users) {
  // Hàm định dạng tiền tệ
  const formatCurrency = (num) => (num || 0).toLocaleString("vi-VN") + "₫";

  // Lặp qua từng user để gọi API lấy chi tiêu
  for (const user of users) {
    try {
      const response = await fetch(`${AppConfig.BASE_URL}/orders/admin/users/${user.userId}/total-spending`, {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      });

      const element = document.getElementById(`spending-${user.userId}`);
      
      if (response.ok) {
        const total = await response.json();
        if (element) element.innerText = formatCurrency(total);
      } else {
        if (element) element.innerText = "0₫";
      }
    } catch (error) {
      console.error(`Lỗi tải chi tiêu của user ${user.userId}:`, error);
      const element = document.getElementById(`spending-${user.userId}`);
      if (element) element.innerText = "0₫";
    }
  }
}
