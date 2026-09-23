let currentKeyword = "";
let currentType = "";
let currentIsActive = "";
let currentVoucherPage = 0;
const voucherPageSize = 10;
let totalVoucherPages = 0;

document.addEventListener("DOMContentLoaded", () => {
  AuthUtils.requireAdmin();
  loadVouchers();

  // Bắt sự kiện Enter ở ô tìm kiếm
  const searchInput = document.getElementById("filter-keyword");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentKeyword = e.target.value.trim();
        loadVouchers();
      }
    });
  }

  // Bắt sự kiện đổi Loại giảm
  const typeSelect = document.getElementById("filter-type");
  if (typeSelect) {
    typeSelect.addEventListener("change", (e) => {
      currentType = e.target.value;
      loadVouchers();
    });
  }

  // Bắt sự kiện đổi Trạng thái
  const activeSelect = document.getElementById("filter-isActive");
  if (activeSelect) {
    activeSelect.addEventListener("change", (e) => {
      currentIsActive = e.target.value;
      loadVouchers();
    });
  }
});

function toggleMaxDiscountField() {
  const type = document.getElementById("modal-voucher-type").value;
  const maxDiscountInput = document.getElementById(
    "modal-voucher-max-discount",
  );
  if (type === "FIXED_AMOUNT") {
    maxDiscountInput.value = "";
    maxDiscountInput.disabled = true;
    maxDiscountInput.classList.add("bg-gray-100", "cursor-not-allowed");
  } else {
    maxDiscountInput.disabled = false;
    maxDiscountInput.classList.remove("bg-gray-100", "cursor-not-allowed");
  }
}

