// Biến toàn cục
let currentPage = 0;
let currentCategoryId = null;
let currentKeyword = null;
let currentBrand = null; // BƯỚC MỚI: Biến lưu trữ thương hiệu từ URL
const PAGE_SIZE = 20;
let currentSortBy = "createdAt";
let currentSortDir = "desc";

// Lưu trạng thái bộ lọc
let activeFilters = {};
let currentMinPrice = null;
let currentMaxPrice = null;

// Biến lưu trữ dữ liệu Flash Sale
let activeFlashSaleItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  initPriceSliderUI();

  const urlParams = new URLSearchParams(window.location.search);
  currentCategoryId = urlParams.get("category") || urlParams.get("categoryId");
  currentKeyword = urlParams.get("search");
  currentBrand = urlParams.get("brand"); // BƯỚC MỚI: Đọc giá trị brand từ URL

  // BƯỚC MỚI: Nếu có brand trên URL, đưa ngay vào trạng thái bộ lọc đang hoạt động
  if (currentBrand) {
    activeFilters["brand"] = currentBrand;
  }
  await loadBrands();

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

    if (flashSaleRes && flashSaleRes.items) {
      activeFlashSaleItems = flashSaleRes.items;
    }
  } catch (e) {
    console.warn("Không có chương trình Flash Sale nào đang diễn ra:", e);
  }

  // Xử lý sự kiện thay đổi sắp xếp
  const sortSelect = document.getElementById("sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const [sortBy, sortDir] = this.value.split("-");
      currentSortBy = sortBy;
      currentSortDir = sortDir;
      loadProducts(0);
    });
  }

  if (currentCategoryId) {
    await initDynamicFilters(currentCategoryId);
  } else {
    const container = document.getElementById("dynamic-specs-container");
    if (container) {
      container.innerHTML = `<div class="text-sm text-gray-400 italic">Vui lòng chọn một danh mục cụ thể!</div>`;
    }
  }
  // --- BẮT ĐẦU ĐOẠN MÃ MỚI CHO BỘ LỌC GIÁ ĐÃ ĐƯỢC TỐI ƯU ---
  const priceMinRange = document.getElementById("price-min-range");
  if (priceMinRange) {
    const priceContainer = priceMinRange.closest(".group");

    if (priceContainer) {
      const buttons = priceContainer.querySelectorAll("button");

      buttons.forEach((btn) => {
        // Ghi chú: Chúng ta không cần kiểm tra nút "Áp dụng" ở đây nữa
        // vì đã sử dụng onclick="applyFilters()" trực tiếp bên HTML.

        // Chỉ giữ lại xử lý cho nút "Thiết lập lại" nếu nó chưa có onclick
        const text = btn.innerText.trim().toLowerCase();
        if (text === "thiết lập lại" && !btn.hasAttribute("onclick")) {
          btn.addEventListener("click", () => {
            if (typeof window.resetPriceRange === "function") {
              window.resetPriceRange();
            }
            currentMinPrice = null;
            currentMaxPrice = null;
            loadProducts(0);
          });
        }

        // Xử lý nút Gợi ý nhanh (<15tr, v.v.)
        if (
          btn.hasAttribute("onclick") &&
          btn.getAttribute("onclick").includes("setPricePreset")
        ) {
          btn.addEventListener("click", () => {
            // Đợi 50ms để HTML cập nhật giao diện thanh trượt xong, sau đó áp dụng vào API
            setTimeout(() => {
              applyFilters();
            }, 50);
          });
        }
      });
    }
  }
  // --- KẾT THÚC ĐOẠN MÃ MỚI CHO BỘ LỌC GIÁ ---

  // Tải dữ liệu lần đầu
  if (currentKeyword !== null || currentCategoryId) {
    loadProducts(0);
  } else {
    currentKeyword = "";
    loadProducts(0);
  }
});

