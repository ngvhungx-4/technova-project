document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (productId) {
    loadProductDetail(productId);
    loadProductReviews(productId);
    loadRelatedProducts(productId);
  } else {
    alert("Không tìm thấy ID sản phẩm");
    window.location.href = "products.html";
  }
});

async function loadProductDetail(id) {
  try {
    // Gọi API lấy chi tiết
    const response = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`);
    if (!response.ok) throw new Error("Lỗi tải sản phẩm");

    const p = await response.json();

    // ĐIỀN THÔNG TIN CƠ BẢN
    document.title = `${p.name} | TechNova`;

    // ==========================================
    // CẤU HÌNH BREADCRUMB (4 CẤP LẤY TỪ API)
    // ==========================================
    const breadcrumbPaths = [];
    const catId = p.categoryId || (p.category && p.category.id);

    if (catId) {
      try {
        // Gọi API để lấy chi tiết danh mục (bao gồm danh mục cha)
        const catResponse = await fetch(
          `${AppConfig.PRODUCT_API_URL}/categories/${catId}`,
        );
        if (catResponse.ok) {
          const catData = await catResponse.json();
          const category = catData.data || catData; // Xử lý bọc data tùy API của bạn

          // 1. Thêm Danh mục cha (nếu có)
          if (category.parent) {
            breadcrumbPaths.push({
              label: category.parent.name,
              url: `products.html?categoryId=${category.parent.id}`,
            });
          }

          // 2. Thêm Danh mục con
          breadcrumbPaths.push({
            label: category.name || p.categoryName,
            url: `products.html?categoryId=${category.id}`,
          });
        } else {
          // Fallback: Nếu API danh mục lỗi, vẫn hiển thị danh mục con
          breadcrumbPaths.push({
            label: p.categoryName || "Danh mục",
            url: `products.html?categoryId=${catId}`,
          });
        }
      } catch (error) {
        console.warn("Lỗi tải chi tiết danh mục:", error);
        // Fallback: Khi có lỗi mạng
        breadcrumbPaths.push({
          label: p.categoryName || "Danh mục",
          url: `products.html?categoryId=${catId}`,
        });
      }
    }

    // 3. Thêm Sản phẩm cụ thể (Cấp cuối cùng)
    breadcrumbPaths.push({
      label: p.name,
      url: null, // null vì đây là trang hiện tại
    });

    // 4. Vẽ giao diện Breadcrumb
    if (typeof UIUtils !== "undefined" && UIUtils.renderBreadcrumb) {
      UIUtils.renderBreadcrumb("breadcrumb-container", breadcrumbPaths);
    }

    // Info
    setText("p-name", p.name);
    setText("p-sku", `SKU: ${p.sku || "Đang cập nhật"}`);
    setText("p-sold", `Đã bán ${p.sold || 0}`);

    const stockStatusEl = document.getElementById("p-stock-status");
    if (stockStatusEl) {
      if (p.stock > 0) {
        // Trạng thái CÒN HÀNG (Sử dụng chấm đen True Black chuẩn Peak Design)
        stockStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#16a34a] inline-block"></span> Còn hàng (Sẵn sàng giao)`;
        stockStatusEl.className =
          "text-[#16a34a] flex items-center gap-1 font-semibold";
      } else {
        // Trạng thái HẾT HÀNG (Sử dụng màu Ember Red để cảnh báo)
        stockStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-ember-red inline-block"></span> Tạm hết hàng`;
        stockStatusEl.className =
          "text-ember-red flex items-center gap-1 font-semibold";
      }
    }
    const brandEl = document.getElementById("p-brand");

    // Lấy giá trị từ key "brand" trong specs
    const brandValue = p.specs ? p.specs["brand"] : null;

    if (brandEl) {
      if (brandValue) {
        brandEl.innerText = brandValue;
        brandEl.parentElement.classList.remove("hidden");
      } else {
        brandEl.parentElement.classList.add("hidden");
      }
    }

    // ==========================================
    // XỬ LÝ GIÁ BÁN & KIỂM TRA FLASH SALE
    // ==========================================
    let salePrice = p.salePrice || 0;
    let basePrice = p.basePrice || 0;

    // Gọi API để kiểm tra xem có Flash Sale đang diễn ra không
    try {
      const flashSaleRes =
        (await typeof ApiUtils) !== "undefined"
          ? await ApiUtils.fetchAPI("/flash-sales/public/active")
          : await (
              await fetch(
                `${AppConfig.API_GATEWAY || "http://localhost:8080/api"}/flash-sales/public/active`,
              )
            ).json();

      // Nếu có dữ liệu Flash Sale
      if (flashSaleRes && flashSaleRes.items) {
        // Tìm xem sản phẩm hiện tại có nằm trong list Flash Sale không
        const currentId = parseInt(id);
        const flashSaleItem = flashSaleRes.items.find(
          (item) => item.productId === currentId,
        );

        if (flashSaleItem) {
          // KIỂM TRA SỐ LƯỢNG SUẤT FLASH SALE
          const isFlashSaleSoldOut =
            (flashSaleItem.soldQuantity || 0) >=
            (flashSaleItem.allocatedQuantity || 1);

          if (!isFlashSaleSoldOut) {
            console.log("Sản phẩm này đang trong Flash Sale!", flashSaleItem);
            // Ghi đè giá hiển thị bằng giá Flash Sale nếu chưa hết suất
            salePrice = flashSaleItem.flashSalePrice;
            basePrice = flashSaleItem.originalPrice; // Giá gốc ban đầu

            // HIỂN THỊ THẺ FLASH SALE: Xóa class 'hidden' để thẻ hiện ra
            const flashSaleBadge = document.getElementById("flash-sale-badge");
            if (flashSaleBadge) {
              flashSaleBadge.classList.remove("hidden");
            }
          }
        }
      }
    } catch (e) {
      console.warn(
        "Không thể kiểm tra dữ liệu Flash Sale hoặc không có chương trình nào diễn ra:",
        e,
      );
    }

    // Hiển thị giá lên giao diện
    setText("p-sale-price", formatCurrency(salePrice));

    const basePriceEl = document.getElementById("p-base-price");
    const discountEl = document.getElementById("p-discount-badge");

    if (basePrice > salePrice) {
      basePriceEl.innerText = formatCurrency(basePrice);
      basePriceEl.classList.remove("hidden");

      // Công thức tính phần trăm giảm giá chuẩn
      const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
      discountEl.innerText = `-${percent}%`;
      discountEl.classList.remove("hidden");
    } else {
      basePriceEl.classList.add("hidden");
      discountEl.classList.add("hidden");
    }

    // XỬ LÝ ẢNH
    const allImages = [p.thumbnail, ...(p.images || [])].filter(
      (img) => img && img.trim() !== "",
    );
    if (allImages.length > 0) {
      document.getElementById("main-image").src = allImages[0];

      const galleryContainer = document.getElementById("gallery-list");

      // Cập nhật class: Thêm 'shrink-0', 'w-20' hoặc 'w-24' và 'snap-start'
      const activeThumbClass =
        "aspect-square w-[calc((100%-32px)/5)] shrink-0 bg-surface-container-lowest border-2 border-carbon-ink overflow-hidden p-2 thumbnail-btn active snap-start";
      const inactiveThumbClass =
        "aspect-square w-[calc((100%-32px)/5)] shrink-0 bg-surface-container-lowest border border-mist hover:border-graphite transition-colors overflow-hidden p-2 thumbnail-btn snap-start";

      galleryContainer.innerHTML = allImages
        .map(
          (img, index) => `
    <button class="${index === 0 ? activeThumbClass : inactiveThumbClass}" onclick="changeMainImage('${img}', this)">
        <img class="w-full h-full object-contain mix-blend-multiply" src="${img}" alt="Thumbnail ${index + 1}">
    </button>
`,
        )
        .join("");
    }

    // XỬ LÝ MÀU SẮC
    const colorWrapper = document.getElementById("color-section");
    const colorContainer = document.getElementById("color-options-container");

    const validColors = (p.colors || []).filter(
      (c) => c.colorName && c.colorName.trim() !== "",
    );

    if (validColors.length > 0) {
      if (colorWrapper) colorWrapper.classList.remove("hidden");

      if (colorContainer) {
        colorContainer.innerHTML = validColors
          .map(
            (c, index) => `
    <label class="cursor-pointer group">
        <input ${index === 0 ? "checked" : ""} class="peer sr-only" name="color-choice" type="radio" value="${c.colorName}" onchange="document.getElementById('selected-color-name').textContent = '${c.colorName}'">
        <div class="flex flex-col items-center gap-xs p-1 border border-ash-border bg-surface-container-lowest rounded font-body-sm text-body-sm peer-checked:border-2 peer-checked:border-carbon-ink hover:border-graphite transition-colors w-24 h-full">
            <div class="aspect-square w-full bg-fog rounded overflow-hidden">
                <img alt="${c.colorName}" class="w-full h-full object-contain mix-blend-multiply" src="${c.colorImageUrl || "https://placehold.co/50?text=Color"}" onerror="this.src='https://placehold.co/50?text=No+Img'"/>
            </div>
            <span class="text-[10px] uppercase tracking-widest peer-checked:font-bold peer-checked:font-body-lg text-center mt-auto">
                ${c.colorName}
            </span>
        </div>
    </label>
`,
          )
          .join("");

        const selectedColorNameEl = document.getElementById(
          "selected-color-name",
        );
        if (selectedColorNameEl)
          selectedColorNameEl.innerText = validColors[0].colorName;
      }
    } else {
      if (colorWrapper) colorWrapper.classList.add("hidden");
    }

    // XỬ LÝ THÔNG SỐ KỸ THUẬT (CẬP NHẬT THEO THIẾT KẾ MỚI)
    if (p.specs) {
      const config = p.categoryConfig || { highlights: [], labels: {} };
      const labels = config.labels || {};
      const highlights = config.highlights || [];

      const getLabel = (key) => {
        if (labels[key]) return labels[key];
        return formatKey(key);
      };

      // RENDER TÓM TẮT THÔNG SỐ KỸ THUẬT
      const summaryContainer = document.getElementById("specs-summary-list");
      let summaryKeys =
        highlights.length > 0 ? highlights : Object.keys(p.specs).slice(0, 6);

      if (summaryContainer) {
        summaryContainer.innerHTML = summaryKeys
          .map((key, index) => {
            const value = p.specs[key];
            if (!value) return "";
            return `
            <tr class="hover:bg-fog transition-colors">
                <td class="py-md px-lg bg-surface-container-low w-1/3 font-body-lg text-[16px] font-bold uppercase text-graphite">${getLabel(key)}</td>
                <td class="py-md px-lg font-body-lg font-medium text-carbon-ink">${formatSpecValue(value)}</td>
            </tr>
        `;
          })
          .join("");
      }

      // RENDER CHI TIẾT (Cho Popup Modal)
      const detailContainer = document.getElementById("specs-detail-list");
      if (detailContainer) {
        const allKeys = Object.keys(p.specs);

        detailContainer.innerHTML = allKeys
          .map((key, index) => {
            // Thay đổi sang màu nền sáng xen kẽ (bg-fog) và viền mảnh (border-mist)
            const bgClass = index % 2 !== 0 ? "bg-fog" : "bg-transparent";
            return `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 ${bgClass} border-b border-mist last:border-0 rounded-lg">
                        <div class="md:col-span-1 font-body-sm text-graphite font-medium">
                            ${getLabel(key)}
                        </div>
                        <div class="md:col-span-2 font-body-base text-carbon-ink leading-relaxed">
                            ${formatSpecValue(p.specs[key])}
                        </div>
                    </div>
                `;
          })
          .join("");
      }

      // GẮN SỰ KIỆN CLICK CHO POPUP THÔNG SỐ
      const btnShowSpecs = document.getElementById("btn-show-specs");
      const btnCloseSpecs = document.getElementById("btn-close-specs");
      const overlaySpecs = document.getElementById("specs-modal-overlay");

      if (btnShowSpecs) btnShowSpecs.onclick = openSpecsModal;
      if (btnCloseSpecs) btnCloseSpecs.onclick = closeSpecsModal;
      if (overlaySpecs) overlaySpecs.onclick = closeSpecsModal; // Bấm ra ngoài (nền đen) sẽ đóng
    }

    // GẮN SỰ KIỆN NÚT MUA
    const actionContainer = document.getElementById("product-action-buttons");

    if (actionContainer) {
      const isBuyable = p.stock > 0 && !p.isPreOrder;

      // Xử lý chuỗi an toàn cho hàm so sánh
      const safeName = p.name
        ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
        : "Sản phẩm";
      const safeThumbnail =
        p.thumbnail || "https://placehold.co/400x300?text=No+Image";

      if (!isBuyable) {
        // TRẠNG THÁI HẾT HÀNG / ĐẶT TRƯỚC
        const statusText = p.isPreOrder ? "Hàng đặt trước" : "Tạm hết hàng";

        actionContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-sm">
                <button disabled class="bg-[#2f2f33] text-gray-400 py-md font-body-lg text-body-lg font-bold uppercase rounded text-center cursor-not-allowed">
                    ${statusText}
                </button>
                <button onclick="addToCompare(${p.id}, '${safeName}', '${safeThumbnail}')" class="bg-surface-container-lowest border border-ash-border text-on-surface-variant py-md font-body-lg text-body-lg font-bold uppercase rounded text-center hover:border-carbon-ink hover:text-carbon-ink transition-colors flex justify-center items-center gap-xs">
                    <span class="material-symbols-outlined text-[18px]">compare_arrows</span>
                    So sánh
                </button>
            </div>
        `;
      } else {
        // TRẠNG THÁI CÒN HÀNG (Hiển thị cả nút Thêm giỏ và Mua ngay)
        actionContainer.innerHTML = `
            <button id="btn-add-cart" onclick="addToCart(${p.id}, false)" class="w-full bg-carbon-ink text-paper-white py-md font-body-lg text-body-lg font-bold uppercase rounded text-center hover:bg-obsidian transition-colors flex justify-center items-center gap-sm">
                <span class="material-symbols-outlined">shopping_cart</span>
                Thêm vào giỏ
            </button>
            <div class="grid grid-cols-2 gap-sm">
                <button id="btn-buy-now" onclick="addToCart(${p.id}, true)" class="bg-surface-container-lowest border border-carbon-ink text-carbon-ink py-md font-body-lg text-body-lg font-bold uppercase rounded text-center hover:bg-fog transition-colors">
                    Mua ngay
                </button>
                <button onclick="addToCompare(${p.id}, '${safeName}', '${safeThumbnail}')" class="bg-surface-container-lowest border border-ash-border text-on-surface-variant py-md font-body-lg text-body-lg font-bold uppercase rounded text-center hover:border-carbon-ink hover:text-carbon-ink transition-colors flex justify-center items-center gap-xs">
                    <span class="material-symbols-outlined text-[18px]">compare_arrows</span>
                    So sánh
                </button>
            </div>
        `;
      }
    }
    const btnCompare = document.getElementById("btn-add-compare");
    if (btnCompare) {
      // Xử lý chuỗi để tránh lỗi khi tên có dấu nháy
      const safeName = p.name
        ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
        : "Sản phẩm";
      const safeThumbnail =
        p.thumbnail || "https://placehold.co/400x300?text=No+Image";

      btnCompare.onclick = () => {
        // Hàm addToCompare đã được định nghĩa trong compare.js
        addToCompare(p.id, safeName, safeThumbnail);
      };
    }
  } catch (error) {
    console.error(error);
    alert("Có lỗi xảy ra khi tải dữ liệu sản phẩm.");
  }
}

// CÁC HÀM TIỆN ÍCH (UTILITIES)

function changeMainImage(src, btn) {
  // 1. Cập nhật đường dẫn ảnh cho khung hiển thị chính
  document.getElementById("main-image").src = src;

  // 2. Tìm tất cả các nút ảnh con (thumbnail)
  document.querySelectorAll(".thumbnail-btn").forEach((el) => {
    // Xóa trạng thái "đang chọn" (viền xanh, dày)
    el.classList.remove("border-2", "border-primary-container", "active");
    // Trả về trạng thái "bình thường" (viền xám mỏng)
    el.classList.add("border", "border-white/10", "hover:border-white/30");
  });

  // 3. Áp dụng trạng thái "đang chọn" riêng cho nút vừa được click
  btn.classList.remove("border", "border-white/10", "hover:border-white/30");
  btn.classList.add("border-2", "border-primary-container", "active");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function formatCurrency(val) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
}

// Hàm formatKey được nâng cấp để viết hoa chữ cái đầu cho giống thiết kế
function formatKey(key) {
  if (!key) return "";
  const formatted = key.replace(/_/g, " ");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

// Hàm formatSpecValue được nâng cấp để tự động xử lý mảng và dấu xuống dòng (\n)
const formatSpecValue = (value) => {
  if (!value) return "";

  // Xử lý nếu dữ liệu từ API là dạng Mảng (Array)
  if (Array.isArray(value)) {
    return value.join("<br>");
  }

  if (typeof value !== "string") return value;

  // Xử lý nếu chuỗi có chứa ký tự xuống dòng (\n)
  if (value.includes("\n")) {
    return value.replace(/\n/g, "<br>");
  }

  // Tách bằng dấu phẩy (bỏ qua dấu phẩy nằm trong ngoặc đơn)
  const parts = value.split(/,(?![^(]*\))/);
  if (parts.length > 1) {
    return parts
      .map((part) => part.trim())
      .filter((part) => part)
      .join("<br>");
  }

  return value;
};

// THÊM VÀO GIỎ HÀNG & MUA NGAY (HỖ TRỢ KHÁCH VÃNG LAI)
async function addToCart(productId, buyNow) {
  // 1. Kiểm tra màu sắc (nếu có)
  const selectedColorInput = document.querySelector(
    'input[name="color-choice"]:checked',
  );
  const colorName = selectedColorInput ? selectedColorInput.value : null;

  const hasColorOptions =
    document.querySelectorAll('input[name="color-choice"]').length > 0;
  if (hasColorOptions && !colorName) {
    alert("Vui lòng chọn màu sắc sản phẩm!");
    const colorSection = document.getElementById("color-section");
    if (colorSection)
      colorSection.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 2. Lấy số lượng
  const quantityInput = document.getElementById("quantity");
  let quantity = 1;
  if (quantityInput) {
    quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
  }

  // 3. UI Loading
  const btnId = buyNow ? "btn-buy-now" : "btn-add-cart";
  const btn = document.getElementById(btnId);
  let originalText = "";

  if (btn) {
    originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Đang xử lý...`;
  }

  try {
    const payload = {
      productId: parseInt(productId),
      quantity: quantity,
      selectedColor: colorName,
    };

    // 4. Gọi API thêm vào giỏ
    const cartRes = await ApiUtils.fetchAPI("/cart/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // 5. Xử lý sau khi thêm thành công
    if (buyNow) {
      // Chỉ chọn duy nhất sản phẩm này để thanh toán
      const addedItem = cartRes.items.find(
        (i) =>
          i.productId === payload.productId &&
          (i.selectedColor === payload.selectedColor ||
            String(i.selectedColor) === String(payload.selectedColor)),
      );

      if (addedItem) {
        // Bỏ chọn tất cả sản phẩm cũ trong giỏ
        await ApiUtils.fetchAPI("/cart/select-all?isSelected=false", {
          method: "PUT",
        });

        // BƯỚC SỬA LỖI: Lấy chính xác số lượng người dùng vừa nhập (payload.quantity) để đè lên số lượng bị cộng dồn
        await ApiUtils.fetchAPI(
          `/cart/item/${addedItem.id}?quantity=${payload.quantity}&isSelected=true`,
          { method: "PUT" },
        );
      }

      // Chuyển thẳng tới trang thanh toán
      window.location.href = "checkout.html";
    } else {
      // Nếu bấm "Thêm vào giỏ", hiện thông báo và cập nhật số lượng trên Header
      alert("Đã thêm sản phẩm vào giỏ hàng!");
      if (typeof HeaderLogic !== "undefined") {
        HeaderLogic.updateCartBadge();
      }
    }
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    alert(error.message || "Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
  } finally {
    // 6. Khôi phục lại trạng thái nút
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// XỬ LÝ ĐÁNH GIÁ (REVIEWS)
let allReviewsData = [];
let displayedReviewsCount = 0;
const REVIEWS_PER_PAGE = 3;

const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + " tuần trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

const generateStarsHTML = (rating) => {
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      starsHtml += `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">star</span>`;
    } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
      starsHtml += `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">star_half</span>`;
    } else {
      starsHtml += `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 0;">star</span>`;
    }
  }
  return starsHtml;
};

// TẢI VÀ TÍNH TOÁN DỮ LIỆU
async function loadProductReviews(productId) {
  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/${productId}/reviews`,
    );
    if (!response.ok) throw new Error("Lỗi tải đánh giá");

    allReviewsData = await response.json();

    // 1. LUÔN LUÔN VẼ BẢNG THỐNG KÊ (Dù có đánh giá hay không)
    renderReviewStats();

    // 2. XỬ LÝ HIỂN THỊ DANH SÁCH CHI TIẾT
    if (allReviewsData.length === 0) {
      // Nếu không có, chỉ hiển thị thông báo ở phần danh sách
      document.getElementById("reviews-list-container").innerHTML =
        `<p class="text-gray-500 italic text-center py-6">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên đánh giá!</p>`;

      // Ẩn nút "Xem thêm"
      const loadMoreContainer = document.getElementById("load-more-container");
      if (loadMoreContainer) loadMoreContainer.classList.add("hidden");

      return;
    }

    // Nếu có dữ liệu, hiển thị danh sách
    displayedReviewsCount = 0;
    document.getElementById("reviews-list-container").innerHTML = "";
    loadMoreReviews();
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById("reviews-list-container").innerHTML =
      `<p class="text-red-500 text-center">Không thể tải đánh giá lúc này.</p>`;
  }
}

// RENDER KHỐI THỐNG KÊ
function renderReviewStats() {
  const totalReviews = allReviewsData.length;
  let sumRating = 0;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  allReviewsData.forEach((rev) => {
    sumRating += rev.rating;
    if (starCounts[rev.rating] !== undefined) starCounts[rev.rating]++;
  });
  const averageRating =
    totalReviews === 0 ? "0.0" : (sumRating / totalReviews).toFixed(1);

  // Điền phần đỉnh trang
  setText("p-rating-score", averageRating);
  setText("p-review-count", `(${totalReviews} đánh giá)`);
  document.getElementById("p-rating-stars").innerHTML = generateStarsHTML(
    parseFloat(averageRating),
  );

  // Điền khối chi tiết
  let progressBarsHtml = "";
  for (let i = 5; i >= 1; i--) {
    const percent =
      totalReviews === 0 ? 0 : Math.round((starCounts[i] / totalReviews) * 100);
    progressBarsHtml += `
            <div class="flex items-center gap-md">
                <span class="font-body-lg text-[16px] font-bold w-4">${i}</span>
                <div class="flex-1 h-1 bg-mist rounded-full overflow-hidden">
                    <div class="h-full bg-carbon-ink" style="width: ${percent}%"></div>
                </div>
                <span class="font-body-sm text-graphite w-8 text-right">${starCounts[i]}</span>
            </div>
        `;
  }

  document.getElementById("review-stats-container").innerHTML = `
        <div class="flex items-center gap-md">
            <span class="text-[64px] font-body-lg font-bold leading-none">${averageRating}</span>
            <div class="flex flex-col">
                <div class="flex text-primary-container mb-1">
                    ${generateStarsHTML(parseFloat(averageRating))}
                </div>
                <span class="font-body-lg text-[16px] text-graphite">Dựa trên ${totalReviews} đánh giá</span>
            </div>
        </div>
        <div class="flex flex-col gap-sm">
            ${progressBarsHtml}
        </div>
    `;
  const tabReviewCount = document.getElementById("tab-review-count-title");
  if (tabReviewCount) {
    tabReviewCount.innerText = totalReviews;
  }
}

function loadMoreReviews() {
  const listContainer = document.getElementById("reviews-list-container");
  const loadMoreContainer = document.getElementById("load-more-container");
  const btnLoadMore = document.getElementById("btn-load-more");

  // Thoát ngay nếu không có chỗ để chứa đánh giá
  if (!listContainer) return;

  const nextCount = Math.min(
    displayedReviewsCount + REVIEWS_PER_PAGE,
    allReviewsData.length,
  );
  const reviewsToRender = allReviewsData.slice(
    displayedReviewsCount,
    nextCount,
  );

  reviewsToRender.forEach((review) => {
    const reviewHtml = `
            <div class="py-lg mb-lg last:border-0 last:mb-0 last:pb-0">
                <div class="flex justify-between items-start mb-sm">
                    <div class="flex flex-col">
                        <div class="flex text-primary-container mb-1">
                            ${generateStarsHTML(review.rating)}
                        </div>
                        <h4 class="font-bold text-body-lg text-carbon-ink">${review.comment}</h4>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-body-sm text-carbon-ink">${review.reviewerName || "Khách hàng"}</p>
                        <p class="text-body-sm text-graphite">${timeAgo(review.createdAt)}</p>
                    </div>
                </div>

            </div>
        `;
    listContainer.insertAdjacentHTML("beforeend", reviewHtml);
  });

  displayedReviewsCount = nextCount;
  const remaining = allReviewsData.length - displayedReviewsCount;

  // KIỂM TRA AN TOÀN TRƯỚC KHI THAO TÁC CLASSLIST
  if (loadMoreContainer && btnLoadMore) {
    if (remaining > 0) {
      loadMoreContainer.classList.remove("hidden");
      btnLoadMore.innerText = `Xem thêm ${remaining} đánh giá`;
      btnLoadMore.onclick = loadMoreReviews;
    } else {
      loadMoreContainer.classList.add("hidden");
    }
  }
}
// 1. HÀM RENDER THẺ SẢN PHẨM BẠN CUNG CẤP
function renderProductCard(p, container) {
  // Xử lý giá tiền
  const salePrice = p.salePrice || 0;
  const basePrice = p.basePrice || 0;

  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(salePrice);

  const basePriceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(basePrice);

  // Xử lý phần trăm giảm giá
  let discountHtml = "";
  let basePriceHtml = "";
  if (basePrice > salePrice) {
    const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
    basePriceHtml = `<span class="font-body-sm text-body-sm text-on-surface-variant line-through">${basePriceFormatted}</span>`;
    discountHtml = `<span class="text-ember-red font-bold text-[12px]">-${percent}%</span>`;
  }

  // Xử lý dữ liệu an toàn
  const safeName = p.name
    ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
    : "Sản phẩm";
  const safeThumbnail =
    p.thumbnail || "https://placehold.co/400x300?text=No+Image";
  const sku = p.sku || "Đang cập nhật";
  const soldCount = p.sold || 0;

  // Xử lý thẻ trạng thái tồn kho (CÒN HÀNG / HẾT HÀNG)
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

  // Tạo thẻ Article
  const card = document.createElement("article");
  card.className =
    "flex flex-col group cursor-pointer relative h-full shrink-0 snap-start w-full md:w-[calc((100%-24px)/2)] lg:w-[calc((100%-72px)/4)]";

  card.onclick = () =>
    (window.location.href = `product_detail.html?id=${p.id}`);

  // Đổ HTML vào thẻ
  // 7. Đổ HTML vào thẻ
  card.innerHTML = `
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
          
          <!-- Đã thêm class min-h-[40px] vào thẻ h3 bên dưới để giữ chiều cao luôn bằng 2 dòng -->
          <h3 class="font-body-sm text-[16px] leading-tight text-primary font-semibold mt-xs line-clamp-2 min-h-[40px]" title="${safeName}">
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
  `;

  if (container) container.appendChild(card);
}

// 2. CẬP NHẬT HÀM TẢI SẢN PHẨM LIÊN QUAN
async function loadRelatedProducts(productId) {
  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/${productId}/related`,
    );
    if (response.ok) {
      const products = await response.json();
      const container = document.getElementById("related-products");

      if (products.length > 0 && container) {
        // Xóa nội dung tĩnh cũ trước khi chèn thẻ mới
        container.innerHTML = "";

        // Lấy 4 sản phẩm và đưa qua hàm renderProductCard
        products.slice(0, 10).forEach((p) => {
          renderProductCard(p, container);
        });
      }
    }
  } catch (e) {
    console.error("Lỗi khi tải sản phẩm liên quan: ", e);
  }
}

