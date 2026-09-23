// BƯỚC MỚI: Biến toàn cục lưu danh sách Flash Sale
let activeFlashSaleItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Lấy dữ liệu Flash Sale ngay khi tải trang
  try {
    const flashSaleRes =
      (await typeof ApiUtils) !== "undefined"
        ? await ApiUtils.fetchAPI("/flash-sales/public/active")
        : await (
            await fetch(
              `${AppConfig.API_GATEWAY || "http://localhost:8080/api"}/flash-sales/public/active`,
            )
          ).json();

    if (flashSaleRes && flashSaleRes.items) {
      activeFlashSaleItems = flashSaleRes.items;
    }
  } catch (e) {
    console.warn("Không có chương trình Flash Sale hoặc lỗi mạng:", e);
  }

  // Tải các thành phần khác của trang chủ sau khi đã có dữ liệu Flash Sale
  loadFeaturedCategories();
  loadFeaturedProducts();
  loadTopSellingProducts();

  // Nếu bạn đã thêm hàm loadHomeFlashSale() ở yêu cầu trước, hãy gọi nó ở đây
  if (typeof loadHomeFlashSale === "function") {
    loadHomeFlashSale();
  }
});

function createProductCard(p) {
  // 1. Xử lý giá tiền mặc định
  let salePrice = p.salePrice || 0;
  let basePrice = p.basePrice || 0;

  // BƯỚC MỚI: Kiểm tra Flash Sale và ghi đè giá (Không thay đổi giao diện)
  const flashSaleItem = activeFlashSaleItems.find(
    (item) => item.productId === p.id,
  );
  if (flashSaleItem) {
    salePrice = flashSaleItem.flashSalePrice;
    basePrice = flashSaleItem.originalPrice;
  }

  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(salePrice);

  const basePriceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(basePrice);

  // 2. Xử lý phần trăm giảm giá (Giữ nguyên cấu trúc HTML cũ)
  let discountHtml = "";
  let basePriceHtml = "";
  if (basePrice > salePrice) {
    const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
    basePriceHtml = `<span class="font-body-sm text-body-sm text-on-surface-variant line-through">${basePriceFormatted}</span>`;
    discountHtml = `<span class="text-ember-red font-bold text-[12px]">-${percent}%</span>`;
  }

  // 3. Xử lý dữ liệu an toàn
  const safeName = p.name
    ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
    : "Sản phẩm";
  const safeThumbnail =
    p.thumbnail || "https://placehold.co/400x300?text=No+Image";
  const sku = p.sku || "Đang cập nhật";
  const soldCount = p.sold || 0;

  // 4. Xử lý thẻ trạng thái tồn kho (CÒN HÀNG / HẾT HÀNG)
  let statusHtml = "";
  if (p.stock > 0) {
    statusHtml = `<span class="bg-paper-white/90 backdrop-blur-md text-[#16a34a] font-label-sm text-[10px] px-sm py-1 rounded-full uppercase tracking-widest border border-mist">CÒN HÀNG</span>`;
  } else {
    statusHtml = `<span class="bg-paper-white/90 backdrop-blur-md text-ember-red font-label-sm text-[10px] px-sm py-1 rounded-full uppercase tracking-widest border border-ember-red">HẾT HÀNG</span>`;
  }

  const isBuyable = p.stock > 0 && !p.isPreOrder;
  const cartBtnClass = isBuyable
    ? "bg-carbon-ink text-paper-white hover:opacity-90"
    : "bg-mist text-secondary cursor-not-allowed";
  const cartBtnAction = isBuyable
    ? `onclick="event.stopPropagation(); addToCart(${p.id}, this)"`
    : "disabled";

  // 5. Trả về toàn bộ khối HTML (Bọc trong thẻ <article> - Giao diện gốc)
  return `
      <article class="flex flex-col group cursor-pointer relative h-full" onclick="window.location.href='product_detail.html?id=${p.id}'">
          <div class="absolute top-sm left-sm z-10 flex flex-col gap-xs">
              ${statusHtml}
          </div>
          <div class="aspect-square bg-fog rounded-xl border border-mist overflow-hidden mb-md relative">
              <img class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 mix-blend-multiply opacity-90"
                   alt="${safeName}"
                   src="${safeThumbnail}"
                   onerror="this.src='https://placehold.co/400x300?text=Error'">
          </div>
          <div class="flex flex-col gap-xs flex-grow">
              <div class="flex justify-between items-center">
                  <span class="font-technical-mono text-technical-mono text-on-surface-variant">
                      <span class="text-[12px]" style="color: rgb(96, 101, 98); font-family: Geist;">SKU: ${sku}</span>
                  </span>
                  <span class="font-body-sm text-[12px] text-secondary">Đã bán: ${soldCount}</span>
              </div>
              
              <h3 class="font-body-sm text-[16px] leading-tight text-primary font-semibold mt-xs line-clamp-2" title="${safeName}">
                  ${p.name}
              </h3>
              
              <div class="flex items-baseline gap-sm mt-auto pt-sm">
                  <span class="font-body-lg text-body-lg font-bold text-ember-red">${priceFormatted}</span>
                  ${basePriceHtml}
                  ${discountHtml}
              </div>
              
              <div class="flex items-center gap-sm mt-md pt-sm border-t border-mist">
                  <button ${cartBtnAction} class="flex-grow ${cartBtnClass} font-bold font-body-lg text-[12px] py-sm px-md rounded transition-opacity flex items-center justify-center gap-xs">
                      <span class="material-symbols-outlined" style="font-size: 16px;">shopping_cart</span>
                      Thêm vào giỏ
                  </button>
                  <button onclick="event.stopPropagation(); addToCompare(${p.id}, '${safeName}', '${safeThumbnail}')" class="border border-ash-border text-carbon-ink font-bold font-body-lg text-[12px] py-sm px-md rounded hover:bg-fog transition-colors flex items-center justify-center gap-xs">
                      <span class="material-symbols-outlined" style="font-size: 16px;">compare_arrows</span>
                      So sánh
                  </button>
              </div>
          </div>
      </article>
  `;
}