// Khởi tạo bộ lọc cấu hình động (Tối đa 5 option/cột)
async function initDynamicFilters(categoryId) {
  const container = document.getElementById("dynamic-specs-container");
  if (!container) return;

  try {
    let filterData;
    if (typeof ApiUtils !== "undefined") {
        filterData = await ApiUtils.fetchAPI(`/products/category/${categoryId}/filters`);
    } else {
        const res = await fetch(`${AppConfig.PRODUCT_API_URL || "http://localhost:8080/api"}/products/category/${categoryId}/filters`);
        filterData = await res.json();
    }

    const labels = filterData.labels || {};
    const filters = filterData.filters || {};

    container.innerHTML = ""; // Xóa chữ "Đang tải cấu hình..."
    let hasFilters = false;

    // BƯỚC 1: Dùng flex-wrap để các nhóm (CPU, RAM...) tự động dãn cách và rớt dòng nếu không đủ chỗ
    const flexWrapper = document.createElement("div");
    flexWrapper.className = "flex flex-wrap gap-x-14 gap-y-8";

    for (const key in filters) {
      if (key === 'brand') continue; 

      const options = filters[key] || [];
      if (options.length === 0) continue;

      hasFilters = true;
      const labelName = labels[key] || key.toUpperCase(); 

      // Khối chứa từng nhóm (VD: Khối chứa toàn bộ thông số CPU)
      const groupDiv = document.createElement("div");
      groupDiv.className = "filter-group flex flex-col";
      groupDiv.innerHTML = `<h4 class="text-[14px] font-label-caps text-primary uppercase mb-3 border-b border-mist pb-2 font-bold">${labelName}</h4>`;

      // BƯỚC 2: Kỹ thuật chia cột bằng CSS Grid
      // - grid-rows-5: Ép tối đa 5 hàng
      // - grid-flow-col: Tự động đổ dữ liệu theo cột dọc, đầy 5 hàng thì sang cột mới
      const optionsContainer = document.createElement("div");
      optionsContainer.className = "grid grid-rows-5 grid-flow-col gap-x-8 gap-y-2";

      options.forEach(opt => {
        const cleanOpt = String(opt).replace(/^"|"$/g, "");
        const isChecked = activeFilters[key] && activeFilters[key].includes(cleanOpt) ? "checked" : "";

        // Giao diện Checkbox (Thêm min-w-[120px] để các cột rộng đều nhau, thẳng hàng đẹp mắt)
        const labelEl = document.createElement("label");
        labelEl.className = "flex items-center gap-sm py-1 cursor-pointer group min-w-[120px]";
        labelEl.innerHTML = `
            <input class="rounded border-ash-border text-carbon-ink focus:ring-0 w-4 h-4 dynamic-filter-checkbox flex-shrink-0 transition-colors" 
                   type="checkbox" value="${cleanOpt}" data-key="${key}" ${isChecked}>
            <span class="font-body-sm text-[13px] text-on-surface-variant group-hover:text-primary transition-colors line-clamp-1" title="${cleanOpt}">${cleanOpt}</span>
        `;

        // Xử lý sự kiện khi tick chọn
        const checkbox = labelEl.querySelector('input');
        checkbox.addEventListener("change", (e) => {
          if (!activeFilters[key] || !Array.isArray(activeFilters[key])) {
            activeFilters[key] = [];
          }

          if (e.target.checked) {
            activeFilters[key].push(cleanOpt);
          } else {
            activeFilters[key] = activeFilters[key].filter(item => item !== cleanOpt);
            if (activeFilters[key].length === 0) delete activeFilters[key];
          }

          // Tải lại dữ liệu sản phẩm tương ứng với bộ lọc
          if (typeof loadProducts === "function") loadProducts(0);
        });

        optionsContainer.appendChild(labelEl);
      });

      groupDiv.appendChild(optionsContainer);
      flexWrapper.appendChild(groupDiv);
    }

    if (!hasFilters) {
      container.innerHTML = `<div class="text-[13px] text-secondary italic px-md py-sm">Không có bộ lọc cấu hình cho danh mục này.</div>`;
    } else {
      container.appendChild(flexWrapper);
    }

  } catch (e) {
    console.error("LỖI TẢI BỘ LỌC CẤU HÌNH:", e);
    container.innerHTML = `<div class="text-[13px] text-ember-red px-md py-sm">Lỗi tải dữ liệu cấu hình.</div>`;
  }
}

