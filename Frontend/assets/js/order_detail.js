document.addEventListener("DOMContentLoaded", () => {
  loadOrderDetail();
});

let currentOrderData = null;

// Hàm format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Từ điển dịch phương thức thanh toán
const paymentMethodDict = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản liên ngân hàng VietQR",
  ZALOPAY: "Ví điện tử ZaloPay",
};

// Từ điển dịch trạng thái thanh toán
const paymentStatusDict = {
  PENDING: "CHƯA THANH TOÁN",
  PAID: "ĐÃ THANH TOÁN TOÀN BỘ",
  FAILED: "THANH TOÁN THẤT BẠI",
  REFUND_PENDING: "CHỜ HOÀN TIỀN",
  REFUNDED: "ĐÃ HOÀN TIỀN",
};

async function loadOrderDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderCode = urlParams.get("orderCode");

  if (!orderCode) {
    alert("Không tìm thấy mã đơn hàng!");
    window.location.href = "orders.html";
    return;
  }

  try {
    let headers = { "Content-Type": "application/json" };
    const token = AuthUtils.getToken();

    // Nếu có token (người dùng đã đăng nhập), ta đính kèm vào header
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${AppConfig.ORDER_API_URL}/orders/${orderCode}`,
      {
        method: "GET",
        headers: headers,
      },
    );

    if (!response.ok) throw new Error("Không thể tải thông tin đơn hàng");

    currentOrderData = await response.json();
    renderOrderDetail(currentOrderData);
  } catch (error) {
    console.error("Lỗi:", error);
    alert(
      "Đã xảy ra lỗi khi tải chi tiết đơn hàng. Bạn không có quyền truy cập hoặc đơn hàng không tồn tại.",
    );
    window.location.href = "orders.html";
  }
}

function renderOrderDetail(order) {
  // 1. Render Thông tin người nhận
  document.getElementById("recipient-name").textContent =
    order.receiverName || "Không xác định";
  document.getElementById("recipient-phone").textContent =
    `SĐT: ${order.receiverPhone || "Không xác định"}`;
  document.getElementById("shipping-address").textContent =
    order.shippingAddress || "Không xác định";

  // 2. Render Trạng thái & Phương thức
  const methodStr =
    paymentMethodDict[order.paymentMethod] || order.paymentMethod;
  document.getElementById("payment-method").textContent = methodStr;

  // Cập nhật text trạng thái thanh toán
  let pStatusStr =
    paymentStatusDict[order.paymentStatus] || order.paymentStatus;
  // Nếu đơn hàng đã cọc (DEPOSIT_PAID) thì hiển thị trạng thái riêng
  if (order.orderStatus === "DEPOSIT_PAID") {
    pStatusStr = "ĐÃ THANH TOÁN CỌC";
  }
  const statusEl = document.getElementById("payment-status");
  statusEl.textContent = pStatusStr;

  // Đổi màu badge nếu đã thanh toán
  if (order.paymentStatus === "PAID" || order.orderStatus === "DEPOSIT_PAID") {
    statusEl.classList.remove("bg-fog", "text-carbon-ink", "border-mist");
    statusEl.classList.add(
      "bg-[#16a34a]/10",
      "text-[#16a34a]",
      "border-[#16a34a]/30",
    ); // Màu xanh lá nhẹ
  } else if (
    order.paymentStatus === "FAILED" ||
    order.orderStatus === "CANCELLED"
  ) {
    statusEl.classList.remove("bg-fog", "text-carbon-ink", "border-mist");
    statusEl.classList.add(
      "bg-error-container",
      "text-ember-red",
      "border-ember-red/30",
    ); // Màu đỏ
  }

  // 3. Render Danh sách sản phẩm
  const itemsContainer = document.getElementById("order-items-container");
  document.getElementById("total-items-title").textContent =
    `DANH SÁCH KIỆN HÀNG (${order.items.length < 10 ? "0" : ""}${order.items.length} SẢN PHẨM)`;

  itemsContainer.innerHTML = order.items
    .map((item) => {
      // Kiểm tra xem sản phẩm có giá gốc lớn hơn giá bán không để gạch ngang
      const hasDiscount = item.costPrice && item.costPrice > item.unitPrice;

      return `
            <article class="py-md first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-lg items-start">
                <!-- Studio Product Thumbnail -->
                <div class="w-full sm:w-28 h-28 bg-surface-container-low border border-mist rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative p-2 cursor-pointer" onclick="window.location.href='product_detail.html?id=${item.productId}'">
                    <img class="w-full h-full object-contain" src="${item.productThumbnail || "https://placehold.co/400x300?text=No+Img"}">
                </div>
                <!-- Product Specs & Price -->
                <div class="flex-1 w-full">
                    <div class="flex flex-col justify-between h-full min-h-[7rem]">
                        <div>
                            <h3 class="font-body-lg text-carbon-ink font-semibold leading-snug hover:underline cursor-pointer" onclick="window.location.href='product_detail.html?id=${item.productId}'">
                                ${item.productName}
                            </h3>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-xs mt-2 pt-1">
                            <div class="text-graphite font-body-lg text-body-sm flex items-center gap-xs">
                                <span class="text-[14px]">Số lượng:</span> 
                                <span class="text-carbon-ink font-medium">${item.quantity}</span>
                            </div>
                            <div class="text-left sm:text-right flex flex-col sm:items-end">
                                <div class="font-body-lg font-bold text-ember-red">${formatCurrency(item.unitPrice)}</div>
                                ${hasDiscount ? `<div class="font-body-sm text-graphite line-through text-[14px]">${formatCurrency(item.costPrice)}</div>` : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    })
    .join("");

  // 4. Render Bảng Tài chính (Kế toán)
  const subTotal = order.subTotal || 0;
  const discount = order.discountAmount || 0;
  const shipping = order.shippingFee || 0;
  const total = order.totalAmount || 0;

  // Backend Java Entity trả về biến order.paidAmount từ @JsonProperty("paidAmount")
  const paid = order.paidAmount || 0;
  let remaining = total - paid;
  if (remaining < 0) remaining = 0;

  document.getElementById("calc-subtotal").textContent =
    formatCurrency(subTotal);
  document.getElementById("calc-discount").textContent =
    `-${formatCurrency(discount)}`;

  // Cập nhật phí vận chuyển (nếu bằng 0 thì hiện chữ Miễn phí)
  const shippingEl = document.getElementById("calc-shipping");
  if (shipping === 0) {
    shippingEl.innerHTML = `<span class="text-[14px] text-graphite font-normal">Miễn phí</span>`;
  } else {
    shippingEl.textContent = formatCurrency(shipping);
  }

  document.getElementById("calc-total").textContent = formatCurrency(total);
  document.getElementById("calc-paid").textContent = formatCurrency(paid);
  document.getElementById("calc-remaining").textContent =
    formatCurrency(remaining);
}