// ==========================================
// TẢI SẢN PHẨM NỔI BẬT
// ==========================================
async function loadFeaturedProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return;

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/featured`,
    );
    if (response.ok) {
      const products = await response.json();
      container.innerHTML = products.map(createProductCard).join("");
    } else {
      container.innerHTML =
        '<p class="text-on-surface-variant py-8 col-span-full">Chưa có sản phẩm nổi bật nào.</p>';
    }
  } catch (error) {
    console.error("Lỗi tải sản phẩm nổi bật:", error);
  }
}

// ==========================================
// TẢI SẢN PHẨM BÁN CHẠY
// ==========================================
async function loadTopSellingProducts() {
  const container = document.getElementById("best-selling-products");
  if (!container) return;

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/top-selling`,
    );
    if (response.ok) {
      const products = await response.json();
      container.innerHTML = products.map(createProductCard).join("");
    } else {
      container.innerHTML =
        '<p class="text-on-surface-variant py-8 col-span-full">Chưa có sản phẩm bán chạy nào.</p>';
    }
  } catch (error) {
    console.error("Lỗi tải sản phẩm bán chạy:", error);
  }
}

// ==========================================
// TẢI DANH MỤC NỔI BẬT
// ==========================================
function getCategoryStyle(name) {
  const n = name.toLowerCase();
  if (n.includes("laptop")) return { icon: "laptop_mac" };
  if (
    n.includes("điện thoại") ||
    n.includes("phone") ||
    n.includes("smartphone")
  )
    return { icon: "smartphone" };
  if (n.includes("tivi") || n.includes("tv")) return { icon: "tv" };
  if (n.includes("đồng hồ") || n.includes("watch")) return { icon: "watch" };
  return { icon: "grid_view" }; // Mặc định
}