// Click chọn/bỏ chọn một thông số
function toggleFilter(key, value, element) {
  if (activeFilters[key] === value) {
    delete activeFilters[key]; // Bỏ chọn
    element.classList.remove("bg-primary", "text-[#101818]", "border-primary");
    element.classList.add("text-gray-600", "dark:text-gray-400");
  } else {
    // Bỏ active nút cũ cùng nhóm
    element.parentNode.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("bg-primary", "text-[#101818]", "border-primary");
      btn.classList.add("text-gray-600", "dark:text-gray-400");
    });
    // Active nút mới
    activeFilters[key] = value;
    element.classList.remove("text-gray-600", "dark:text-gray-400");
    element.classList.add("bg-primary", "text-[#101818]", "border-primary");
  }
  loadProducts(0);
}

// Nút áp dụng giá
function applyFilters() {
  const minRangeEl = document.getElementById("price-min-range");
  const maxRangeEl = document.getElementById("price-max-range");

  if (minRangeEl && maxRangeEl) {
    // Đọc giá trị (số triệu) và nhân với 1,000,000 để ra VNĐ
    const minVal = parseInt(minRangeEl.value);
    const maxVal = parseInt(maxRangeEl.value);

    currentMinPrice = minVal * 1000000;
    currentMaxPrice = maxVal * 1000000;

    // Mẹo: In ra console để bạn dễ dàng theo dõi xem JS có tính đúng giá tiền không
    console.log(
      `Đang gọi API lọc giá: Min = ${currentMinPrice}, Max = ${currentMaxPrice}`,
    );
  } else {
    currentMinPrice = null;
    currentMaxPrice = null;
  }

  // Gọi API tải sản phẩm
  if (typeof loadProducts === "function") {
    loadProducts(0);
  }
}

// Xóa toàn bộ điều kiện lọc
function resetFilters() {
  if (typeof window.resetPriceRange === "function") {
    window.resetPriceRange();
  }

  currentMinPrice = null;
  currentMaxPrice = null;
  activeFilters = {}; // Làm sạch toàn bộ biến lưu trữ

  // Bỏ tick tất cả checkbox thương hiệu (tĩnh)
  document
    .querySelectorAll('#brand-filter-container input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = false;
    });

  // Bỏ tick tất cả checkbox cấu hình (động) vừa tạo
  document.querySelectorAll(".dynamic-filter-checkbox").forEach((cb) => {
    cb.checked = false;
  });

  // Xóa param brand trên URL nếu có
  const url = new URL(window.location);
  url.searchParams.delete("brand");
  window.history.pushState({}, "", url);

  // Tải lại toàn bộ sản phẩm
  loadProducts(0);
}

