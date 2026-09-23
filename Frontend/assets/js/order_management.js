let currentPage = 0;
const pageSize = 10;
let totalOrderPages = 0;
let currentSearch = "";
let currentStatus = "";
let currentStartDate = "";
let currentEndDate = "";
let baseUrl = AppConfig.ORDER_API_URL;

document.addEventListener("DOMContentLoaded", () => {
  loadOrders();
  loadOrderStatistics();

  // Lắng nghe ô tìm kiếm
  const searchInput = document.getElementById("search-order");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0;
        loadOrders();
      }
    });
  }

  // Lắng nghe Dropdown lọc trạng thái
  const statusFilter = document.getElementById("filter-status");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatus = e.target.value;
      currentPage = 0;
      loadOrders();
    });
  }

  // Lắng nghe thay đổi bộ lọc ngày
  const startDateInput = document.getElementById("filter-start-date");
  const endDateInput = document.getElementById("filter-end-date");

  if (startDateInput && endDateInput) {
    const handleDateChange = () => {
      currentStartDate = startDateInput.value;
      currentEndDate = endDateInput.value;

      // Kiểm tra nếu người dùng chọn "Từ ngày" lớn hơn "Đến ngày"
      if (
        currentStartDate &&
        currentEndDate &&
        currentStartDate > currentEndDate
      ) {
        alert("'Từ ngày' không được lớn hơn 'Đến ngày'!");
        return;
      }

      currentPage = 0; // Đưa về trang đầu tiên
      loadOrders(); // Tải lại danh sách
    };

    startDateInput.addEventListener("change", handleDateChange);
    endDateInput.addEventListener("change", handleDateChange);
  }
});