async function loadFeaturedCategories() {
  const container = document.getElementById("featured-categories");
  if (!container) return;

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/featured`,
    );

    if (response.ok) {
      const categories = await response.json();

      container.innerHTML = categories
        .map((cat) => {
          const style = getCategoryStyle(cat.name);

          // Trả về đúng thiết kế icon thanh mảnh của trang chủ mới
          return `
          <a class="group block" href="products.html?category=${cat.id}">
              <div class="aspect-square bg-fog rounded-xl flex items-center justify-center p-xl mb-md border border-transparent group-hover:border-carbon-ink transition-colors duration-300">
                  <span class="material-symbols-outlined text-6xl text-surface-tint group-hover:text-carbon-ink transition-colors" style='font-variation-settings: "wght" 200;'>${style.icon}</span>
              </div>
              <h3 class="font-label-caps text-label-caps text-center text-carbon-ink uppercase tracking-wider">${cat.name}</h3>
          </a>
        `;
        })
        .join("");
    }
  } catch (error) {
    console.error("Lỗi tải danh mục:", error);
  }
}

// ==========================================
// TẢI SẢN PHẨM FLASH SALE (CHO TRANG CHỦ)
// ==========================================
let homeFlashSaleTimer = null;

async function loadHomeFlashSale() {
  const grid = document.getElementById("home-flash-sale-grid");
  if (!grid) return;

  try {
    const response = await ApiUtils.fetchAPI("/flash-sales/public/active");

    if (
      !response ||
      typeof response === "string" ||
      !response.items ||
      response.items.length === 0
    ) {
      grid.innerHTML =
        '<p class="col-span-full text-center py-lg font-body-lg text-graphite">Hiện không có chương trình Flash Sale nào diễn ra.</p>';
      return;
    }

    // 1. Chạy bộ đếm ngược
    startHomeCountdown(response.endTime);

    // 2. Lấy tối đa 4 sản phẩm để hiển thị trên trang chủ
    const top4Items = response.items.slice(0, 4);

    // 3. Render danh sách sản phẩm bằng giao diện của flash_sale_2.js
    grid.innerHTML = top4Items
      .map((item) => {
        const productName = item.productName || "Sản phẩm Flash Sale";
        const originalPrice = item.originalPrice || 0;
        const flashSalePrice = item.flashSalePrice || 0;
        const imageUrl =
          item.thumbnail || "https://placehold.co/400x400?text=No+Image";

        const discountPercent =
          originalPrice > 0
            ? Math.round(
                ((originalPrice - flashSalePrice) / originalPrice) * 100,
              )
            : 0;
        const soldQty = item.soldQuantity || 0;
        const totalQty = item.allocatedQuantity || 1;
        const soldPercent = Math.min(
          100,
          Math.round((soldQty / totalQty) * 100),
        );

        // Xử lý định dạng tiền tệ
        const priceFormatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(flashSalePrice);
        const originalPriceFormatted = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(originalPrice);

        return `
      <article class="bg-paper-white border border-mist rounded-lg overflow-hidden flex flex-col group relative hover:border-ember-red transition-colors duration-300">
          <div class="absolute top-sm left-sm bg-ember-red text-paper-white font-label-caps text-label-sm px-sm py-xs z-10 rounded-full">
              -${discountPercent}%
          </div>
          
          <div onclick="window.location.href='product_detail.html?id=${item.productId}'" class="aspect-square bg-white border-b border-mist flex items-center justify-center p-lg relative overflow-hidden cursor-pointer">
              <img alt="${productName}" class="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500 mix-blend-multiply" src="${imageUrl}" />
          </div>
          
          <div class="p-md flex flex-col flex-grow">
              <h3 onclick="window.location.href='product_detail.html?id=${item.productId}'" class="font-body-sm text-[16px] leading-tight text-primary font-semibold mt-xs line-clamp-2 cursor-pointer hover:text-ember-red transition-colors">
                  ${productName}
              </h3>
              
              <div class="flex items-baseline gap-sm mb-md mt-auto">
                  <span class="font-body-lg text-body-lg font-bold text-ember-red">${priceFormatted}</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant line-through">${originalPriceFormatted}</span>
              </div>
              <div class="w-full bg-fog h-xs mb-sm rounded-full overflow-hidden">
                  <div class="bg-ember-red h-full transition-all duration-1000" style="width: ${soldPercent}%"></div>
              </div>
              <div class="font-label-caps text-label-sm text-graphite mb-md text-right">ĐÃ BÁN ${soldQty} CHIẾC</div>
              
              <button onclick="buyNowFlashSale(event, ${item.productId})" class="w-full border border-carbon-ink text-carbon-ink font-label-caps text-label-caps py-sm rounded hover:bg-ember-red hover:border-ember-red hover:text-paper-white transition-colors uppercase">
                  MUA NGAY
              </button>
          </div>
      </article>`;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi khi tải Flash Sale cho trang chủ:", error);
    grid.innerHTML =
      '<p class="col-span-full text-center py-lg font-body-lg text-graphite">Đã xảy ra lỗi khi tải dữ liệu.</p>';
  }
}

// Hàm chạy bộ đếm ngược cho trang chủ
function startHomeCountdown(endTimeStr) {
  const timerElement = document.getElementById("home-countdown-timer");
  if (!timerElement) return;

  if (homeFlashSaleTimer) clearInterval(homeFlashSaleTimer);
  const endTime = new Date(endTimeStr).getTime();

  homeFlashSaleTimer = setInterval(() => {
    const now = new Date().getTime();
    const distance = endTime - now;

    if (distance < 0) {
      clearInterval(homeFlashSaleTimer);
      timerElement.textContent = "00:00:00";
      return;
    }

    const hours =
      Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) +
      Math.floor(distance / (1000 * 60 * 60 * 24)) * 24;
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const h = String(hours).padStart(2, "0");
    const m = String(minutes).padStart(2, "0");
    const s = String(seconds).padStart(2, "0");
    timerElement.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

// ==========================================
// HÀM MUA NGAY TRỰC TIẾP TỪ FLASH SALE (Dùng chung cho Trang Chủ)
// ==========================================
async function buyNowFlashSale(event, productId) {
  if (event) event.stopPropagation();

  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px] align-middle">progress_activity</span> Đang xử lý...`;

  try {
    const payload = {
      productId: parseInt(productId),
      quantity: 1,
      selectedColor: null,
    };

    const cartRes = await ApiUtils.fetchAPI("/cart/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const addedItem = cartRes.items.find(
      (i) => i.productId === payload.productId,
    );

    if (addedItem) {
      await ApiUtils.fetchAPI("/cart/select-all?isSelected=false", {
        method: "PUT",
      });
      await ApiUtils.fetchAPI(
        `/cart/item/${addedItem.id}?quantity=1&isSelected=true`,
        { method: "PUT" },
      );
    }

    window.location.href = "checkout.html";
  } catch (error) {
    console.error("Lỗi khi mua ngay:", error);
    alert(
      error.message ||
        "Không thể thực hiện mua hàng lúc này. Vui lòng thử lại!",
    );
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
// ==========================================
// THÊM SẢN PHẨM VÀO GIỎ HÀNG (TỪ TRANG CHỦ)
// ==========================================
async function addToCart(productId, btn) {
  // Lưu lại nội dung gốc của nút bấm để khôi phục sau
  const originalText = btn.innerHTML;

  // Vô hiệu hóa nút và hiển thị hiệu ứng xoay (loading)
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px] align-middle">progress_activity</span>`;

  try {
    // Gói dữ liệu gửi lên Backend (mặc định thêm 1 chiếc, không chọn màu cụ thể)
    const payload = {
      productId: parseInt(productId),
      quantity: 1,
      selectedColor: null,
    };

    // Gọi API thêm vào giỏ hàng
    await ApiUtils.fetchAPI("/cart/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Thông báo thành công
    alert("Đã thêm sản phẩm vào giỏ hàng!");

    // Cập nhật lại số lượng hiển thị trên biểu tượng giỏ hàng ở Header
    if (typeof HeaderLogic !== "undefined") {
      HeaderLogic.updateCartBadge();
    }
  } catch (error) {
    console.error("Lỗi thêm vào giỏ:", error);
    alert(error.message || "Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
  } finally {
    // Khôi phục lại trạng thái ban đầu của nút bấm
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