async function loadProducts(page) {
  currentPage = page;

  const productListEl = document.getElementById("product-list");
  const emptyStateEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("category-title");
  const countEl = document.getElementById("product-count");
  const paginationEl = document.getElementById("pagination");

  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    let pageTitle = "Tất cả sản phẩm";
    let breadcrumbPaths = [];

    // Gộp tất cả URL gọi về API /search để hỗ trợ filter đa tham số
    let apiUrl = `${AppConfig.PRODUCT_API_URL}/products/search?page=${page}&limit=${PAGE_SIZE}&sortBy=${currentSortBy}&sortDir=${currentSortDir}`;

    // Tham số Tìm kiếm
    if (currentKeyword !== null && currentKeyword !== "") {
      apiUrl += `&keyword=${encodeURIComponent(currentKeyword)}`;
      pageTitle = `Kết quả tìm kiếm cho: "${currentKeyword}"`;
      breadcrumbPaths.push({ label: "Tìm kiếm sản phẩm" });
    }

    // Tham số Danh mục
    if (currentCategoryId) {
      apiUrl += `&categoryId=${currentCategoryId}`;

      try {
        const catResponse = await fetch(
          `${AppConfig.PRODUCT_API_URL}/categories/${currentCategoryId}`,
        );
        if (catResponse.ok) {
          const catData = await catResponse.json();
          const category = catData.data || catData;

          if (!currentKeyword) {
            pageTitle = category.name || category.categoryName || pageTitle;
            // Nếu đang lọc theo hãng, hiển thị hãng lên tiêu đề
            if (activeFilters["brand"]) {
              pageTitle += ` - ${activeFilters["brand"]}`;
            }
          }

          if (category.parent) {
            breadcrumbPaths.push({
              label: category.parent.name,
              url: `products.html?categoryId=${category.parent.id}`,
            });
          }
        }
      } catch (e) {
        console.warn("Không tải được thông tin danh mục:", e);
      }
      if (!currentKeyword) breadcrumbPaths.push({ label: pageTitle });
    } else if (!currentKeyword) {
      breadcrumbPaths.push({ label: pageTitle });
    }

    // Tham số Bộ lọc (Sử dụng activeFilters đã có sẵn brand)
    let brandParam = activeFilters["brand"] || null;
    let specsObj = { ...activeFilters };
    delete specsObj["brand"];
    let specsParam =
      Object.keys(specsObj).length > 0 ? JSON.stringify(specsObj) : null;

    if (currentMinPrice) apiUrl += `&minPrice=${currentMinPrice}`;
    if (currentMaxPrice) apiUrl += `&maxPrice=${currentMaxPrice}`;
    if (brandParam) apiUrl += `&brand=${encodeURIComponent(brandParam)}`;
    if (specsParam) apiUrl += `&specs=${encodeURIComponent(specsParam)}`;

    // Vẽ giao diện Breadcrumb & Tiêu đề
    if (typeof UIUtils !== "undefined" && UIUtils.renderBreadcrumb) {
      UIUtils.renderBreadcrumb("breadcrumb-container", breadcrumbPaths);
    }
    if (titleEl) titleEl.innerText = pageTitle;

    // GỌI API
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Lỗi kết nối server");

    const data = await response.json();
    const products = data.content;

    // Xử lý hiển thị UI
    if (productListEl) {
      productListEl.innerHTML = "";
      productListEl.classList.remove("hidden");
    }
    if (emptyStateEl) emptyStateEl.classList.add("hidden");

    if (!products || products.length === 0) {
      showEmptyState(
        currentKeyword !== null
          ? "Không tìm thấy sản phẩm nào phù hợp"
          : "Danh mục chưa có sản phẩm",
      );
      if (titleEl) titleEl.innerText = pageTitle;
      if (countEl) countEl.innerText = "0";
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    if (countEl) countEl.innerText = data.totalElements;

    products.forEach((p) => {
      renderProductCard(p, productListEl);
    });

    renderPagination(data.totalPages, data.pageNo);
  } catch (error) {
    console.error("Lỗi frontend:", error);
    showEmptyState("Lỗi tải dữ liệu");
  }
}

