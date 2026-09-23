// BIẾN TOÀN CỤC
let currentCartData = null;
let globalSubTotal = 0;
let currentDiscount = 0;
let currentShippingFee = 0;
let currentVoucherCode = "";

let userAddresses = [];
let availableVouchers = [];
let selectedAddress = null;
let currentDepositAmount = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  loadAddresses();
  loadAvailableVouchers();
  updateCheckoutUI();
  initRadioStyles();
  setupGuestAutocomplete();
});

function updateCheckoutUI() {
  const addressBox = document.getElementById("checkout-address-box");
  const manualInputForm = document.getElementById("manual-input-form");

  const isLoggedIn = AuthUtils.isLoggedIn();

  if (isLoggedIn) {
    if (addressBox) addressBox.classList.remove("hidden");
    if (manualInputForm) manualInputForm.classList.add("hidden");
  } else {
    if (addressBox) addressBox.classList.add("hidden");
    if (manualInputForm) manualInputForm.classList.remove("hidden");
  }
}

function initRadioStyles() {
  // Chỉ tìm các thẻ input có name="payment"
  document
    .querySelectorAll('input[type="radio"][name="payment"]')
    .forEach((radio) => {
      radio.addEventListener("change", (e) => {
        // Xóa định dạng "Đã chọn" của tất cả các nút
        document
          .querySelectorAll('input[type="radio"][name="payment"]')
          .forEach((r) => {
            const label = r.closest("label");
            label.className =
              "flex items-center gap-md p-md border border-transparent hover:border-mist rounded cursor-pointer hover:bg-fog transition-colors";
          });

        // Thêm định dạng "Đã chọn" cho nút vừa click
        if (e.target.checked) {
          const label = e.target.closest("label");
          label.className =
            "flex items-center gap-md p-md border border-carbon-ink rounded cursor-pointer bg-surface-container-low transition-colors";
        }

        // Cập nhật lại nút Đặt hàng
        updateCheckoutButtonUI();
      });
    });
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// ==================== LOGIC GIỎ HÀNG ====================
async function loadCart() {
  try {
    // SỬ DỤNG ApiUtils: Không cần chặn if(!token) nữa, Session-Id sẽ lo liệu
    currentCartData = await ApiUtils.fetchAPI("/cart");
    renderCartItems(currentCartData.items);
    renderCartSummary(currentCartData);
  } catch (error) {
    console.error("Lỗi tải giỏ hàng:", error);
  }
}

function renderCartItems(items) {
  const container = document.getElementById("cart-items-container");
  const emptyCartEl = document.getElementById("empty-cart-message");
  const cartContentEl = document.getElementById("cart-content-wrapper");
  const selectAllCheckbox = document.getElementById("select-all");
  // === ĐÂY LÀ DÒNG CODE MỚI ĐƯỢC THÊM VÀO ĐỂ SỬA LỖI ===
  // Nếu không tìm thấy khung chứa sản phẩm (do đang ở trang checkout.html),
  // hãy dừng hàm này lại để tránh lỗi null.
  if (!container) return;

  // Xử lý khi giỏ hàng trống
  if (!items || items.length === 0) {
    if (cartContentEl) cartContentEl.classList.add("hidden");
    if (emptyCartEl) emptyCartEl.classList.remove("hidden");
    renderCartSummary({ items: [] });
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    return;
  }

  // Xử lý khi có hàng
  if (cartContentEl) cartContentEl.classList.remove("hidden");
  if (emptyCartEl) emptyCartEl.classList.add("hidden");

  // Xử lý nút chọn tất cả
  if (selectAllCheckbox) {
    const isAllSelected = items.every((item) => item.isSelected);
    selectAllCheckbox.checked = isAllSelected;
  }

  // Đổ dữ liệu HTML đồng bộ với Light Theme
  container.innerHTML = items
    .map((item) => {
      let discountHtml = "";
      let basePriceHtml = "";

      // Tính toán giá gốc và % giảm
      if (item.basePrice && item.basePrice > item.price) {
        const percent = Math.round(
          ((item.basePrice - item.price) / item.basePrice) * 100,
        );
        basePriceHtml = `<span class="font-body-sm text-body-sm text-secondary line-through">${formatCurrency(item.basePrice)}</span>`;
        discountHtml = `<span class="font-body-sm font-bold text-[12px] text-ember-red">-${percent}%</span>`;
      }

      const isMinQuantity = item.quantity <= 1;
      const isMaxQuantity = item.quantity >= item.stock;
      const isOutOfStock =
        item.stock <= 0 || item.stockStatus === "OUT_OF_STOCK";
      const safeName = item.productName
        ? item.productName.replace(/'/g, "\\'").replace(/"/g, "&quot;")
        : "Sản phẩm";

      return `
        <div class="flex flex-col sm:flex-row gap-lg pb-lg border-b border-mist ${isOutOfStock ? "opacity-50 grayscale" : ""}">
            
            <!-- Checkbox -->
            <div class="flex-shrink-0 pt-sm">
                <label class="flex items-center cursor-pointer">
                    <input type="checkbox" ${item.isSelected ? "checked" : ""} ${isOutOfStock ? "disabled" : ""}
                        onchange="updateCartItem(${item.id}, null, this.checked)"
                        class="w-5 h-5 border border-ash-border text-carbon-ink focus:ring-carbon-ink rounded transition-colors" />
                </label>
            </div>
            
            <!-- Hình ảnh -->
            <div class="w-full sm:w-48 h-48 bg-paper-white border border-mist flex-shrink-0 relative overflow-hidden flex items-center justify-center p-sm">
                <img class="object-contain w-full h-full mix-blend-multiply" alt="${safeName}" src="${item.productThumbnail || "https://placehold.co/200"}">
            </div>
            
            <!-- Thông tin sản phẩm -->
            <div class="flex flex-col justify-between flex-grow">
                <div>
                    <div class="flex justify-between items-start gap-md">
                        <h3 class="font-body-lg text-[18px] font-bold">
                            <a href="product_detail.html?id=${item.productId}" class="hover:text-primary transition-colors">${item.productName}</a>
                        </h3>
                        <button onclick="removeCartItem(${item.id})" class="text-secondary hover:text-error transition-colors">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <ul class="mt-md font-body-sm text-body-sm text-secondary space-y-1">
                        <li>SKU: ${item.skuId || "N/A"}</li>
                        ${item.selectedColor && item.selectedColor !== "null" ? `<li>Màu: ${item.selectedColor}</li>` : ""}
                    </ul>
                </div>
                
                <!-- Số lượng và Giá -->
                <div class="flex justify-between items-end mt-lg sm:mt-0">
                    <div class="flex items-center border border-ash-border rounded h-8 overflow-hidden">
                        <button ${isMinQuantity ? "disabled" : `onclick="updateCartItem(${item.id}, ${item.quantity - 1}, null)"`} class="px-sm py-xs hover:bg-fog transition-colors w-8 h-full flex items-center justify-center p-0 ${isMinQuantity ? "opacity-50 cursor-not-allowed" : ""}">
                            <span class="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        
                        <input class="w-12 bg-transparent border-none text-center font-body-sm text-body-sm focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-full" 
                            type="number" value="${item.quantity}" onchange="handleQuantityChange(event, ${item.id}, ${item.stock})">
                            
                        <button ${isMaxQuantity ? "disabled" : `onclick="updateCartItem(${item.id}, ${item.quantity + 1}, null)"`} class="px-sm py-xs hover:bg-fog transition-colors w-8 h-full flex items-center justify-center p-0 ${isMaxQuantity ? "opacity-50 cursor-not-allowed" : ""}">
                            <span class="material-symbols-outlined text-[16px]">add</span>
                        </button>
                    </div>
                    
                    <div class="flex flex-col items-end gap-xs">
                        <div class="flex items-center gap-sm">
                            ${basePriceHtml}
                            ${discountHtml}
                        </div>
                        <span class="font-body-lg text-body-lg font-bold text-ember-red">${formatCurrency(item.subTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}

function renderCartSummary(cart) {
  const items = cart.items || [];
  const selectedItems = items.filter((item) => item.isSelected);

  const totalItems = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  globalSubTotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  let finalTotal = globalSubTotal - currentDiscount + currentShippingFee;
  if (finalTotal < 0) finalTotal = 0;

  const elItems = document.getElementById("summary-total-items");
  const elSub = document.getElementById("summary-subtotal");
  const elDiscount = document.getElementById("summary-discount");
  const elShip = document.getElementById("summary-shipping");
  const elFinal = document.getElementById("summary-final-total");

  if (elItems) elItems.innerText = `${totalItems} sản phẩm`;
  if (elSub) elSub.innerText = formatCurrency(globalSubTotal);
  if (elDiscount) elDiscount.innerText = `-${formatCurrency(currentDiscount)}`;
  if (elShip)
    elShip.innerText =
      currentShippingFee === 0
        ? "Miễn phí"
        : formatCurrency(currentShippingFee);
  if (elFinal) elFinal.innerText = formatCurrency(finalTotal);

  if (currentVoucherCode && globalSubTotal < currentDiscount) {
    clearVoucher();
  }
  updateCheckoutButtonUI();
  renderCheckoutItems(items);
}

async function updateCartItem(itemId, newQuantity, isSelected) {
  let url = `/cart/item/${itemId}?`;
  if (newQuantity !== null) url += `quantity=${newQuantity}&`;
  if (isSelected !== null) url += `isSelected=${isSelected}`;

  try {
    currentCartData = await ApiUtils.fetchAPI(url, { method: "PUT" });
    renderCartItems(currentCartData.items);
    renderCartSummary(currentCartData);
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
  }
}

// ==================== XỬ LÝ NHẬP SỐ LƯỢNG THỦ CÔNG ====================
function handleQuantityChange(event, itemId, maxStock) {
  // 1. Lấy giá trị người dùng vừa gõ và chuyển thành số nguyên
  let newQuantity = parseInt(event.target.value);

  // 2. Kiểm tra nếu nhập chữ (NaN) hoặc số âm
  if (isNaN(newQuantity) || newQuantity < 0) {
    newQuantity = 1;
    event.target.value = newQuantity;
    updateCartItem(itemId, newQuantity, null);
    return; // Dừng hàm tại đây
  }

  // 3. Kiểm tra nếu người dùng nhập số 0 (Muốn xóa sản phẩm)
  if (newQuantity === 0) {
    // Hiển thị hộp thoại xác nhận
    const isConfirm = confirm(
      "Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?",
    );

    if (isConfirm) {
      // Gọi hàm xóa sản phẩm đã có sẵn của bạn
      removeCartItem(itemId);
    } else {
      // Bấm hủy -> Trả số lượng về 1
      event.target.value = 1;
      updateCartItem(itemId, 1, null);
    }
    return; // Dừng hàm tại đây
  }

  // 4. Kiểm tra nếu nhập lố số lượng hàng trong kho
  if (newQuantity > maxStock) {
    newQuantity = maxStock;
    alert(
      `Rất tiếc, sản phẩm này chỉ còn tối đa ${maxStock} sản phẩm trong kho!`,
    );
  }

  // 5. Cập nhật lại giao diện và gọi API
  event.target.value = newQuantity;
  updateCartItem(itemId, newQuantity, null);
}
async function removeCartItem(itemId) {
  if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
  try {
    currentCartData = await ApiUtils.fetchAPI(`/cart/item/${itemId}`, {
      method: "DELETE",
    });
    renderCartItems(currentCartData.items);
    renderCartSummary(currentCartData);
    if (typeof HeaderLogic !== "undefined") HeaderLogic.updateCartBadge();
  } catch (error) {
    console.error("Lỗi xóa:", error);
  }
}

async function toggleSelectAll(isSelected) {
  try {
    currentCartData = await ApiUtils.fetchAPI(
      `/cart/select-all?isSelected=${isSelected}`,
      { method: "PUT" },
    );
    renderCartItems(currentCartData.items);
    renderCartSummary(currentCartData);
  } catch (error) {
    console.error("Lỗi chọn tất cả:", error);
  }
}

// ==================== MÃ GIẢM GIÁ ====================
async function loadAvailableVouchers() {
  try {
    availableVouchers = await ApiUtils.fetchAPI("/vouchers/public/active");
  } catch (e) {
    console.error("Lỗi tải danh sách voucher:", e);
  }
}
function openVoucherModal() {
  const container = document.getElementById("voucher-list-container");

  // 1. Kiểm tra trạng thái đăng nhập và lấy email tài khoản đã xác thực
  const isLoggedIn = AuthUtils.isLoggedIn();
  const accountEmail = isLoggedIn ? (AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL) || "").trim().toLowerCase() : "";

  // 2. Lọc danh sách voucher hiển thị cho người dùng
  const validVouchers = availableVouchers.filter(v => {
    
    // Điều kiện A: Nếu voucher dành riêng cho 1 Email cụ thể
    if (v.targetEmail && v.targetEmail.trim() !== "") {
        // Bắt buộc phải đăng nhập VÀ email phải khớp hoàn toàn
        if (!isLoggedIn || v.targetEmail.trim().toLowerCase() !== accountEmail) {
            return false;
        }
    }
    
    // Điều kiện B: Nếu voucher dành riêng cho Nhóm Khách Hàng (Customer Group)
    if (v.customerGroup && v.customerGroup.trim() !== "") {
        // Khách vãng lai (chưa đăng nhập) không có cấp bậc -> Không được hiển thị
        if (!isLoggedIn) {
            return false;
        }
    }
    
    // Nếu vượt qua các điều kiện trên (Bao gồm voucher có customer_group = null), mã sẽ hiển thị
    return true; 
  });

  // 3. Hiển thị ra giao diện
  if (validVouchers.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-on-surface-variant font-body-sm">Hiện không có mã khuyến mãi nào khả dụng cho bạn.</div>`;
  } else {
    container.innerHTML = validVouchers
      .map((v) => {
        const isEligible = globalSubTotal >= (v.minOrderAmount || 0);
        const discountText =
          v.discountType === "PERCENTAGE"
            ? `GIẢM ${v.discountValue}%`
            : `GIẢM ${formatCurrency(v.discountValue)}`;

        return `
            <div class="border ${isEligible ? "border-mist hover:border-carbon-ink" : "border-mist opacity-50 cursor-not-allowed"} p-md rounded flex flex-col gap-xs transition-colors">
                <div class="flex justify-between items-start">
                    <span class="font-body-lg font-bold uppercase">${discountText}</span>
                    ${
                      isEligible
                        ? `<button onclick="selectVoucher('${v.voucherCode}')" class="bg-carbon-ink text-paper-white font-label-caps text-label-sm px-md py-xs rounded uppercase tracking-widest hover:bg-primary transition-colors">Áp dụng</button>`
                        : `<span class="text-secondary font-label-caps text-label-sm px-md py-xs rounded border border-ash-border">Chưa đủ ĐK</span>`
                    }
                </div>
                <p class="text-body-sm text-secondary">Cho đơn hàng từ ${formatCurrency(v.minOrderAmount || 0)}</p>
                <p class="text-technical-mono text-[12px] text-secondary mt-xs">MÃ: ${v.voucherCode}</p>
            </div>
        `;
      })
      .join("");
  }

  const modal = document.getElementById("voucher-modal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}
function closeVoucherModal() {
  const modal = document.getElementById("voucher-modal");
  modal.classList.add("opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

async function selectVoucher(code) {
  closeVoucherModal();
  await applyVoucher(code);
}

async function applyVoucher(code) {
  const msgEl = document.getElementById("voucher-message");

  if (globalSubTotal === 0) {
    alert("Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá!");
    return;
  }

  // Lấy email người dùng để gửi xuống API kiểm tra bảo mật
  let currentEmail = "";
  if (AuthUtils.isLoggedIn()) {
    currentEmail = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL) || "";
  } else {
    const guestEmailInput = document.getElementById("guest-email");
    if (guestEmailInput) {
        currentEmail = guestEmailInput.value;
    }
  }

  try {
    // Gắn thêm tham số email vào URL gọi API
    let url = `/vouchers/validate?code=${code}&subTotal=${globalSubTotal}`;
    if (currentEmail && currentEmail.trim() !== "") {
        url += `&email=${encodeURIComponent(currentEmail.trim())}`;
    }

    const data = await ApiUtils.fetchAPI(url);
    
    if (data.isValid) {
      currentDiscount = data.discountAmount;
      currentVoucherCode = data.voucherCode;

      document.getElementById("display-voucher-code").innerText =
        `Đã áp dụng mã: ${data.voucherCode}`;
      document
        .getElementById("display-voucher-code")
        .classList.add("text-emerald-600");
      document.getElementById("display-voucher-desc").innerText =
        `Được giảm -${formatCurrency(currentDiscount)}`;
      document.getElementById("btn-clear-voucher").classList.remove("hidden");

      msgEl.innerText = "Áp mã thành công!";
      msgEl.classList.remove("hidden", "text-red-500");
      msgEl.classList.add("text-emerald-500");

      renderCartSummary(currentCartData);
    }
  } catch (e) {
    clearVoucher();
    // Hiển thị lỗi từ Backend (ví dụ: "Mã giảm giá này chỉ dành riêng cho email...")
    alert(e.message || "Mã giảm giá không hợp lệ!");
  }
}

function clearVoucher() {
  currentDiscount = 0;
  currentVoucherCode = "";

  document.getElementById("display-voucher-code").innerText =
    "Chọn mã giảm giá";
  document
    .getElementById("display-voucher-code")
    .classList.remove("text-emerald-600");
  document.getElementById("display-voucher-desc").innerText =
    "Bấm để xem các mã có sẵn";
  document.getElementById("btn-clear-voucher").classList.add("hidden");
  document.getElementById("voucher-message").classList.add("hidden");

  renderCartSummary(currentCartData);
}

// ==================== ĐỊA CHỈ ====================
async function loadAddresses() {
  // Chỉ tải địa chỉ nếu người dùng ĐÃ ĐĂNG NHẬP
  if (!AuthUtils.isLoggedIn()) {
    return; // Khách vãng lai sẽ dùng form nhập tay
  }

  try {
    userAddresses = await ApiUtils.fetchAPI("/users/addresses/all");

    if (userAddresses && userAddresses.length > 0) {
      selectedAddress =
        userAddresses.find((a) => a.isDefault === true || a.default === true) ||
        userAddresses[0];
      updateAddressUI();
    } else {
      showEmptyAddressUI();
    }
  } catch (e) {
    console.error("Lỗi tải địa chỉ:", e);
    showEmptyAddressUI();
  }
}

function editSelectedAddress() {
  // Kiểm tra xem đã có địa chỉ nào được chọn chưa
  if (selectedAddress && selectedAddress.addressId) {
    // Gọi hàm edit từ AddressManager (được viết trong file address.js)
    if (typeof AddressManager !== "undefined") {
      AddressManager.edit(selectedAddress.addressId);
    } else {
      console.error("Hệ thống chưa tải xong chức năng quản lý địa chỉ.");
    }
  } else {
    alert("Vui lòng chọn một địa chỉ từ danh sách trước khi chỉnh sửa!");
  }
}

function updateAddressUI() {
  const container = document.getElementById("checkout-address-box");
  if (!container) return;

  if (!userAddresses || userAddresses.length === 0) {
    container.innerHTML = `
        <div class="border border-mist p-lg bg-paper-white flex flex-col items-center justify-center gap-md">
            <span class="text-graphite font-body-sm">Bạn chưa có địa chỉ giao hàng nào.</span>
            <button type="button" onclick="toggleModal(true)" class="border border-carbon-ink px-md py-sm rounded-[4px] font-label-caps text-label-caps uppercase tracking-widest hover:bg-fog transition-colors">Thêm địa chỉ mới</button>
        </div>
    `;
    return;
  }

  // Đảm bảo luôn có địa chỉ được chọn
  if (!selectedAddress) {
    selectedAddress =
      userAddresses.find((a) => a.isDefault === true || a.default === true) ||
      userAddresses[0];
  }

  const addr = selectedAddress;
  const addrName = addr.addressName || "ĐỊA CHỈ NHẬN HÀNG";

  // Vẽ giao diện Hộp địa chỉ giống với ảnh bạn gửi
  container.innerHTML = `
    <div class="border border-mist p-lg bg-paper-white flex flex-col gap-sm">
        <div class="flex justify-between items-center mb-xs">
            <span class="font-body-lg text-[16px] font-bold text-carbon-ink uppercase tracking-widest">${addrName}</span>
            <button type="button" onclick="openAddressSelectionModal()" class="font-label-caps text-[14px] font-bold text-carbon-ink uppercase tracking-widest border-b border-carbon-ink hover:text-secondary hover:border-transparent transition-colors">CHỈNH SỬA</button>
        </div>
        <div class="font-body-lg text-[16px] text-carbon-ink mt-sm">
            ${addr.receiverName} - ${addr.phoneNumber}
        </div>
        <div class="font-body-lg text-[16px] text-graphite">
            ${addr.fullAddress}
        </div>
    </div>
  `;

  // Cập nhật giá trị ẩn cho API Đặt hàng
  document.getElementById("user-receiver-name").value = addr.receiverName || "";
  document.getElementById("user-receiver-phone").value = addr.phoneNumber || "";
  document.getElementById("user-shipping-address").value =
    addr.fullAddress || "";
}

// Hàm mới: Kích hoạt khi khách hàng click chọn một nút Radio khác
function selectAddress(addressId) {
  // Tìm địa chỉ được chọn trong mảng
  selectedAddress = userAddresses.find((a) => a.addressId === addressId);
  // Render lại giao diện để đổi màu viền và nền
  updateAddressUI();
}

async function placeOrder(event) {
  if (event) event.preventDefault();

  if (!currentCartData || !currentCartData.items) return;

  const selectedItems = currentCartData.items.filter((item) => item.isSelected);
  if (selectedItems.length === 0) {
    alert("Vui lòng chọn ít nhất một sản phẩm để đặt hàng!");
    return;
  }

  const isLoggedIn = AuthUtils.isLoggedIn();
  let receiverName, receiverPhone, shippingAddress, email;

  // ĐÃ SỬA: Lấy phương thức thanh toán chung một chỗ
  const paymentRadio = document.querySelector('input[name="payment"]:checked');
  const selectedPaymentMethod = paymentRadio ? paymentRadio.value : "COD";

  if (isLoggedIn) {
    // === DÀNH CHO NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP ===
    receiverName = document.getElementById("user-receiver-name").value;
    receiverPhone = document.getElementById("user-receiver-phone").value;
    shippingAddress = document.getElementById("user-shipping-address").value;
    email = AuthUtils.getUserInfo(AppConfig.KEYS.EMAIL);
  } else {
    // === DÀNH CHO KHÁCH VÃNG LAI ===
    receiverName = document.getElementById("guest-name").value;
    receiverPhone = document.getElementById("guest-phone").value;
    shippingAddress = document.getElementById("guest-address").value;
    email = document.getElementById("guest-email").value;

    if (!isGuestAddressSelected) {
      alert(
        "Vui lòng gõ và click chọn địa chỉ giao hàng của bạn từ danh sách gợi ý!",
      );
      return;
    }
  }

  // Kiểm tra tính toàn vẹn của dữ liệu trước khi gửi API
  if (
    !receiverName ||
    !receiverPhone ||
    !shippingAddress ||
    (!isLoggedIn && !email)
  ) {
    alert("Vui lòng điền đầy đủ thông tin nhận hàng và Email!");
    return;
  }

  const orderPayload = {
    receiverName,
    receiverPhone,
    shippingAddress,
    email: email,
    paymentMethod: selectedPaymentMethod,
    voucherCode: currentVoucherCode,
    items: selectedItems.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productThumbnail: i.productThumbnail,
      quantity: i.quantity,
      unitPrice: i.price,
    })),
  };

  const btn = event ? event.target : document.getElementById("btn-place-order");
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = "Đang xử lý...";

  try {
    console.log("1. Bắt đầu gửi yêu cầu tạo đơn hàng...");
    const orderData = await ApiUtils.fetchAPI("/orders/create", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    const orderCode = orderData.orderCode || orderData.id;
    console.log("2. Đã tạo đơn hàng thành công, Mã đơn:", orderCode);

    // Tính tổng tiền cuối cùng
    let finalTotal = globalSubTotal - currentDiscount + currentShippingFee;
    if (finalTotal < 0) finalTotal = 0;

    // --- BẮT ĐẦU ĐOẠN LOGIC MỚI ---
    let amountToPayNow = 0;
    let requiresOnlinePayment = false;

    // Phân loại số tiền cần thanh toán dựa trên phương thức
    if (selectedPaymentMethod === "COD") {
      amountToPayNow = calculateDeposit(finalTotal);
      console.log(
        "3. Phương thức COD. Tiền cọc cần thanh toán:",
        amountToPayNow,
      );

      // Nếu có cọc thì mới cần thanh toán online
      if (amountToPayNow > 0) {
        requiresOnlinePayment = true;
      }
    } else {
      // Các phương thức khác (Ngân hàng, ZaloPay, MoMo) -> Thanh toán 100%
      amountToPayNow = finalTotal;
      console.log("3. Phương thức Online. Thanh toán toàn bộ:", amountToPayNow);
      requiresOnlinePayment = true;
    }

    console.log("4. Có cần gọi cổng thanh toán không?:", requiresOnlinePayment);

    if (requiresOnlinePayment) {
      console.log("5. Đang gọi API PayOS để lấy link thanh toán...");
      // --- KẾT THÚC ĐOẠN LOGIC MỚI ---

      const checkoutResponse = await ApiUtils.fetchAPI(
        `/orders/${orderCode}/generate-payos-link`,
        { method: "POST" },
      );

      const finalUrl = checkoutResponse.message || checkoutResponse;
      console.log(
        "6. Lấy link PayOS thành công, chuẩn bị chuyển hướng:",
        finalUrl,
      );
      window.location.href = finalUrl;
    } else {
      console.log(
        "5. Không cần thanh toán online, chuyển hướng sang trang thành công.",
      );
      window.location.href = `order_detail.html?orderCode=${orderCode}`;
    }
  } catch (error) {
    console.error("PHÁT HIỆN LỖI KHI ĐẶT HÀNG");
    console.error(error);
    alert(
      "Đã xảy ra lỗi: " +
        (error.message || "Vui lòng mở Console (F12) để xem chi tiết."),
    );
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function calculateDeposit(totalAmount) {
  if (totalAmount > 30000000) return totalAmount * 0.3;
  if (totalAmount > 10000000) return totalAmount * 0.2;
  if (totalAmount >= 1000000) return totalAmount * 0.1;
  return 0;
}

function updateCheckoutButtonUI() {
  let finalTotal = globalSubTotal - currentDiscount + currentShippingFee;
  if (finalTotal < 0) finalTotal = 0;

  // ĐÃ SỬA: Lấy trực tiếp từ name="payment"
  const paymentRadio = document.querySelector('input[name="payment"]:checked');
  const selectedPaymentMethod = paymentRadio ? paymentRadio.value : "COD";

  let buttonText = "";
  if (selectedPaymentMethod === "COD") {
    currentDepositAmount = calculateDeposit(finalTotal);
    if (currentDepositAmount > 0) {
      buttonText = `Thanh toán cọc: ${formatCurrency(currentDepositAmount)}`;
    } else {
      buttonText = "Đặt hàng (Thanh toán khi nhận hàng)";
    }
  } else {
    buttonText = `Thanh toán Online: ${formatCurrency(finalTotal)}`;
  }

  const btnUser = document.getElementById("btn-place-order");
  if (btnUser) btnUser.innerHTML = buttonText;

  const btnGuest = document.getElementById("btn-guest-place-order");
  if (btnGuest) btnGuest.innerHTML = buttonText;
}

// ==================== UI ANIMATIONS / DROPDOWNS ====================
// Hàm xử lý việc mở/đóng các mục trong trang Thanh toán
function toggleCheckoutSection(sectionId, iconId) {
  const section = document.getElementById(sectionId);
  const icon = document.getElementById(iconId);

  if (!section) return;

  // Kiểm tra xem mục đang bị ẩn (chứa class 'hidden') hay đang mở
  if (section.classList.contains("hidden")) {
    // Đang ẩn -> Mở ra
    section.classList.remove("hidden");
    section.classList.add("flex"); // Thiết lập lại kiểu hiển thị flex

    // Đổi mũi tên thành hướng lên
    if (icon) icon.innerText = "expand_less";
  } else {
    // Đang mở -> Ẩn đi
    section.classList.add("hidden");
    section.classList.remove("flex");

    // Đổi mũi tên lại thành hướng xuống
    if (icon) icon.innerText = "expand_more";
  }
}

// ==================== GỢI Ý ĐỊA CHỈ CHO KHÁCH VÃNG LAI ====================
let guestAutocompleteTimeout = null;
// MỚI: Biến cờ theo dõi trạng thái chọn địa chỉ của khách
let isGuestAddressSelected = false;

function setupGuestAutocomplete() {
  const addressInput = document.getElementById("guest-address");
  const suggestionBox = document.getElementById("guest-suggestion-box");

  if (!addressInput || !suggestionBox) return;

  addressInput.addEventListener("input", (e) => {
    // MỚI: Bất cứ khi nào khách gõ phím, reset trạng thái chọn về false
    isGuestAddressSelected = false;

    clearTimeout(guestAutocompleteTimeout);
    const text = e.target.value.trim();

    if (text.length < 2) {
      suggestionBox.classList.add("hidden");
      return;
    }

    guestAutocompleteTimeout = setTimeout(async () => {
      try {
        const url = `${AppConfig.BASE_URL}/locations/autocomplete?text=${encodeURIComponent(text)}`;
        const res = await fetch(url, { method: "GET" });

        if (!res.ok) throw new Error("Lỗi mạng khi lấy gợi ý địa chỉ");

        const suggestions = await res.json();

        if (suggestions.length > 0) {
          suggestionBox.innerHTML = suggestions
            .map(
              (s) => `
            <div class="p-3 hover:bg-surface-container-low cursor-pointer text-[16px] font-body-sm text-carbon-ink border-b border-mist last:border-0" 
                 onclick="selectGuestSuggestion('${s.display}')">
                ${s.display}
            </div>
          `,
            )
            .join("");
          suggestionBox.classList.remove("hidden");
        } else {
          suggestionBox.innerHTML = `<div class="p-3 text-sm text-graphite">Không tìm thấy địa chỉ phù hợp</div>`;
          suggestionBox.classList.remove("hidden");
        }
      } catch (error) {
        console.error("Lỗi khi lấy gợi ý địa chỉ khách:", error);
      }
    }, 500);
  });

  document.addEventListener("click", (e) => {
    if (!addressInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      suggestionBox.classList.add("hidden");
    }
  });
}

window.selectGuestSuggestion = function (displayAddress) {
  document.getElementById("guest-address").value = displayAddress;
  document.getElementById("guest-suggestion-box").classList.add("hidden");

  // MỚI: Đánh dấu là khách đã click chọn địa chỉ chuẩn từ danh sách
  isGuestAddressSelected = true;
};

// ==================== HIỂN THỊ SẢN PHẨM Ở TRANG CHECKOUT ====================
function renderCheckoutItems(items) {
  const container = document.getElementById("checkout-items-container");

  // Dừng hàm an toàn nếu không tìm thấy khối chứa (ví dụ: đang ở trang cart.html)
  if (!container) return;

  const selectedItems = items.filter((item) => item.isSelected);

  // Xử lý giao diện khi không có sản phẩm
  if (selectedItems.length === 0) {
    container.innerHTML = `<div class="p-md text-graphite font-body-sm text-center">Chưa có sản phẩm nào được chọn.</div>`;
    return;
  }

  // Khởi tạo HTML cho từng sản phẩm
  container.innerHTML = selectedItems
    .map((item, index) => {
      // Làm sạch chuỗi tên sản phẩm để tránh lỗi HTML
      const safeName = item.productName
        ? item.productName.replace(/'/g, "\\'").replace(/"/g, "&quot;")
        : "Sản phẩm";

      // Xử lý dòng hiển thị màu sắc (ẩn đi nếu không có màu)
      const colorText =
        item.selectedColor && item.selectedColor !== "null"
          ? `<span class="text-graphite font-body-sm mt-xs">Màu: ${item.selectedColor}</span>`
          : "";

      // Tạo đường viền ngăn cách (border-bottom) cho các item, ngoại trừ item cuối cùng
      const borderClass =
        index < selectedItems.length - 1 ? "border-b border-mist" : "";

      // Trả về khối HTML của 1 dòng sản phẩm
      return `
        <div class="flex gap-lg items-center p-md ${borderClass}">
            
            <!-- Khối ảnh Thumbnail (Mô phỏng hình vuông nền xám, viền mỏng) -->
            <div class="w-24 h-24 bg-fog shrink-0 rounded flex items-center justify-center border border-mist overflow-hidden">
                <img class="object-contain w-full h-full mix-blend-multiply p-1" alt="${safeName}" src="${item.productThumbnail || "https://placehold.co/100"}">
            </div>
            
            <!-- Khối thông tin chi tiết (Nằm giữa, đẩy giá tiền sang bên phải) -->
            <div class="flex-grow flex flex-col justify-center">
                <span class="font-body-lg text-[16px] font-bold text-carbon-ink line-clamp-2">${item.productName}</span>
                ${colorText}
                <span class="text-graphite font-body-sm mt-xs">Số lượng: ${item.quantity}</span>
            </div>

            <!-- Khối hiển thị Tổng giá (Nằm ngoài cùng bên phải) -->
            <div class="flex-shrink-0 font-body-lg text-body-lg text-ember-red text-right font-bold pl-sm">
                ${formatCurrency(item.price * item.quantity)}
            </div>
            
        </div>
      `;
    })
    .join("");
}

// ==================== POPUP QUẢN LÝ VÀ CHỌN ĐỊA CHỈ (CHECKOUT) ====================

function openAddressSelectionModal() {
  renderAddressSelectionList();
  const modal = document.getElementById("address-selection-modal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.remove("opacity-0"), 10);
}

function closeAddressSelectionModal() {
  const modal = document.getElementById("address-selection-modal");
  modal.classList.add("opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

// Render danh sách địa chỉ vào bên trong popup
function renderAddressSelectionList() {
  const container = document.getElementById("address-selection-list");

  if (!userAddresses || userAddresses.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-graphite font-body-sm">Bạn chưa có địa chỉ nào.</div>`;
    return;
  }

  container.innerHTML = userAddresses
    .map((addr) => {
      // Kiểm tra xem địa chỉ này có đang được chọn trên trang thanh toán không
      const isSelected =
        selectedAddress && selectedAddress.addressId === addr.addressId;
      const addrName = addr.addressName || "ĐỊA CHỈ";
      const borderClass = isSelected
        ? "border-carbon-ink bg-fog"
        : "border-mist hover:bg-surface-container-low";

      return `
      <div class="flex items-start justify-between p-md border ${borderClass} rounded-[4px] cursor-pointer transition-colors mb-md last:mb-0" onclick="selectAddressAndClose(${addr.addressId})">
          <div class="flex flex-col gap-1 pr-md">
              <div class="flex items-center gap-2">
                  <span class="font-body-lg text-[16px] font-bold text-carbon-ink uppercase tracking-widest">${addrName}</span>
                  ${addr.isDefault || addr.default ? `<span class="bg-carbon-ink text-paper-white text-[10px] px-2 py-0.5 uppercase tracking-widest">Mặc định</span>` : ""}
              </div>
              <span class="font-body-lg text-carbon-ink mt-xs">${addr.receiverName} - ${addr.phoneNumber}</span>
              <span class="font-body-sm text-graphite">${addr.fullAddress}</span>
          </div>
          
          <div class="flex flex-col items-end gap-3 flex-shrink-0" onclick="event.stopPropagation()">
              <!-- Icon Radio checked / unchecked -->
              ${
                isSelected
                  ? `<span class="material-symbols-outlined text-carbon-ink text-[24px]">radio_button_checked</span>`
                  : `<span class="material-symbols-outlined text-ash-border text-[24px]">radio_button_unchecked</span>`
              }
              <!-- Nút Sửa: Tích hợp gọi sang AddressManager của address.js -->
              <button type="button" onclick="AddressManager.edit(${addr.addressId})" class="text-[12px] font-label-caps font-bold uppercase tracking-widest text-carbon-ink border-b border-carbon-ink hover:text-secondary hover:border-transparent transition-colors mt-2">Sửa</button>
          </div>
      </div>
    `;
    })
    .join("");
}

// Hàm kích hoạt khi khách click chọn 1 địa chỉ để thanh toán
function selectAddressAndClose(addressId) {
  selectedAddress = userAddresses.find((a) => a.addressId === addressId);
  updateAddressUI(); // Cập nhật lại cái hộp ngoài trang Checkout
  closeAddressSelectionModal();
}

// BẢO VỆ DỮ LIỆU: Cập nhật hàm loadAddresses (Ghi đè hàm cũ trong cart.js)
// Để khi file address.js lưu thành công gọi lại hàm này, nó không làm mất lựa chọn cũ.
async function loadAddresses() {
  if (!AuthUtils.isLoggedIn()) return;
  try {
    userAddresses = await ApiUtils.fetchAPI("/users/addresses/all");
    if (userAddresses && userAddresses.length > 0) {
      // Nếu đã có selectedAddress trước đó, thử tìm xem nó còn tồn tại không
      if (selectedAddress) {
        const stillExists = userAddresses.find(
          (a) => a.addressId === selectedAddress.addressId,
        );
        selectedAddress =
          stillExists ||
          userAddresses.find((a) => a.isDefault || a.default) ||
          userAddresses[0];
      } else {
        selectedAddress =
          userAddresses.find((a) => a.isDefault || a.default) ||
          userAddresses[0];
      }
      updateAddressUI();
      // Nếu popup đang mở, render lại danh sách
      if (
        !document
          .getElementById("address-selection-modal")
          .classList.contains("hidden")
      ) {
        renderAddressSelectionList();
      }
    } else {
      updateAddressUI();
    }
  } catch (e) {
    console.error("Lỗi tải địa chỉ:", e);
  }
}