// 5. Tính năng Mua Lại (Buy Again) - Tái sử dụng logic từ order.js
async function buyAgain(btnElement) {
  if (
    !currentOrderData ||
    !currentOrderData.items ||
    currentOrderData.items.length === 0
  ) {
    alert("Không có dữ liệu sản phẩm để mua lại!");
    return;
  }

  // Nếu chưa đăng nhập thì đẩy ra trang đăng nhập
  if (!AuthUtils.isLoggedIn()) {
    alert("Bạn cần đăng nhập để thêm vào giỏ hàng.");
    window.location.href = "login.html";
    return;
  }

  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> ĐANG XỬ LÝ...`;
  btnElement.disabled = true;

  try {
    const token = AuthUtils.getToken();
    let successCount = 0;

    // Lặp qua từng sản phẩm để gọi API thêm vào giỏ hàng
    for (const item of currentOrderData.items) {
      const response = await fetch(`${AppConfig.CART_API_URL}/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity, // Lấy lại đúng số lượng như đơn cũ
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        console.warn(`Không thể thêm ${item.productName} vào giỏ.`);
      }
    }

    if (successCount === 0) {
      alert(
        "Rất tiếc, các sản phẩm này hiện không thể thêm vào giỏ hàng (Có thể đã hết hàng).",
      );
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
      return;
    }

    // Chuyển hướng tới Giỏ Hàng
    window.location.href = "cart.html";
  } catch (error) {
    console.error("Lỗi khi Mua lại:", error);
    alert("Lỗi kết nối đến máy chủ. Vui lòng thử lại!");
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}