function renderProductCard(p, container) {
  let salePrice = p.salePrice || 0;
  let basePrice = p.basePrice || 0;

  // Lấy thông tin Flash Sale nếu có
  const flashSaleItem = activeFlashSaleItems.find(
    (item) => item.productId === p.id,
  );
  
  if (flashSaleItem) {
    // KIỂM TRA SỐ LƯỢNG SUẤT FLASH SALE
    const isFlashSaleSoldOut = (flashSaleItem.soldQuantity || 0) >= (flashSaleItem.allocatedQuantity || 1);
    
    if (!isFlashSaleSoldOut) {
        // Chỉ đè giá Flash Sale nếu chưa hết suất
        salePrice = flashSaleItem.flashSalePrice;
        basePrice = flashSaleItem.originalPrice;
    }
  }

  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(salePrice);

  const basePriceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(basePrice);

  let discountHtml = "";
  let basePriceHtml = "";
  if (basePrice > salePrice) {
    const percent = Math.round(((basePrice - salePrice) / basePrice) * 100);
    basePriceHtml = `<span class="font-body-sm text-body-sm text-on-surface-variant line-through">${basePriceFormatted}</span>`;
    discountHtml = `<span class="text-ember-red font-bold text-[12px]">-${percent}%</span>`;
  }

  const safeName = p.name
    ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
    : "Sản phẩm";
  const safeThumbnail =
    p.thumbnail || "https://placehold.co/400x300?text=No+Image";
  const sku = p.sku || "Đang cập nhật";
  const soldCount = p.sold || 0;

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

  const card = document.createElement("article");
  card.className = "flex flex-col group cursor-pointer relative h-full";
  card.onclick = () =>
    (window.location.href = `product_detail.html?id=${p.id}`);

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
  `;

  if (container) container.appendChild(card);
}

function renderPagination(totalPages, pageNo) {
  const paginationEl = document.getElementById("pagination");
  if (!paginationEl) return;

  paginationEl.innerHTML = "";
  if (totalPages <= 1) return;

  const prevBtn = createPageButton(
    "chevron_left",
    pageNo > 0,
    () => changePage(pageNo - 1),
    true,
  );
  paginationEl.appendChild(prevBtn);

  let startPage = Math.max(0, pageNo - 2);
  let endPage = Math.min(totalPages - 1, pageNo + 2);

  if (endPage - startPage < 4) {
    if (startPage === 0) endPage = Math.min(totalPages - 1, startPage + 4);
    else if (endPage === totalPages - 1) startPage = Math.max(0, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const isCurrent = i === pageNo;
    const pageBtn = createPageButton(
      i + 1,
      true,
      () => changePage(i),
      false,
      isCurrent,
    );
    paginationEl.appendChild(pageBtn);
  }

  const nextBtn = createPageButton(
    "chevron_right",
    pageNo < totalPages - 1,
    () => changePage(pageNo + 1),
    true,
  );
  paginationEl.appendChild(nextBtn);
}

function createPageButton(
  text,
  isEnabled,
  onClick,
  isIcon = false,
  isActive = false,
) {
  const btn = document.createElement("button");

  let className = "flex items-center justify-center w-8 h-8 transition-colors ";

  if (isActive) {
    className += "text-primary font-bold border-b-2 border-primary";
  } else {
    if (isEnabled) {
      className += "text-on-surface-variant hover:text-primary cursor-pointer";
    } else {
      className += "text-mist cursor-not-allowed";
    }
  }

  btn.className = className;
  btn.disabled = !isEnabled;

  if (isIcon) {
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">${text}</span>`;
  } else {
    btn.innerText = text;
  }

  if (isEnabled) {
    btn.addEventListener("click", onClick);
  }

  return btn;
}

function changePage(newPage) {
  if (newPage !== currentPage) {
    loadProducts(newPage);
  }
}

function showEmptyState(message) {
  const productListEl = document.getElementById("product-list");
  const emptyStateEl = document.getElementById("empty-state");
  const titleEl = document.getElementById("category-title");
  const paginationEl = document.getElementById("pagination");

  if (productListEl) productListEl.classList.add("hidden");
  if (paginationEl) paginationEl.innerHTML = "";

  if (emptyStateEl) {
    emptyStateEl.classList.remove("hidden");
    emptyStateEl.classList.add("flex");
  }
  if (titleEl) titleEl.innerText = message;
}

async function addToCart(productId, buttonElement) {
  const originalText = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = `<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span>`;

  try {
    await ApiUtils.fetchAPI("/cart/add", {
      method: "POST",
      body: JSON.stringify({
        productId: productId,
        quantity: 1,
      }),
    });

    if (typeof HeaderLogic !== "undefined") {
      HeaderLogic.updateCartBadge();
    }

    alert("Đã thêm sản phẩm vào giỏ hàng!");
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    alert(error.message || "Không thể thêm vào giỏ hàng lúc này!");
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalText;
  }
}

