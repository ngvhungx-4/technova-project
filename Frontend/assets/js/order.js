document.addEventListener("DOMContentLoaded", () => {
  loadMyOrders();
});

let allUserOrders = [];
let myReviewedItems = [];
let myReturnRequests = [];
let currentTabStatus = "ALL";

// Hàm format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Hàm format ngày giờ
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Cấu hình màu sắc theo trạng thái đơn hàng
const statusConfig = {
  PENDING: { text: "Chờ xác nhận", color: "text-yellow-600" },
  DEPOSIT_PAID: { text: "Đã thanh toán cọc", color: "text-yellow-500" },
  CONFIRMED: { text: "Đã xác nhận", color: "text-blue-600" },
  SHIPPING: { text: "Đang vận chuyển", color: "text-orange-600" },
  DELIVERED: { text: "Hoàn thành", color: "text-sale-red" },
  CANCELLED: { text: "Đã hủy", color: "text-gray-500" },
};

// TẢI TOÀN BỘ ĐƠN HÀNG
async function loadMyOrders() {
  if (!AuthUtils.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const container = document.getElementById("orders-container");
  container.innerHTML = `<div class="p-8 text-center text-gray-500 font-medium">Đang tải danh sách đơn hàng...</div>`;

  try {
    const token = AuthUtils.getToken();

    const fetchOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const [ordersResponse, reviewedResponse, returnsResponse] =
      await Promise.all([
        fetch(`${AppConfig.ORDER_API_URL}/orders/my-orders`, fetchOptions),
        fetch(`${AppConfig.PRODUCT_API_URL}/products/reviews/my-reviewed-items`, fetchOptions),
        fetch(`${AppConfig.ORDER_API_URL}/orders/returns/my-returns`, fetchOptions),
      ]);

    if (!ordersResponse.ok) throw new Error("Không thể tải đơn hàng");

    allUserOrders = (await ordersResponse.json()) || [];
    myReviewedItems = reviewedResponse.ok ? await reviewedResponse.json() : [];
    myReturnRequests = returnsResponse.ok ? await returnsResponse.json() : [];

    renderOrders();
  } catch (error) {
    console.error("Lỗi:", error);
    container.innerHTML = `<div class="p-8 text-center text-red-500">Có lỗi xảy ra khi tải danh sách đơn hàng.</div>`;
  }
}

// XỬ LÝ CHUYỂN ĐỔI TAB VÀ ĐỔI GIAO DIỆN NÚT
function changeOrderTab(status, btnElement) {
  currentTabStatus = status;
  const allTabs = btnElement.parentElement.querySelectorAll("button");

  allTabs.forEach((tab) => {
    tab.classList.remove("pb-1", "font-bold", "text-primary", "border-b-2", "border-primary");
    tab.classList.add("pb-4", "font-medium", "text-graphite", "hover:text-carbon-ink", "transition-colors");
  });

  btnElement.classList.remove("pb-4", "font-medium", "text-graphite", "hover:text-carbon-ink", "transition-colors");
  btnElement.classList.add("pb-1", "font-bold", "text-primary", "border-b-2", "border-primary");

  renderOrders();
}

// LỌC VÀ VẼ GIAO DIỆN ĐƠN HÀNG
function renderOrders() {
  const container = document.getElementById("orders-container");
  if (!container) return;

  const filteredOrders =
    currentTabStatus === "ALL"
      ? allUserOrders
      : allUserOrders.filter((order) => order.orderStatus === currentTabStatus);

  if (filteredOrders.length === 0) {
    container.innerHTML = `
        <div class="bg-surface-container rounded-xl border border-outline-variant/30 p-12 flex flex-col items-center justify-center text-center">
            <span class="material-symbols-outlined text-6xl text-outline-variant mb-4">receipt_long</span>
            <h3 class="text-xl font-bold text-on-surface mb-2">Chưa có đơn hàng nào</h3>
            <p class="text-on-surface-variant mb-6">Bạn chưa có đơn hàng nào trong trạng thái này.</p>
            <a href="products.html" class="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-fixed transition-colors">Mua sắm ngay</a>
        </div>
    `;
    return;
  }

  const statusUI = {
    PENDING: { text: "CHỜ XÁC NHẬN", color: "text-[#d97706]" },
    DEPOSIT_PAID: { text: "ĐÃ CỌC", color: "text-[#d97706]" },
    CONFIRMED: { text: "ĐÃ XÁC NHẬN", color: "text-[#2563eb]" },
    SHIPPING: { text: "ĐANG VẬN CHUYỂN", color: "text-[#2563eb]" },
    DELIVERED: { text: "HOÀN THÀNH", color: "text-[#16a34a]" },
    CANCELLED: { text: "ĐÃ HỦY", color: "text-ember-red" },
  };

  container.innerHTML = filteredOrders
    .map((order) => {
      const status = statusUI[order.orderStatus] || statusUI["PENDING"];
      const isCancelled = order.orderStatus === "CANCELLED";

      const itemsHtml = order.items
        .map((item) => {
          const currentItemKey = `${order.id}-${item.productId}`;
          const isReviewed = item.isReviewed || myReviewedItems.includes(currentItemKey);
          const returnReq = myReturnRequests.find(
            (r) =>
              r.orderCode === (order.orderCode || order.id).toString() &&
              r.productId === item.productId,
          );

          const deliveredDate = new Date(order.updatedAt || order.createdAt);
          const currentDate = new Date();
          const diffDays = (currentDate - deliveredDate) / (1000 * 60 * 60 * 24);

          let returnBtnHtml = "";

          if (order.orderStatus === "DELIVERED") {
            if (returnReq) {
              if (returnReq.status === "PENDING") {
                returnBtnHtml = `<button class="text-[12px] font-body-lg font-bold text-yellow-600 opacity-70 cursor-not-allowed transition-colors duration-300">Đang xử lý trả hàng</button>`;
              } else if (returnReq.status === "APPROVED") {
                returnBtnHtml = `<button class="text-[12px] font-body-lg font-bold text-green-500 opacity-70 cursor-not-allowed transition-colors duration-300">Chấp nhận trả hàng</button>`;
              } else if (returnReq.status === "REJECTED") {
                returnBtnHtml = `<button class="text-[12px] font-body-lg font-bold text-ember-red opacity-70 cursor-not-allowed transition-colors duration-300">Từ chối trả hàng</button>`;
              }
            } else {
              if (!isReviewed && diffDays <= 7) {
                returnBtnHtml = `<button onclick="event.stopPropagation(); requestReturn('${order.orderCode || order.id}', ${item.productId})" class="text-[12px] font-body-lg font-bold text-ember-red transition-colors duration-300 hover:text-graphite active:scale-95">Trả hàng / Hoàn tiền</button>`;
              }
            }
          }

          return `
            <div class="flex items-center gap-4">
                <div class="size-20 bg-surface-container-low flex-shrink-0 border border-mist cursor-pointer" onclick="window.location.href='product_detail.html?id=${item.productId}'">
                    <img alt="${item.productName}" class="w-full h-full object-cover ${isCancelled ? "grayscale" : ""}" src="${item.productThumbnail || "https://placehold.co/100?text=No+Img"}">
                </div>
                <div class="flex-1">
                    <h4 class="text-body-lg font-body-lg font-bold text-carbon-ink ${isCancelled ? "line-through" : ""}">${item.productName}</h4>
                    ${item.variant ? `<p class="text-body-sm font-body-lg text-graphite">Phân loại: ${item.variant}</p>` : ""}
                    <p class="text-body-sm font-body-lg text-graphite">Số lượng: ${item.quantity}</p>
                </div>
                <div class="text-right">
                    <p class="text-body-lg font-body-lg font-bold text-carbon-ink ${isCancelled ? "line-through text-graphite" : ""}">${formatCurrency(item.unitPrice)}</p>
                    ${returnBtnHtml ? `<div class="flex flex-col items-end mt-2">${returnBtnHtml}</div>` : ""}
                </div>
            </div>
          `;
        })
        .join('<div class="h-px bg-mist w-full my-4"></div>'); 

      let buttonsHtml = "";

      if (order.orderStatus === "PENDING") {
        buttonsHtml += `<button onclick="cancelOrder('${order.orderCode || order.id}')" class="mr-auto text-[14px] font-body-lg font-bold text-ember-red uppercase border border-ember-red py-2 px-4 rounded-lg transition-all duration-300 hover:bg-ember-red hover:text-paper-white hover:scale-105 active:scale-95 active:opacity-80">HỦY ĐƠN</button>`;
      }

      if (order.orderStatus === "DELIVERED" || order.orderStatus === "CANCELLED") {
        buttonsHtml += `<button onclick="buyAgain('${order.orderCode || order.id}', this)" class="mr-auto text-[14px] font-body-lg font-bold text-carbon-ink uppercase border border-carbon-ink py-2 px-4 rounded-lg transition-all duration-300 hover:bg-carbon-ink hover:text-paper-white hover:scale-105 active:scale-95 active:opacity-80">MUA LẠI</button>`;
      }

      // NÚT ĐÁNH GIÁ ĐÃ ĐƯỢC SỬA: Chuyển hướng sang trang review.html
      let hasReviewBtn = false;
      if (order.orderStatus === "DELIVERED") {
        order.items.forEach((item) => {
          const currentItemKey = `${order.id}-${item.productId}`;
          const isReviewed = item.isReviewed || myReviewedItems.includes(currentItemKey);
          const returnReq = myReturnRequests.find(
            (r) =>
              r.orderCode === (order.orderCode || order.id).toString() &&
              r.productId === item.productId,
          );

          if (!isReviewed && (!returnReq || returnReq.status === "REJECTED") && !hasReviewBtn) {
            buttonsHtml += `<button id="btn-review-${order.id}-${item.productId}" onclick="event.stopPropagation(); redirectToReview(${order.id})" class="text-[14px] font-body-lg font-bold text-carbon-ink uppercase border border-carbon-ink py-2 px-4 rounded-lg transition-all duration-300 hover:bg-carbon-ink hover:text-paper-white hover:scale-105 active:scale-95 active:opacity-80">Đánh giá</button>`;
            hasReviewBtn = true;
          }
        });
      }

      let detailClass = "text-[14px] font-body-lg font-bold text-carbon-ink uppercase border border-carbon-ink py-2 px-4 rounded-lg transition-all duration-300 hover:bg-carbon-ink hover:text-paper-white hover:scale-105 active:scale-95 active:opacity-80";
      if (hasReviewBtn) {
        detailClass = `ml-4 ${detailClass}`;
      }

      buttonsHtml += `<button onclick="window.location.href='order_detail.html?orderCode=${order.orderCode || order.id}'" class="${detailClass}">XEM CHI TIẾT</button>`;

// BỎ đoạn logic tính toán paymentStatusHtml cũ đi vì Backend đã trả về sẵn order.paidAmount

      // --- MỚI: XỬ LÝ HIỂN THỊ TIỀN TỆ TỪ API ---
      const subTotalHtml = formatCurrency(order.subTotal || 0);
      const discountHtml = order.discountAmount > 0 ? `-${formatCurrency(order.discountAmount)}` : "0₫";
      const shippingHtml = order.shippingFee > 0 ? formatCurrency(order.shippingFee) : "Miễn phí";
      const totalHtml = formatCurrency(order.totalAmount || 0);
      const paidHtml = formatCurrency(order.paidAmount || 0); // Lấy số tiền đã thanh toán trực tiếp từ Backend
      const depositHtml = order.depositAmount > 0 ? formatCurrency(order.depositAmount) : null;

      return `
        <div class="border border-mist hover:border-graphite hover:shadow-lg transition-all duration-300 p-6 flex flex-col gap-6" id="order-${order.orderCode || order.id}">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hairline-b pb-4">
                <div class="flex flex-col">
                    <span class="text-body-lg font-body-lg font-bold text-carbon-ink">#${order.orderCode || order.id}</span>
                    <span class="text-body-sm font-body-lg text-graphite">Ngày đặt: ${formatDate(order.createdAt)}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-[16px] font-body-lg font-bold ${status.color} uppercase tracking-widest">${status.text}</span>
                </div>
            </div>
            
            <!-- Items -->
            <div class="flex flex-col gap-4">
                ${itemsHtml}
            </div>
            
            <!-- Tổng kết tiền (ĐÃ ĐƯỢC CẬP NHẬT DỮ LIỆU ĐỘNG) -->
            <div class="flex flex-col gap-2 pt-4 border-t border-mist">
                <div class="flex justify-between items-center">
                    <span class="text-body-sm font-body-lg font-medium text-graphite">Tạm tính</span>
                    <span class="text-body-sm font-body-lg font-medium text-carbon-ink">${subTotalHtml}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-body-sm font-body-lg font-medium text-graphite">Giảm giá voucher</span>
                    <span class="text-body-sm font-body-lg font-medium text-ember-red">${discountHtml}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-body-sm font-body-lg font-medium text-graphite">Phí vận chuyển</span>
                    <span class="text-body-sm font-body-lg font-medium text-carbon-ink">${shippingHtml}</span>
                </div>
                
                ${depositHtml ? `
                <div class="flex justify-between items-center">
                    <span class="text-body-sm font-body-lg font-medium text-graphite">Tiền cọc yêu cầu</span>
                    <span class="text-body-sm font-body-lg font-medium text-carbon-ink">${depositHtml}</span>
                </div>` : ""}
                
                <div class="flex justify-between items-center pt-2 mt-2 border-t border-mist">
                    <span class="text-body-lg font-body-lg font-bold text-carbon-ink">Tổng thanh toán</span>
                    <span class="text-body-lg font-body-lg font-bold text-carbon-ink">${totalHtml}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-body-sm font-body-lg font-medium text-graphite">Đã thanh toán</span>
                    <span class="text-body-sm font-body-lg font-medium text-green-600">${paidHtml}</span>
                </div>
            </div>
            
            <!-- Bảng Nút -->
            <div class="flex justify-end pt-4">
                ${buttonsHtml}
            </div>
        </div>
      `;
    })
    .join("");
}

// HÀM HỦY ĐƠN HÀNG
async function cancelOrder(orderCode) {
  if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;

  try {
    const token = AuthUtils.getToken();
    const response = await fetch(
      `${AppConfig.ORDER_API_URL}/orders/${orderCode}/cancel`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      alert("Đã hủy đơn hàng thành công!");
      loadMyOrders();
    } else {
      const errorText = await response.text();
      alert("Không thể hủy: " + errorText);
    }
  } catch (error) {
    console.error("Lỗi khi hủy đơn:", error);
    alert("Lỗi kết nối đến máy chủ!");
  }
}

// HÀM MUA LẠI ĐƠN HÀNG
async function buyAgain(orderIdentifier, btnElement) {
  const order = allUserOrders.find(
    (o) => (o.orderCode || o.id).toString() === orderIdentifier.toString(),
  );

  if (!order || !order.items || order.items.length === 0) {
    alert("Không tìm thấy dữ liệu sản phẩm của đơn hàng này!");
    return;
  }

  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm align-middle">sync</span> Đang xử lý...`;
  btnElement.disabled = true;

  try {
    const token = AuthUtils.getToken();
    let successCount = 0;

    for (const item of order.items) {
      const response = await fetch(`${AppConfig.CART_API_URL}/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        console.warn(`Không thể thêm sản phẩm ${item.productName} vào giỏ.`);
      }
    }

    if (successCount === 0) {
      alert("Rất tiếc, các sản phẩm này hiện không thể thêm vào giỏ hàng (Có thể đã hết hàng).");
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
      return;
    }

    if (successCount < order.items.length) {
      alert(`Đã thêm ${successCount}/${order.items.length} sản phẩm vào giỏ. Một số sản phẩm có thể đã hết hàng.`);
    }

    window.location.href = "cart.html";
  } catch (error) {
    console.error("Lỗi khi Mua lại:", error);
    alert("Không thể kết nối đến máy chủ. Vui lòng thử lại!");
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}

// ==================== CHUYỂN HƯỚNG TRANG ĐÁNH GIÁ (MỚI) ====================
function redirectToReview(orderId) {
  const token = AuthUtils.getToken();
  if (!token) {
    alert("Bạn cần đăng nhập để thực hiện đánh giá.");
    return;
  }
  // Chuyển hướng sang review.html kèm theo token và orderId để tải dữ liệu
  window.location.href = `review.html?orderId=${orderId}&token=${token}`;
}

// ==================== TRẢ HÀNG / HOÀN TIỀN ====================
let currentReturnProductId = null;
let currentReturnOrderCode = null;
let currentReturnImageFiles = [];

function requestReturn(orderCode, productId) {
  const order = allUserOrders.find((o) => (o.orderCode || o.id).toString() === orderCode.toString());
  if (!order) return;

  const item = order.items.find((i) => i.productId === productId);
  if (!item) return;

  openReturnModal(productId, item.productName, item.productThumbnail, orderCode);
}

function openReturnModal(productId, productName, productImg, orderCode) {
  currentReturnProductId = productId;
  currentReturnOrderCode = orderCode;

  document.getElementById("return-product-info").innerHTML = `
      <img src="${productImg || "https://placehold.co/100?text=No+Img"}" class="w-12 h-12 object-cover rounded border border-mist">
      <p class="text-sm font-bold text-carbon-ink line-clamp-2">${productName}</p>
  `;

  document.getElementById("return-reason").value = "";
  currentReturnImageFiles = []; 
  renderImagePreviews(); 

  document.getElementById("return-modal").classList.remove("hidden");
}

function closeReturnModal() {
  document.getElementById("return-modal").classList.add("hidden");
}

function previewReturnImages(event) {
  const files = Array.from(event.target.files); 
  if (files.length === 0) return;

  const maxImages = 5;
  if (currentReturnImageFiles.length + files.length > maxImages) {
    alert(`Bạn chỉ được phép tải lên tối đa ${maxImages} ảnh minh chứng.`);
    return;
  }

  currentReturnImageFiles = currentReturnImageFiles.concat(files);
  renderImagePreviews();
  document.getElementById("return-image-input").value = "";
}

function renderImagePreviews() {
  const container = document.getElementById("return-image-preview-container");
  container.innerHTML = ""; 

  currentReturnImageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageWrapper = document.createElement("div");
      imageWrapper.className = "relative w-20 h-20 rounded-lg border border-mist overflow-hidden flex-shrink-0";

      imageWrapper.innerHTML = `
                <img src="${e.target.result}" class="w-full h-full object-cover">
                <button type="button" onclick="removeReturnImage(${index})" class="absolute top-1 right-1 bg-obsidian/70 text-paper-white rounded-full p-0.5 hover:bg-ember-red transition-colors z-10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            `;
      container.appendChild(imageWrapper);
    };
    reader.readAsDataURL(file);
  });
}

function removeReturnImage(index) {
  currentReturnImageFiles.splice(index, 1);
  renderImagePreviews();
}

async function submitReturnRequest(btnElement) {
  const reason = document.getElementById("return-reason").value;

  if (!reason.trim()) {
    alert("Vui lòng nhập lý do trả hàng để chúng tôi hỗ trợ bạn tốt nhất!");
    return;
  }

  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = `<span class="material-symbols-outlined animate-spin align-middle text-sm">sync</span> Đang gửi...`;
  btnElement.disabled = true;

  try {
    const formData = new FormData();
    formData.append("orderCode", currentReturnOrderCode);
    formData.append("productId", currentReturnProductId);
    formData.append("reason", reason);

    currentReturnImageFiles.forEach((file) => {
      formData.append("evidenceImages", file);
    });

    const token = AuthUtils.getToken();
    const response = await fetch(`${AppConfig.ORDER_API_URL}/orders/returns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    alert("Gửi yêu cầu trả hàng thành công! Quản trị viên sẽ sớm liên hệ với bạn.");
    closeReturnModal();
    loadMyOrders();
  } catch (error) {
    console.error("Lỗi gửi yêu cầu trả hàng:", error);
    alert("Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau!");
  } finally {
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}