// ==========================================
// LOGIC POPUP THÔNG SỐ KỸ THUẬT
// ==========================================

function openSpecsModal() {
  const modal = document.getElementById("specs-modal");
  const content = document.getElementById("specs-modal-content");
  if (!modal) return;

  // Xóa class 'hidden' để modal xuất hiện trong DOM
  modal.classList.remove("hidden");

  // Dùng setTimeout nhỏ để hiệu ứng mờ (opacity) và phóng to (scale) kịp kích hoạt
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    content.classList.remove("scale-95");
  }, 10);

  // Khóa thanh cuộn của trang web
  document.body.style.overflow = "hidden";
}

function closeSpecsModal() {
  const modal = document.getElementById("specs-modal");
  const content = document.getElementById("specs-modal-content");
  if (!modal) return;

  // Kích hoạt hiệu ứng ẩn mờ đi
  modal.classList.add("opacity-0");
  content.classList.add("scale-95");

  // Đợi 300ms (bằng thời gian transition-duration) rồi mới gỡ thẻ khỏi giao diện
  setTimeout(() => {
    modal.classList.add("hidden");
    // Mở khóa lại thanh cuộn
    document.body.style.overflow = "";
  }, 300);
}

// ==========================================
// LOGIC CHUYỂN TAB (THÔNG SỐ / ĐÁNH GIÁ)
// ==========================================
function switchTab(tabName) {
  // 1. Lấy các nút bấm (buttons)
  const btnSpecs = document.getElementById("tab-btn-specs");
  const btnReviews = document.getElementById("tab-btn-reviews");

  // 2. Lấy các khối nội dung (contents)
  const contentSpecs = document.getElementById("tab-content-specs");
  const contentReviews = document.getElementById("tab-content-reviews");

  if (tabName === "specs") {
    // Hiện nội dung Thông số, ẩn Đánh giá
    contentSpecs.classList.remove("hidden");
    contentReviews.classList.add("hidden");

    // Làm nổi bật nút Thông số, làm mờ nút Đánh giá
    btnSpecs.className =
      "pb-sm border-b-2 border-carbon-ink font-body-lg text-[16px] font-bold uppercase text-carbon-ink transition-colors";
    btnReviews.className =
      "pb-sm border-b-2 border-transparent text-graphite hover:text-carbon-ink font-body-lg text-[16px] font-bold uppercase transition-colors";
  } else if (tabName === "reviews") {
    // Hiện nội dung Đánh giá, ẩn Thông số
    contentReviews.classList.remove("hidden");
    contentSpecs.classList.add("hidden");

    // Làm nổi bật nút Đánh giá, làm mờ nút Thông số
    btnReviews.className =
      "pb-sm border-b-2 border-carbon-ink font-body-lg text-[16px] font-bold uppercase text-carbon-ink transition-colors";
    btnSpecs.className =
      "pb-sm border-b-2 border-transparent text-graphite hover:text-carbon-ink font-body-lg text-[16px] font-bold uppercase transition-colors";
  }
}