// GỌI API LẤY DANH SÁCH
async function loadOrders() {
  const tbody = document.getElementById("order-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải dữ liệu...</td></tr>`;

  try {
    const url = `${baseUrl}/orders/admin?keyword=${encodeURIComponent(currentSearch)}&status=${currentStatus}&startDate=${currentStartDate}&endDate=${currentEndDate}&page=${currentPage}&size=${pageSize}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi tải danh sách");
    const data = await response.json(); // Nhận về Page<Order>

    renderTable(data.content);
    renderPagination(data);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

async function loadOrderStatistics() {
  try {
    const url = `${AppConfig.ORDER_API_URL}/orders/admin/statistics`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      const stats = await response.json();

      document.getElementById("stat-total-orders").innerText = (
        stats.total || 0
      ).toLocaleString("vi-VN");
      document.getElementById("stat-pending-orders").innerText = (
        stats.pending || 0
      ).toLocaleString("vi-VN");
      document.getElementById("stat-shipping-orders").innerText = (
        stats.shipping || 0
      ).toLocaleString("vi-VN");
      document.getElementById("stat-completed-orders").innerText = (
        stats.completed || 0
      ).toLocaleString("vi-VN");
    }
  } catch (error) {
    console.error("Lỗi tải thống kê đơn hàng:", error);
  }
}

// RENDER BẢNG (Đã đồng bộ giao diện HTML)
function renderTable(orders) {
  const tbody = document.getElementById("order-table-body");

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-secondary">Không tìm thấy đơn hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map((o) => {
      // Format Ngày tháng
      const dateObj = new Date(o.createdAt);
      const dateStr = dateObj.toLocaleDateString("vi-VN");
      const timeStr = dateObj.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Format Trạng thái theo thiết kế Sáng (Light Theme) từ file HTML
      let statusConfig = {
        class: "bg-surface-container-low text-graphite",
        dot: "bg-graphite",
        text: o.orderStatus,
      };
      switch (o.orderStatus) {
        case "PENDING":
          statusConfig = {
            class: "bg-amber-50 text-amber-800 ",
            dot: "bg-amber-500",
            text: "Chờ xử lý",
          };
          break;
        case "DEPOSIT_PAID":
          statusConfig = {
            class: "bg-teal-50 text-teal-800",
            dot: "bg-teal-500",
            text: "Đã cọc",
          };
          break;
        case "CONFIRMED":
          statusConfig = {
            class: "bg-blue-50 text-blue-800",
            dot: "bg-blue-500",
            text: "Đang xử lý",
          };
          break;
        case "SHIPPING":
          statusConfig = {
            class: "bg-indigo-50 text-indigo-800 ",
            dot: "bg-indigo-500",
            text: "Đang giao",
          };
          break;
        case "DELIVERED":
          statusConfig = {
            class: "bg-emerald-50 text-emerald-800",
            dot: "bg-emerald-500",
            text: "Hoàn thành",
          };
          break;
        case "CANCELLED":
          statusConfig = {
            class: "bg-error-container text-error",
            dot: "bg-error",
            text: "Đã hủy",
          };
          break;
      }

      const paymentMethodLabels = {
        BANK_TRANSFER: "Chuyển khoản ngân hàng",
        ZALOPAY: "Thanh toán bằng ZaloPay",
        COD: "COD (Thanh toán khi nhận hàng)",
      };

      // 2. Chuyển đổi mã API trả về sang chữ in hoa để khớp tuyệt đối với từ điển
      const methodKey = o.paymentMethod ? o.paymentMethod.toUpperCase() : "";

      // 3. Tra từ điển để lấy tên tiếng Việt. Nếu không có trong từ điển thì lấy giá trị gốc.
      const displayPaymentMethod =
        paymentMethodLabels[methodKey] || o.paymentMethod;

      // 4. Cấu hình màu sắc dấu chấm (dot) tương ứng
      const isZaloPay = methodKey.includes("ZALO");
      const isBank = methodKey.includes("BANK");
      const paymentDotColor = isZaloPay
        ? "bg-indigo-500"
        : isBank
          ? "bg-emerald-500"
          : "bg-gray-500";

      const returnBtnHtml = o.hasReturnRequest
        ? `<button onclick="openReturnApprovalModal('${o.orderCode}')" class="w-8 h-8 rounded flex items-center justify-center border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all duration-150 shadow-sm" title="Duyệt trả hàng / hoàn tiền">
                 <span class="material-symbols-outlined text-lg text-amber-700">assignment_return</span>
             </button>`
        : ``;

      return `
        <tr class="hover:bg-surface-container-low transition-colors group">
            <td class="py-3.5 px-4 font-semibold text-[16px] text-carbon-ink whitespace-nowrap">
                <span onclick="openOrderModal('${o.orderCode}', 'view')" class="cursor-pointer hover:underline">#${o.orderCode}</span>
            </td>
            <td class="py-3.5 px-4 text-secondary whitespace-nowrap">
                ${dateStr}<br>${timeStr}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="font-medium text-carbon-ink">${o.receiverName}</div>
                <div class="text-secondary">${o.receiverPhone}</div>
            </td>
            <td class="py-3.5 px-4 font-bold text-ember-red whitespace-nowrap">
                ${UIUtils.formatCurrency(o.totalAmount)}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5 text-[14px] text-carbon-ink">
                    <span class="w-2 h-2 rounded-full ${paymentDotColor}"></span>
                    <span>${displayPaymentMethod}</span>
                </div>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] ${statusConfig.class}">
                    <span class="w-1.5 h-1.5 rounded-full ${statusConfig.dot}"></span>
                    ${statusConfig.text}
                </span>
            </td>
            <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center justify-center gap-1.5">
                    <!-- Nút sửa đơn (luôn hiện) -->
                    <button onclick="openOrderModal('${o.orderCode}', 'edit')" class="w-8 h-8 rounded flex items-center justify-center border border-mist hover:border-carbon-ink hover:bg-carbon-ink hover:text-paper-white bg-paper-white text-carbon-ink transition-all duration-150 shadow-sm" title="Chỉnh sửa đơn hàng">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <!-- Nút yêu cầu trả hàng (chỉ hiện khi có yêu cầu) -->
                    ${returnBtnHtml}
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

// PHÂN TRANG (ĐÃ XỬ LÝ LỖI UNDEFINED OFFSET VÀ TƯƠNG THÍCH MỌI ĐỊNH DẠNG DATA)
function renderPagination(pageData) {
  const info = document.getElementById("pagination-info");
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");

  if (!pageData) return;

  // 1. Trích xuất dữ liệu phân trang linh hoạt (hỗ trợ cả chuẩn cũ và Spring Data Web VIA_DTO)
  const totalElements = pageData.page?.totalElements ?? pageData.totalElements ?? 0;
  const size = pageData.page?.size ?? pageData.size ?? pageSize;
  const pageNum = pageData.page?.number ?? pageData.number ?? currentPage;
  
  // Tính tổng số trang
  totalOrderPages = pageData.page?.totalPages ?? pageData.totalPages ?? (totalElements > 0 ? Math.ceil(totalElements / size) : 0);

  // 2. Tính chỉ số offset an toàn
  const offset = pageData.pageable?.offset ?? (pageNum * size);
  const start = totalElements === 0 ? 0 : offset + 1;
  const currentItemCount = pageData.content ? pageData.content.length : size;
  const end = Math.min(offset + currentItemCount, totalElements);

  // 3. Cập nhật thông tin lên giao diện
  if (info) {
    if (totalElements === 0) {
      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Không có dữ liệu</span>`;
    } else {
      info.innerHTML = `<span class="text-secondary text-xs font-body-sm">Hiển thị <span class="font-medium text-carbon-ink">${start} - ${end}</span> trong tổng số <span class="font-medium text-carbon-ink">${totalElements}</span> đơn hàng (Trang ${pageNum + 1}/${totalOrderPages || 1})</span>`;
    }
  }

  // 4. Khóa/Mở nút chuyển trang chính xác
  const isFirst = pageData.first ?? (pageNum === 0);
  const isLast = pageData.last ?? (totalOrderPages === 0 || pageNum >= totalOrderPages - 1);

  if (prevBtn) prevBtn.disabled = isFirst;
  if (nextBtn) nextBtn.disabled = isLast;
}

async function openOrderModal(orderCode, mode = "view") {
  const modal = document.getElementById("edit-order-modal");

  // KIỂM TRA AN TOÀN: Nếu không tìm thấy thẻ HTML, dừng hàm lại ngay lập tức
  if (!modal) {
    console.error("Lỗi: Không tìm thấy thẻ HTML có id='edit-order-modal'");
    alert(
      "Lỗi giao diện: Không tìm thấy popup chỉnh sửa. Vui lòng tải lại trang (F5).",
    );
    return;
  }

  modal.classList.remove("hidden");

  const isEdit = mode === "edit";

  // Đổi Tiêu đề Modal
  document.getElementById("modal-order-title").innerText = isEdit
    ? `Cập nhật đơn hàng #${orderCode}`
    : `Chi tiết đơn hàng #${orderCode}`;
  document.getElementById("modal-order-code").value = orderCode;

  const paymentSelectEl = document.getElementById("modal-payment-status");
  paymentSelectEl.disabled = true; // Khóa chức năng chọn vĩnh viễn
  paymentSelectEl.classList.add("cursor-not-allowed", "opacity-70");
  document.getElementById("modal-order-status").disabled = !isEdit;

  const saveBtn = document.getElementById("btn-save-status");
  if (saveBtn) {
    saveBtn.style.display = isEdit ? "flex" : "none";
  }

  const tbody = document.getElementById("modal-order-items");
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span></td></tr>`;

  try {
    const headers = { Authorization: `Bearer ${AuthUtils.getToken()}` };
    const [orderRes, returnsRes] = await Promise.all([
      fetch(`${AppConfig.ORDER_API_URL}/orders/admin/${orderCode}`, {
        headers,
      }),
      fetch(`${AppConfig.ORDER_API_URL}/orders/admin/${orderCode}/returns`, {
        headers,
      }),
    ]);

    if (!orderRes.ok) throw new Error("Không thể tải chi tiết đơn hàng");
    const order = await orderRes.json();
    const returnRequests = returnsRes.ok ? await returnsRes.json() : [];
    window.currentOrderReturns = returnRequests;

    // LƯU Ý SỬ DỤNG .innerText vì thẻ HTML là <p>
    document.getElementById("modal-customer-name").innerText =
      order.receiverName || "Khách vãng lai";
    document.getElementById("modal-customer-phone").innerText =
      order.receiverPhone || "Không có";
    document.getElementById("modal-customer-address").innerText =
      order.shippingAddress || "Không có";

    const paymentMethodLabels = {
      BANK_TRANSFER: "Chuyển khoản ngân hàng",
      ZALOPAY: "Thanh toán ZaloPay",
      COD: "Thanh toán khi nhận hàng (COD)",
    };
    const methodKey = order.paymentMethod
      ? order.paymentMethod.toUpperCase()
      : "";
    document.getElementById("modal-payment-method").innerText =
      paymentMethodLabels[methodKey] || order.paymentMethod;

    document.getElementById("modal-payment-status").value = order.paymentStatus;
    document.getElementById("modal-order-status").value = order.orderStatus;

    if (isEdit) {
      // Logic khóa bước nhảy (đã có ở bản cũ, giữ nguyên)
      const orderStatusSelect = document.getElementById("modal-order-status");
      const orderStatuses = [
        "PENDING",
        "DEPOSIT_PAID",
        "CONFIRMED",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ];
      const currentOrderIdx = orderStatuses.indexOf(order.orderStatus);
      const hasDeposit = order.depositAmount > 0;

      Array.from(orderStatusSelect.options).forEach((opt) => {
        if (
          order.orderStatus === "DELIVERED" ||
          order.orderStatus === "CANCELLED"
        ) {
          opt.disabled = opt.value !== order.orderStatus;
        } else {
          if (opt.value === "CANCELLED") {
            opt.disabled = false;
          } else if (opt.value === order.orderStatus) {
            opt.disabled = false;
          } else {
            if (order.orderStatus === "PENDING") {
              opt.disabled = hasDeposit
                ? opt.value !== "DEPOSIT_PAID"
                : opt.value !== "CONFIRMED";
            } else {
              opt.disabled =
                orderStatuses.indexOf(opt.value) !== currentOrderIdx + 1;
            }
          }
        }
      });
      // const paymentStatusSelect = document.getElementById(
      //   "modal-payment-status",
      // );
      // Array.from(paymentStatusSelect.options).forEach((opt) => {
      //   if (order.paymentStatus === "PAID") {
      //     opt.disabled = opt.value !== "PAID";
      //   } else if (order.paymentStatus === "FAILED") {
      //     opt.disabled = opt.value === "PENDING";
      //   } else {
      //     opt.disabled = false;
      //   }
      // });
    }

    // Đổ danh sách sản phẩm (Khớp HTML Mới)
    tbody.innerHTML = order.items
      .map((item) => {
        const returnReq = returnRequests.find(
          (r) => r.productId === item.productId,
        );
        let returnButtonHtml = "";  

        return `
        <tr>
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded bg-fog border border-mist flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <img src="${item.productThumbnail || "https://placehold.co/150"}" alt="${item.productName}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <div class="font-medium text-carbon-ink line-clamp-2">${item.productName}</div>
                        ${item.variant ? `<div class="text-xs text-graphite pt-1.5">Phân loại: ${item.variant}</div>` : ""}
                        ${returnButtonHtml}
                    </div>
                </div>
            </td>
            <td class="py-3 px-4 text-center font-body-lg font-medium justify-center">
                <span class="font-technical-mono font-medium text-carbon-ink text-sm">${item.quantity}</span>
            </td>
            <td class="py-3 px-4 text-center font-body-lg text-carbon-ink">${UIUtils.formatCurrency(item.unitPrice)}</td>
            <td class="py-3 px-4 text-center font-body-lg text-ember-red font-bold text-carbon-ink">${UIUtils.formatCurrency(item.totalPrice)}</td>
        </tr>
      `;
      })
      .join("");

    document.getElementById("modal-subtotal").innerText =
      UIUtils.formatCurrency(order.subTotal);
    document.getElementById("modal-shipping-fee").innerText =
      UIUtils.formatCurrency(order.shippingFee);
    document.getElementById("modal-discount").innerText =
      "-" + UIUtils.formatCurrency(order.discountAmount);
    document.getElementById("modal-total").innerText = UIUtils.formatCurrency(
      order.totalAmount,
    );

    // MÃ MỚI: ĐÃ ĐƯỢC TỐI GIẢN VÌ BACKEND ĐÃ LO VIỆC TÍNH TOÁN
    const paidAmountEl = document.getElementById("modal-paid-amount");
    if (paidAmountEl) {
      // Lấy thẳng biến paidAmount từ Backend gửi về (nếu không có thì mặc định là 0)
      paidAmountEl.innerText = UIUtils.formatCurrency(order.paidAmount || 0);
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-4">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
  }
}

function closeOrderModal() {
  const modal = document.getElementById("edit-order-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}
async function saveOrderStatus() {
  const orderCode = document.getElementById("modal-order-code").value;
  const newStatus = document.getElementById("modal-order-status").value;
  const btn = document.getElementById("btn-save-status");

  if (!confirm("Xác nhận cập nhật trạng thái đơn hàng này?")) return;

  UIUtils.setLoading(btn, true, "Đang xử lý...");
  try {
    const url = `${AppConfig.ORDER_API_URL}/orders/${orderCode}/status?status=${newStatus}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      alert("Đã cập nhật trạng thái đơn hàng thành công!");
      closeOrderModal();
      loadOrders();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (err) {
    alert("Lỗi kết nối máy chủ");
  } finally {
    UIUtils.setLoading(btn, false, "Lưu cập nhật");
  }
}

function changePage(dir) {
  const targetPage = currentPage + dir;

  // Không cho lùi nếu đang ở trang đầu tiên
  if (targetPage < 0) return;

  // Không cho tiến nếu đã ở trang cuối cùng
  if (totalOrderPages > 0 && targetPage >= totalOrderPages) return;

  currentPage = targetPage;
  loadOrders();
}

// HÀM XÓA BỘ LỌC
function clearFilters() {
  // Làm trống các ô nhập liệu trên giao diện
  const searchInput = document.getElementById("search-order");
  const statusSelect = document.getElementById("filter-status");
  const startDateInput = document.getElementById("filter-start-date");
  const endDateInput = document.getElementById("filter-end-date");

  if (searchInput) searchInput.value = "";
  if (statusSelect) statusSelect.value = "";
  if (startDateInput) startDateInput.value = "";
  if (endDateInput) endDateInput.value = "";

  // Làm mới các biến toàn cục
  currentSearch = "";
  currentStatus = "";
  currentStartDate = "";
  currentEndDate = "";
  currentPage = 0;

  loadOrders();
}

// =====================================
// XỬ LÝ DUYỆT TRẢ HÀNG (GIAO DIỆN LUXURY)
// =====================================

let currentReturnRequests = [];
let currentOrderForReturn = null;

// 1. HÀM MỞ POPUP VÀ TẢI DỮ LIỆU
async function openReturnApprovalModal(orderCode) {
  const modal = document.getElementById("refund-approval-modal");
  modal.classList.remove("hidden");

  // Cập nhật mã đơn trên Header
  const orderCodeEl = document.getElementById("return-modal-order-code");
  if (orderCodeEl) orderCodeEl.innerText = `#${orderCode}`;

  const bodyContainer = document.getElementById("return-modal-body");
  if (bodyContainer) {
    bodyContainer.innerHTML = `<div class="text-center py-12"><span class="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span><p class="mt-3 text-secondary font-body-sm">Đang tải dữ liệu trả hàng...</p></div>`;
  }

  try {
    const headers = { Authorization: `Bearer ${AuthUtils.getToken()}` };
    // Gọi 2 API song song để lấy Chi tiết đơn (lấy tên, giá gốc) và Danh sách trả hàng
    const [orderRes, returnsRes] = await Promise.all([
      fetch(`${AppConfig.ORDER_API_URL}/orders/admin/${orderCode}`, {
        headers,
      }),
      fetch(`${AppConfig.ORDER_API_URL}/orders/admin/${orderCode}/returns`, {
        headers,
      }),
    ]);

    if (!orderRes.ok || !returnsRes.ok)
      throw new Error("Không thể tải dữ liệu.");

    currentOrderForReturn = await orderRes.json();
    currentReturnRequests = await returnsRes.json();

    if (currentReturnRequests.length === 0) {
      if (bodyContainer)
        bodyContainer.innerHTML = `<div class="text-center py-12 text-secondary font-body-sm bg-surface-container-low rounded-lg border border-mist mt-4">Đơn hàng này không có yêu cầu trả hàng nào.</div>`;
      return;
    }
    const dateEl = document.getElementById("return-modal-date");
    if (dateEl && currentReturnRequests[0].createdAt) {
      // Lấy thời gian từ yêu cầu trả hàng đầu tiên
      const reqDate = new Date(currentReturnRequests[0].createdAt);

      // Định dạng ngày: dd/mm/yyyy
      const day = String(reqDate.getDate()).padStart(2, "0");
      const month = String(reqDate.getMonth() + 1).padStart(2, "0");
      const year = reqDate.getFullYear();

      // Định dạng giờ: hh:mm
      const hours = String(reqDate.getHours()).padStart(2, "0");
      const minutes = String(reqDate.getMinutes()).padStart(2, "0");

      dateEl.innerText = `Gửi lúc: ${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Bắt đầu vẽ giao diện động
    renderReturnModalContent(bodyContainer);
  } catch (error) {
    console.error(error);
    if (bodyContainer)
      bodyContainer.innerHTML = `<div class="text-center py-8 text-ember-red bg-error-container/30 rounded-lg border border-error/20 mt-4">Lỗi tải dữ liệu: ${error.message}</div>`;
  }
}

// 2. HÀM VẼ GIAO DIỆN (GIỮ NGUYÊN 100% THIẾT KẾ HTML)
function renderReturnModalContent(container) {
  if (!container) return;

  let totalRefund = 0;
  let pendingCount = 0;

  // Sinh HTML cho từng thẻ (card) sản phẩm
  const itemsHtml = currentReturnRequests
    .map((req, index) => {
      const item =
        currentOrderForReturn.items.find(
          (i) => i.productId === req.productId,
        ) || {};

      // Cộng dồn tiền dự kiến hoàn trả (Bỏ qua các món bị từ chối)
      if (req.status !== "REJECTED") {
        totalRefund += (item.unitPrice || 0) * (item.quantity || 1);
      }
      if (req.status === "PENDING") pendingCount++;

      // Xử lý list ảnh (hỗ trợ nhiều ảnh tải từ mảng backend)
      let imagesHtml = "";
      if (req.evidenceImages || req.evidenceImage) {
        const imgString = req.evidenceImages || req.evidenceImage;
        const imgArray = imgString.split(",").filter((i) => i.trim() !== "");
        if (imgArray.length > 0) {
          imagesHtml = `
                    <div class="pt-2.5 space-y-2 border-t border-mist/60 mt-2.5">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-graphite">photo_library</span>
                                <span class="font-body-lg text-[11px] uppercase tracking-wider font-bold text-carbon-ink">Ảnh minh chứng từ khách hàng</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2.5">
    ${imgArray
      .map(
        (imgUrl) => `
        <!-- Đã thay đổi: aspect-video -> aspect-square -->
        <div class="group relative rounded border border-mist overflow-hidden bg-surface-container-low cursor-pointer aspect-square flex flex-col" onclick="openFullscreenImage('${imgUrl.trim()}')">
            <div class="relative flex-1 overflow-hidden">
                <img src="${imgUrl.trim()}" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105">
                <div class="absolute inset-0 bg-carbon-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="material-symbols-outlined text-paper-white text-base">zoom_in</span>
                </div>
            </div>
        </div>
    `,
      )
      .join("")}
</div>
                    </div>
                `;
        }
      }

      // Cấu hình giao diện và Nút bấm theo Trạng thái duyệt
      let statusBorder = "border-carbon-ink";
      let statusBg = "bg-paper-white";
      let imageOpacity = "";
      let actionButtons = "";

      if (req.status === "APPROVED") {
        statusBorder = "border-emerald-400";
        statusBg = "bg-emerald-50/30";

        // Cập nhật: Thêm inline-flex, items-center và gap-1 để căn giữa icon và chữ
        actionButtons = `<span class="inline-flex items-center gap-1 text-emerald-700 font-bold px-2 py-1"><span class="material-symbols-outlined text-base">check_circle</span> Đã phê duyệt hoàn tiền</span>`;
      } else if (req.status === "REJECTED") {
        statusBorder = "border-amber-300/80";
        imageOpacity = "opacity-80";

        // Cập nhật: Thêm inline-flex, items-center và gap-1 để căn giữa icon và chữ
        actionButtons = `<span class="inline-flex items-center gap-1 text-ember-red font-bold px-2 py-1"><span class="material-symbols-outlined text-base">cancel</span> Đã từ chối trả hàng</span>`;
      } else {
        // Trạng thái PENDING: Không viền, không nền, chữ carbon-ink mặc định, đổi màu và gạch chân khi di chuột
        actionButtons = `
                <div class="inline-flex gap-4">
                    <button type="button" 
                        onclick="processReturnRequest(${req.id}, 'APPROVED')" 
                        class="px-2 py-1.5 bg-transparent text-carbon-ink font-bold transition-all duration-300 hover:text-emerald-600 hover:underline cursor-pointer">
                        Phê duyệt
                    </button>
                    <button type="button" 
                        onclick="processReturnRequest(${req.id}, 'REJECTED')" 
                        class="px-2 py-1.5 bg-transparent text-carbon-ink font-bold transition-all duration-300 hover:text-ember-red hover:underline cursor-pointer">
                        Từ chối
                    </button>
                </div>
            `;
      }

      // Khối HTML cho 1 Sản phẩm
      return `
            <div class="border-2 ${statusBorder} rounded-lg p-4 ${statusBg} shadow-sm space-y-3 transition-colors">
                <!-- Header Card -->
                <div class="flex items-center justify-between pb-3 border-b border-mist/70 gap-2 flex-wrap">
                    <label class="inline-flex items-center gap-2.5 cursor-pointer">
                        <span class="font-body-lg text-xs uppercase tracking-wider font-bold text-carbon-ink">Sản phẩm #${String(index + 1).padStart(2, "0")}&nbsp;</span>
                    </label>
                </div>
                <!-- Nội dung chính -->
                <div class="flex flex-col sm:flex-row gap-4 items-start">
                    <img alt="${item.productName}" class="w-20 h-20 rounded object-cover border border-mist shrink-0 ${imageOpacity}" src="${item.productThumbnail || "https://placehold.co/150"}">
                    <div class="flex-1 min-w-0 space-y-1.5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h4 class="font-semibold font-body-lg text-carbon-ink text-sm">${item.productName}</h4>
                            <span class="font-body-lg text-sm text-ember-red font-bold text-carbon-ink">${UIUtils.formatCurrency(item.unitPrice || 0)}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-3 text-xs font-body-lg text-graphite">
                            ${item.variant ? `<span>Màu/Phân loại: ${item.variant}</span><span class="text-mist">•</span>` : ""}
                            <span>Số lượng: <strong class="text-carbon-ink font-bold">${item.quantity || 1}</strong> chiếc</span>
                        </div>
                        <p class="text-secondary text-xs leading-relaxed">
                            <strong class="font-body-lg text-carbon-ink font-medium">Lý do của khách:</strong> "${req.reason}"
                        </p>
                        ${imagesHtml}
                    </div>
                </div>
                <!-- Toolbar Hành động riêng -->
                <div class="pt-3 border-t border-mist/70 bg-surface-container-low -mx-4 -mb-4 p-4 rounded-b-lg space-y-2.5">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-body-lg text-xs text-graphite uppercase tracking-wider font-semibold">Hành động:</span>
                            <div class="inline-flex rounded p-0.5 text-xs font-body-lg">
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  // Đổ toàn bộ HTML vào Modal Body
  container.innerHTML = `
        <div class="space-y-3">
            
            <!-- Render Danh sách Sản phẩm -->
            ${itemsHtml}
        </div>
    `;
}

// 3. HÀM XỬ LÝ GỌI API DUYỆT / TỪ CHỐI
async function processReturnRequest(requestId, actionStatus) {
  const actionName =
    actionStatus === "APPROVED" ? "Phê duyệt hoàn tiền" : "Từ chối trả hàng";
  if (!confirm(`Xác nhận ${actionName.toLowerCase()} đối với sản phẩm này?`))
    return;

  try {
    const url = `${AppConfig.ORDER_API_URL}/orders/admin/returns/${requestId}/status?status=${actionStatus}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (response.ok) {
      // Cập nhật lại UI Modal lập tức
      if (currentOrderForReturn) {
        openReturnApprovalModal(currentOrderForReturn.orderCode);
      }
      // Làm mới lại bảng bên ngoài nền
      loadOrders();
    } else {
      const err = await response.text();
      alert("Lỗi: " + err);
    }
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối đến máy chủ!");
  }
}

// =====================================
// XỬ LÝ PHÓNG TO ẢNH MINH CHỨNG
// =====================================

function openFullscreenImage(imgSrc) {
  if (!imgSrc) return;

  // Gán đường link của ảnh thu nhỏ vào ảnh phóng to
  document.getElementById("fullscreen-image-source").src = imgSrc;

  // Hiển thị Modal toàn màn hình
  document.getElementById("fullscreen-image-modal").classList.remove("hidden");
}

function closeFullscreenImage() {
  // Ẩn Modal toàn màn hình
  document.getElementById("fullscreen-image-modal").classList.add("hidden");

  // Xóa đường link ảnh để giải phóng bộ nhớ
  setTimeout(() => {
    document.getElementById("fullscreen-image-source").src = "";
  }, 300); // Chờ một chút cho hiệu ứng ẩn hoàn tất
}

function closeReturnDetailModal() {
  const modal = document.getElementById("refund-approval-modal");

  // Kiểm tra xem có tìm thấy thẻ HTML không rồi mới thêm class ẩn
  if (modal) {
    modal.classList.add("hidden");
  } else {
    console.warn("Không tìm thấy modal duyệt trả hàng để đóng.");
  }
}