// HÀM MỚI: Khởi tạo và xử lý giao diện cho thanh trượt khoảng giá
function initPriceSliderUI() {
  const minR = document.getElementById("price-min-range");
  const maxR = document.getElementById("price-max-range");
  const prog = document.getElementById("slider-progress");
  const minIn = document.getElementById("price-min-input");
  const maxIn = document.getElementById("price-max-input");
  const summary = document.getElementById("price-display-summary");

  if (!minR || !maxR) return; // Nếu không có thanh trượt thì bỏ qua

  // Hàm định dạng số tiền (VD: 10 -> 10.000.000)
  function formatVN(val) {
    return (val * 1000000).toLocaleString("vi-VN");
  }

  // Hàm cập nhật giao diện thanh trượt
  function updateUI() {
    let v1 = parseInt(minR.value);
    let v2 = parseInt(maxR.value);
    if (v1 > v2) {
      const temp = v1;
      v1 = v2;
      v2 = temp;
    }
    const p1 = (v1 / 500) * 100;
    const p2 = 100 - (v2 / 500) * 100;

    if (prog) {
      prog.style.left = p1 + "%";
      prog.style.right = p2 + "%";
    }
    if (minIn) minIn.value = formatVN(v1);
    if (maxIn) maxIn.value = formatVN(v2);
    if (summary)
      summary.textContent = formatVN(v1) + "₫ - " + formatVN(v2) + "₫";
  }

  // Lắng nghe sự kiện người dùng kéo thanh trượt tối thiểu
  minR.addEventListener("input", function () {
    if (parseInt(minR.value) > parseInt(maxR.value)) minR.value = maxR.value;
    updateUI();
  });

  // Lắng nghe sự kiện người dùng kéo thanh trượt tối đa
  maxR.addEventListener("input", function () {
    if (parseInt(maxR.value) < parseInt(minR.value)) maxR.value = minR.value;
    updateUI();
  });

  // --- BẮT ĐẦU ĐOẠN MÃ XỬ LÝ NHẬP TIỀN VÀO Ô TEXT ---
  function handleManualInput() {
    if (!minIn || !maxIn) return;

    // 1. Lấy giá trị người dùng nhập, xóa mọi ký tự không phải là số (dấu chấm, phẩy, chữ...)
    let minTextVal = parseInt(minIn.value.replace(/\D/g, "")) || 0;
    let maxTextVal = parseInt(maxIn.value.replace(/\D/g, "")) || 0;

    // 2. Chuyển đổi từ VNĐ (hàng triệu) về thang đo của thanh trượt (0 - 500)
    let minSliderVal = Math.round(minTextVal / 1000000);
    let maxSliderVal = Math.round(maxTextVal / 1000000);

    // 3. Kiểm tra ràng buộc để không vượt quá giới hạn (0 - 500 triệu)
    if (minSliderVal < 0) minSliderVal = 0;
    if (maxSliderVal > 500) maxSliderVal = 500;

    // Nếu nhập giá tối thiểu lớn hơn tối đa, tự động đảo ngược lại cho hợp lý
    if (minSliderVal > maxSliderVal) {
      const temp = minSliderVal;
      minSliderVal = maxSliderVal;
      maxSliderVal = temp;
    }

    // 4. Gán giá trị mới vào thanh trượt (range input)
    minR.value = minSliderVal;
    maxR.value = maxSliderVal;

    // 5. Cập nhật lại giao diện (kéo thanh màu đen và format lại số tiền có dấu chấm)
    updateUI();
  }

  // Lắng nghe sự kiện "change" (kích hoạt khi người dùng gõ xong và bấm Enter hoặc click ra ngoài)
  if (minIn) {
    minIn.addEventListener("change", handleManualInput);
  }
  if (maxIn) {
    maxIn.addEventListener("change", handleManualInput);
  }
  // --- KẾT THÚC ĐOẠN MÃ XỬ LÝ NHẬP TIỀN VÀO Ô TEXT ---

  // Xuất 2 hàm này ra phạm vi toàn cục (window) để các nút bấm trên HTML có thể gọi được
  window.setPricePreset = function (minVal, maxVal) {
    minR.value = minVal;
    maxR.value = maxVal;
    updateUI();
  };

  window.resetPriceRange = function () {
    // Đặt lại giá trị của thanh trượt trên giao diện
    minR.value = 0;
    maxR.value = 500; // CẬP NHẬT: Đổi từ 80 thành 500
    updateUI();

    // Xóa các biến lưu trữ điều kiện lọc giá
    currentMinPrice = null;
    currentMaxPrice = null;

    // Tải lại danh sách sản phẩm từ trang đầu tiên (page 0)
    if (typeof loadProducts === "function") {
      loadProducts(0);
    }
  };
}