async function loadVouchers() {
  try {
    const res = await fetch(
      `${AppConfig.ORDER_API_URL}/vouchers/admin/all?keyword=${encodeURIComponent(currentKeyword)}&type=${currentType}&isActive=${currentIsActive}&page=${currentVoucherPage}&size=${voucherPageSize}`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      }
    );
    if (!res.ok) throw new Error("Lỗi tải dữ liệu");

    const pageData = await res.json();
    const tbody = document.getElementById("voucher-table-body");
    
    // Đảm bảo vouchers luôn là một mảng, không bị lỗi null/undefined
    const vouchers = pageData.content || [];

    if (vouchers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-graphite font-body-sm">Chưa có mã giảm giá nào.</td></tr>`;
      renderVoucherPagination(pageData);
      return;
    }

    // Tái tạo lại danh sách voucher trên giao diện
    tbody.innerHTML = vouchers
      .map((v) => {
        const formatValue =
          v.discountType === "PERCENTAGE"
            ? `${v.discountValue}%`
            : UIUtils.formatCurrency(v.discountValue);

        const minOrder = UIUtils.formatCurrency(v.minOrderAmount || 0);

        const statusBadge = v.active
          ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[12px] font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Đang hoạt động</span>`
          : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-graphite border border-ash-border text-[12px] font-medium"><span class="w-1.5 h-1.5 rounded-full bg-graphite"></span>Đã khóa</span>`;

        const endDateText = v.endDate
          ? new Date(v.endDate).toLocaleDateString("vi-VN")
          : "Không giới hạn";

        const usageText = `${v.usedCount || 0} / ${v.usageLimit ? v.usageLimit : "∞"}`;
        const typeText =
          v.discountType === "PERCENTAGE" ? "Phần trăm" : "Số tiền";

        return `
            <tr class="hover:bg-fog/60 transition-colors">
                <td class="py-md px-lg">
                    <span class="font-body-lg text-[14px] font-bold text-carbon-ink tracking-wider select-all">${v.voucherCode}</span>
                </td>
                <td class="py-md px-md text-center">
                    <span class="font-body-lg font-medium text-[14px] text-carbon-ink">${typeText}</span>
                </td>
                <td class="py-md px-md text-center">
                    <p class="font-body-lg font-medium text-carbon-ink text-[14px]">${formatValue}</p>
                </td>
                <td class="py-md px-md text-center">
                    <span class="font-body-lg font-medium text-[14px] text-carbon-ink">${minOrder}</span>
                </td>
                <td class="py-md px-md text-center">
                    <span class="font-body-lg font-medium text-carbon-ink text-[14px]">${usageText}</span>
                </td>
                <td class="py-md px-md text-center">
                    <p class="font-body-lg text-[14px] text-carbon-ink">${endDateText}</p>
                </td>
                <td class="py-md px-md text-center">
                    ${statusBadge}
                </td>
                <td class="py-md px-lg text-center">
                    <div class="flex items-center justify-center gap-1.5 mx-auto">
                        <button onclick='editVoucher(${JSON.stringify(v)})' class="w-8 h-8 flex items-center justify-center text-graphite hover:text-carbon-ink hover:bg-surface-dim rounded transition-colors" title="Sửa voucher">
                            <span class="material-symbols-outlined text-[18px] leading-none block">edit</span>
                        </button>
                        <button onclick="deleteVoucher(${v.id})" class="w-8 h-8 flex items-center justify-center text-graphite hover:text-ember-red hover:bg-error-container/40 rounded transition-colors" title="Xóa voucher">
                            <span class="material-symbols-outlined text-[18px] leading-none block">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
      })
      .join("");

    // Vẽ thanh điều khiển phân trang
    renderVoucherPagination(pageData);
  } catch (e) {
    console.error("Lỗi khi tải danh sách voucher:", e);
  }
}

function openVoucherModal() {
  document.getElementById("modal-voucher-title").innerText =
    "Thêm mã giảm giá mới";
  document.getElementById("voucher-form").reset();
  document.getElementById("modal-voucher-customer-group").value = "";
  document.getElementById("modal-voucher-email").value = "";
  document.getElementById("modal-voucher-points").value = "";
  document.getElementById("modal-voucher-id").value = "";

  document.getElementById("modal-voucher-active").value = "true";
  toggleMaxDiscountField();

  const now = getCurrentLocalISOString();
  const startInput = document.getElementById("modal-voucher-start");
  const endInput = document.getElementById("modal-voucher-end");

  // Không cho chọn ngày trong quá khứ
  startInput.min = now;
  endInput.min = now;

  const modal = document.getElementById("voucher-modal");
  modal.classList.remove("hidden");

  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

function closeVoucherModal() {
  const modal = document.getElementById("voucher-modal");
  modal.classList.add("opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

function editVoucher(v) {
  document.getElementById("modal-voucher-title").innerText =
    "Chỉnh sửa mã giảm giá";
  document.getElementById("modal-voucher-id").value = v.id;
  document.getElementById("modal-voucher-code").value = v.voucherCode;
  document.getElementById("modal-voucher-type").value = v.discountType;
  document.getElementById("modal-voucher-value").value = v.discountValue;
  document.getElementById("modal-voucher-min-order").value =
    v.minOrderAmount || "";
  document.getElementById("modal-voucher-max-discount").value =
    v.maxDiscountAmount || "";
  document.getElementById("modal-voucher-usage-limit").value =
    v.usageLimit || "";
  document.getElementById("modal-voucher-active").value = v.active.toString();
  document.getElementById("modal-voucher-customer-group").value =
    v.customerGroup || "";
  document.getElementById("modal-voucher-email").value = v.targetEmail || "";
  document.getElementById("modal-voucher-points").value =
    v.exchangePoints || "";

  if (v.startDate)
    document.getElementById("modal-voucher-start").value = v.startDate.slice(
      0,
      16,
    );
  if (v.endDate)
    document.getElementById("modal-voucher-end").value = v.endDate.slice(0, 16);

  toggleMaxDiscountField();

  document.getElementById("modal-voucher-start").removeAttribute("min");
  // Cập nhật lại giới hạn cho ngày kết thúc
  handleStartDateChange();

  const modal = document.getElementById("voucher-modal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

async function saveVoucher() {
  const code = document
    .getElementById("modal-voucher-code")
    .value.trim()
    .toUpperCase();
  const value = document.getElementById("modal-voucher-value").value;

  if (!code || !value) {
    alert("Vui lòng điền mã Voucher và giá trị giảm!");
    return;
  }

  const btn = document.getElementById("btn-save-voucher");
  const originalText = btn.innerHTML; // Lưu lại giao diện nút ban đầu
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Đang lưu...`;
  btn.disabled = true;

  // --- HÀM HỖ TRỢ: Chuẩn hóa ngày tháng cho Spring Boot ---
  // Thêm ":00" (số giây) vào chuỗi ngày tháng để Java không bị lỗi ép kiểu
  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    if (dateString.length === 16) {
      return dateString + ":00";
    }
    return dateString;
  };

  // --- ĐÓNG GÓI DỮ LIỆU ---
  const data = {
    voucherCode: code,
    discountType: document.getElementById("modal-voucher-type").value,
    discountValue: Number(value),
    minOrderAmount: document.getElementById("modal-voucher-min-order").value
      ? Number(document.getElementById("modal-voucher-min-order").value)
      : 0,
    maxDiscountAmount: document.getElementById("modal-voucher-max-discount")
      .value
      ? Number(document.getElementById("modal-voucher-max-discount").value)
      : null,
    usageLimit: document.getElementById("modal-voucher-usage-limit").value
      ? Number(document.getElementById("modal-voucher-usage-limit").value)
      : null,

    // 1. Cập nhật ngày tháng có kèm số giây
    startDate: formatDateTime(
      document.getElementById("modal-voucher-start").value,
    ),
    endDate: formatDateTime(document.getElementById("modal-voucher-end").value),

    // 2. SỬA LỖI TRẠNG THÁI: Gửi đúng key 'active' mà Spring Boot mong đợi
    active: document.getElementById("modal-voucher-active").value === "true",
    isActive: document.getElementById("modal-voucher-active").value === "true", // Gửi kèm dự phòng
    customerGroup:
      document.getElementById("modal-voucher-customer-group").value || null,
    targetEmail: document.getElementById("modal-voucher-email").value || null,
    exchangePoints: document.getElementById("modal-voucher-points").value
      ? Number(document.getElementById("modal-voucher-points").value)
      : null,
  };

  const id = document.getElementById("modal-voucher-id").value;
  const url = id ? `/update/${id}` : `/add`;
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(`${AppConfig.ORDER_API_URL}/vouchers/admin${url}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      alert(
        id
          ? "Cập nhật mã giảm giá thành công!"
          : "Thêm mới mã giảm giá thành công!",
      );
      closeVoucherModal();
      loadVouchers();
    } else {
      const err = await res.text();
      alert("Lỗi từ máy chủ: " + err);
    }
  } catch (e) {
    console.error("Lỗi khi gọi API: ", e);
    alert("Có lỗi xảy ra khi kết nối máy chủ");
  } finally {
    // Trả lại trạng thái nút bấm
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function deleteVoucher(id) {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa mã giảm giá này không? Hành động này không thể hoàn tác.",
    )
  )
    return;

  try {
    const res = await fetch(
      `${AppConfig.ORDER_API_URL}/vouchers/admin/delete/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (res.ok) {
      alert("Xóa thành công!");
      loadVouchers();
    } else {
      alert("Không thể xóa mã này!");
    }
  } catch (e) {
    console.error(e);
  }
}

// Lấy thời gian hiện tại
function getCurrentLocalISOString() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

// Xử lý khi người dùng thay đổi "Ngày bắt đầu"
function handleStartDateChange() {
  const startInput = document.getElementById("modal-voucher-start");
  const endInput = document.getElementById("modal-voucher-end");

  if (startInput.value) {
    // Ngày kết thúc không được nhỏ hơn Ngày bắt đầu
    endInput.min = startInput.value;

    // Nếu người dùng đã lỡ chọn Ngày kết thúc nhỏ hơn Ngày bắt đầu từ trước, thì reset lại
    if (endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
  } else {
    // Nếu xóa trắng Ngày bắt đầu, Ngày kết thúc chỉ bị giới hạn bởi thời điểm hiện tại
    endInput.min = getCurrentLocalISOString();
  }
}

// Hàm làm mới bộ lọc
window.clearVoucherFilters = function () {
  document.getElementById("filter-keyword").value = "";
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-isActive").value = "";

  currentKeyword = "";
  currentType = "";
  currentIsActive = "";

  loadVouchers();
};

function renderVoucherPagination(pageData) {
  const info = document.getElementById("voucher-pagination-info");
  const prevBtn = document.getElementById("btn-voucher-prev");
  const nextBtn = document.getElementById("btn-voucher-next");

  if (!pageData) return;

  // 1. Trích xuất thông tin linh hoạt (hỗ trợ cả chuẩn cũ lẫn VIA_DTO của Spring Boot)
  const totalElements = pageData.page?.totalElements ?? pageData.totalElements ?? 0;
  const pageSize = pageData.page?.size ?? pageData.size ?? voucherPageSize;
  const pageNumber = pageData.page?.number ?? pageData.number ?? currentVoucherPage;
  totalVoucherPages = pageData.page?.totalPages ?? pageData.totalPages ?? (totalElements > 0 ? Math.ceil(totalElements / pageSize) : 0);

  // 2. Tính toán phạm vi hiển thị hiện tại (Từ bản ghi start đến end)
  if (info) {
    if (totalElements === 0) {
      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Không có dữ liệu</span>`;
    } else {
      const start = pageNumber * pageSize + 1;
      const currentItemCount = pageData.content ? pageData.content.length : pageSize;
      const end = Math.min(start + currentItemCount - 1, totalElements);

      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Hiển thị <span class="font-medium text-carbon-ink">${start} - ${end}</span> trong tổng số <span class="font-medium text-carbon-ink font-body-sm">${totalElements}</span> mã giảm giá (Trang ${pageNumber + 1}/${totalVoucherPages || 1})</span>`;
    }
  }

  // 3. Khóa / Mở nút bấm chuyển trang an toàn
  const isFirst = pageData.first ?? (pageNumber === 0);
  const isLast = pageData.last ?? (totalVoucherPages === 0 || pageNumber >= totalVoucherPages - 1);

  if (prevBtn) prevBtn.disabled = isFirst;
  if (nextBtn) nextBtn.disabled = isLast;
}

function changeVoucherPage(direction) {
  const targetPage = currentVoucherPage + direction;

  // Kiểm tra chặn nếu người dùng bấm lùi khi đang ở trang 0
  if (targetPage < 0) return;

  // Kiểm tra chặn nếu người dùng bấm tới khi đã ở trang cuối cùng
  if (totalVoucherPages > 0 && targetPage >= totalVoucherPages) return;

  currentVoucherPage = targetPage;
  loadVouchers();
}