// HÀM MỚI: Khởi tạo sự kiện cho các bộ lọc checkbox (Thương hiệu, Cấu hình)
function initStaticFiltersUI() {}


// --- THAY THẾ HÀM loadBrands TRONG product.js BẰNG ĐOẠN MÃ NÀY ---
async function loadBrands() {
  const container = document.getElementById("brand-filter-container");
  if (!container) return;

  // 1. Kiểm tra: Nếu không có currentCategoryId (ví dụ trang tìm kiếm tổng), ẩn bộ lọc đi
  if (!currentCategoryId) {
    container.innerHTML = `<span class="text-[12px] text-gray-400 px-sm italic">Vui lòng chọn danh mục để lọc thương hiệu.</span>`;
    return;
  }

  try {
    // 2. Gọi API cấu hình bộ lọc của danh mục giống như cách common.js đang làm
    const filterData = await ApiUtils.fetchAPI(
      `/products/category/${currentCategoryId}/filters`,
    );

    // 3. Lấy mảng thương hiệu từ kết quả API trả về
    const brands = filterData?.filters?.brand || [];

    container.innerHTML = ""; // Xóa chữ "Đang tải..."

    if (brands.length === 0) {
      container.innerHTML = `<span class="text-[12px] text-gray-400 px-sm">Chưa có thương hiệu</span>`;
      return;
    }

    // 4. In các thương hiệu ra giao diện (Checkboxes)
    brands.forEach((brandName) => {
      // Kiểm tra xem thương hiệu này có đang được chọn (active) từ URL không
      const isChecked = activeFilters["brand"] === brandName ? "checked" : "";

      const label = document.createElement("label");
      label.className =
        "flex items-center gap-sm px-sm py-xs hover:bg-fog cursor-pointer rounded transition-colors";
      label.innerHTML = `
                <input class="rounded border-ash-border text-carbon-ink focus:ring-0 w-4 h-4" 
                       type="checkbox" value="${brandName}" ${isChecked}>
                <span class="font-body-sm text-body-sm">${brandName}</span>
            `;

      // Lắng nghe sự kiện click cho từng checkbox thương hiệu
      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          // Tự động bỏ chọn các checkbox khác (chỉ cho phép chọn 1 hãng mỗi lần)
          container
            .querySelectorAll('input[type="checkbox"]')
            .forEach((other) => {
              if (other !== checkbox) other.checked = false;
            });
          activeFilters["brand"] = brandName;
        } else {
          delete activeFilters["brand"];
        }

        // Cập nhật lại danh sách sản phẩm ở dưới
        if (typeof loadProducts === "function") loadProducts(0);
      });

      container.appendChild(label);
    });
  } catch (error) {
    console.error("LỖI TẢI THƯƠNG HIỆU:", error);
    container.innerHTML = `<span class="text-[12px] text-ember-red px-sm">Lỗi tải dữ liệu</span>`;
  }
}
