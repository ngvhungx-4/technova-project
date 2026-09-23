// CẤU HÌNH LOGIC SO SÁNH SẢN PHẨM
const COMPARE_KEY = "tcp_compare_list";
const MAX_COMPARE_ITEMS = 3;
let isCompareCollapsed = false;

// Hàm format tiền
const formatCurrencyCompare = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Khởi tạo giao diện khi load xong trang
document.addEventListener("DOMContentLoaded", () => {
  renderCompareModal();
});

// Lấy danh sách từ Local Storage
function getCompareList() {
  return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
}

// Cập nhật hàm addToCompare để KHÔNG tự động mở Drawer
function addToCompare(id, name, thumbnail) {
  let list = getCompareList();

  // Kiểm tra trùng lặp
  if (list.find((p) => p.id === id)) {
    alert("Sản phẩm này đã có trong danh sách so sánh!");
    return;
  }

  // Kiểm tra giới hạn tối đa
  if (list.length >= MAX_COMPARE_ITEMS) {
    alert(
      `Bạn chỉ có thể so sánh tối đa ${MAX_COMPARE_ITEMS} sản phẩm cùng lúc!`,
    );
    return;
  }

  // Thêm vào danh sách và lưu lại
  list.push({ id, name, thumbnail });
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));

  // (Tùy chọn) Hiển thị thông báo để người dùng biết đã thêm thành công
  alert("Đã thêm sản phẩm vào danh sách so sánh!");

  // Gọi render và truyền FALSE để vẽ lại giao diện (cập nhật số lượng)
  // nhưng KHÔNG kích hoạt mở Drawer
  renderCompareModal(false);
}

// Ẩn thanh to, bật bong bóng
function collapseCompare() {
  isCompareCollapsed = true;
  renderCompareModal();
}

// Bật thanh to, ẩn bong bóng
function expandCompare() {
  isCompareCollapsed = false;
  renderCompareModal();
}

function removeFromCompare(id) {
  let list = getCompareList();
  list = list.filter((p) => p.id !== id);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  renderCompareModal();
}

function clearCompare() {
  localStorage.removeItem(COMPARE_KEY);
  renderCompareModal();
}

// RENDER GIAO DIỆN DRAWER TỪ BÊN PHẢI
function renderCompareModal(forceOpen = false) {
  const list = getCompareList();

  // 1. Tìm hoặc tạo vùng chứa Drawer
  let container = document.getElementById("compare-drawer-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "compare-drawer-container";
    document.body.appendChild(container);
  }

  // 2. Giữ trạng thái đóng/mở của Drawer hiện tại (nếu đang mở thì render lại vẫn mở)
  const toggleInput = document.getElementById("compare-drawer-toggle");
  const isChecked = forceOpen
    ? true
    : toggleInput
      ? toggleInput.checked
      : false;

  // Nếu không có sản phẩm nào, ẩn hoàn toàn Drawer
  if (list.length === 0) {
    container.innerHTML = "";
    return;
  }

  // 3. Render các item sản phẩm
  let itemsHtml = "";
  for (let i = 0; i < MAX_COMPARE_ITEMS; i++) {
    if (i < list.length) {
      const p = list[i];
      itemsHtml += `
        <!-- Item ${i + 1} -->
        <div class="flex flex-col gap-sm pb-md border-b border-surface-tint relative group">
            <button onclick="removeFromCompare(${p.id})" class="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-surface-dim text-carbon-ink hover:bg-ember-red hover:text-paper-white transition-colors duration-200" aria-label="Remove product">
                <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
            <div class="aspect-video bg-paper-white flex items-center justify-center border border-surface-tint p-md overflow-hidden relative">
                <img alt="${p.name}" class="w-full h-full object-contain mix-blend-multiply" src="${p.thumbnail}">
            </div>
            <div>
                <h3 class="font-body-sm text-[16px] font-semibold tracking-wide">${p.name}</h3>
            </div>
        </div>
      `;
    } else {
      // Slot trống để "Thêm sản phẩm"
      itemsHtml += `
        <!-- Item Trống -->
        <div onclick="openCompareSearch()" class="flex flex-col gap-sm pb-md border-b border-surface-tint relative group cursor-pointer hover:bg-carbon-ink transition-colors">
            <div class="aspect-video bg-surface-container-low flex flex-col items-center justify-center border border-dashed border-graphite p-md overflow-hidden transition-all duration-200 hover:bg-fog hover:border-solid hover:border-carbon-ink group/add">
                <span class="material-symbols-outlined text-carbon-ink text-[32px] mb-2 transition-transform duration-200 group-hover/add:scale-105">add</span>
                <span class="font-body-lg text-label-sm text-carbon-ink uppercase tracking-widest transition-transform duration-200 group-hover/add:scale-105">Thêm sản phẩm</span>
            </div>
            <div class="h-6"></div>
        </div>
      `;
    }
  }

  // 4. Lắp ráp toàn bộ giao diện (giữ nguyên 100% class của bạn)
  container.innerHTML = `
    <input ${isChecked ? "checked" : ""} class="peer hidden" id="compare-drawer-toggle" type="checkbox">
    <div class="fixed top-0 right-0 h-full w-[360px] md:w-[420px] bg-obsidian text-paper-white z-[60] transform translate-x-full peer-checked:translate-x-0 transition-transform duration-500 ease-out border-l border-surface-tint flex flex-col shadow-2xl">
        
        <!-- Toggle Tab -->
        <label class="absolute -left-[48px] top-1/3 -translate-y-1/2 bg-obsidian text-paper-white w-[48px] h-[180px] flex items-center justify-center cursor-pointer border-l border-t border-b border-surface-tint hover:bg-carbon-ink transition-colors" for="compare-drawer-toggle">
            <span class="transform -rotate-90 whitespace-nowrap font-body-lg tracking-widest text-sm font-bold uppercase">
              Compare (${list.length})
            </span>
        </label>
        
        <!-- Drawer Header -->
        <div class="p-lg border-b border-surface-tint">
            <div class="flex justify-between items-center">
                <h2 class="font-headline-md text-headline-md italic text-paper-white">So sánh</h2>
                <label class="cursor-pointer text-mist hover:text-paper-white transition-colors flex items-center justify-center" for="compare-drawer-toggle">
                    <span class="material-symbols-outlined">close</span>
                </label>
            </div>
        </div>
        
        <!-- Product List -->
        <div class="p-lg flex-1 overflow-y-auto flex flex-col gap-lg hide-scrollbar">
            ${itemsHtml}
        </div>
        
        <!-- Drawer Actions -->
        <div class="p-lg border-t border-surface-tint bg-obsidian">
            <button onclick="goToCompare()" class="w-full bg-paper-white text-obsidian py-md font-body-lg text-label-caps rounded-none text-center hover:bg-mist transition-colors flex justify-center items-center gap-sm mb-sm border border-paper-white">
                So sánh ngay
            </button>
            <button onclick="clearCompare()" class="w-full bg-transparent border border-surface-tint text-paper-white py-md font-body-lg text-label-caps rounded-none text-center hover:bg-surface-tint transition-colors">
                Xóa tất cả
            </button>
        </div>
    </div>
  `;
}

// Chuyển hướng sang trang Chi tiết so sánh
function goToCompare() {
  const list = getCompareList();
  if (list.length >= 2) {
    const ids = list.map((p) => p.id).join(",");
    window.location.href = `compare.html?ids=${ids}`;
  } else {
    alert("Vui lòng chọn ít nhất 2 sản phẩm để so sánh!");
  }
}

// Hàm vẽ HTML Modal tìm kiếm động bằng JS
function initCompareSearchModal() {
  let modal = document.getElementById("compare-search-modal");

  // Nếu modal chưa tồn tại trong HTML, chúng ta sẽ tạo nó
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "compare-search-modal";
    // Đưa các class nền mờ vào thẻ div bao ngoài cùng
    modal.className =
      "hidden fixed inset-0 z-[70] flex items-center justify-center bg-obsidian/60 backdrop-blur-sm px-4";
    document.body.appendChild(modal);
  }

  // Sử dụng innerHTML để đổ khối HTML chuẩn Peak Design của bạn vào
  modal.innerHTML = `
    <!-- Khung Modal: Nền Paper White, Viền hairline Mist, Không đổ bóng, Bo góc 4px -->
    <div class="bg-paper-white w-full max-w-2xl border border-mist rounded-[4px] flex flex-col max-h-[80vh] shadow-none overflow-hidden">
        
        <!-- Tiêu đề Modal -->
        <div class="p-lg border-b border-mist flex justify-between items-center relative">
            <h2 class="font-headline-md text-[32px] italic text-carbon-ink">Tìm kiếm sản phẩm</h2>
            <button onclick="closeCompareSearch()" class="text-graphite hover:text-carbon-ink transition-colors bg-transparent border-none outline-none cursor-pointer">
                <span class="material-symbols-outlined text-[24px]">close</span>
            </button>
        </div>

        <!-- Khu vực Ô nhập liệu (Search Field) -->
        <div class="p-lg border-b border-mist bg-surface-bright">
            <div class="relative w-full">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-graphite text-[20px]">search</span>
                <!-- Input chuẩn Peak: Nền Fog, viền Ash Border, chữ Geist, góc 4px -->
                <input type="text" id="compare-search-input" onkeyup="debounceCompareSearch(event)"
                    class="w-full bg-fog border border-ash-border rounded-[4px] py-3 pl-10 pr-4 font-body-lg text-[16px] text-carbon-ink placeholder:text-graphite focus:outline-none focus:border-carbon-ink transition-colors shadow-none"
                    placeholder="Gõ tên sản phẩm để tìm kiếm...">
            </div>
        </div>

        <!-- Khu vực hiển thị kết quả -->
        <div id="compare-search-results" class="p-lg overflow-y-auto flex-1 hide-scrollbar flex flex-col gap-4">
            <!-- JS sẽ đổ dữ liệu danh sách sản phẩm vào đây -->
        </div>
    </div>
  `;
}

function openCompareSearch() {
  // BƯỚC MỚI: Luôn đảm bảo HTML của modal đã được vẽ ra trước khi gọi
  initCompareSearchModal();

  const modal = document.getElementById("compare-search-modal");
  if (modal) {
    modal.classList.remove("hidden");

    // Reset lại form tìm kiếm
    const searchInput = document.getElementById("compare-search-input");
    if (searchInput) searchInput.value = "";

    const searchResults = document.getElementById("compare-search-results");
    if (searchResults) {
      searchResults.innerHTML = `
            <div class="text-center text-graphite font-body-lg text-[14px] py-12 flex flex-col items-center">
                <span class="material-symbols-outlined text-[40px] mb-4 opacity-50">manage_search</span>
                Gõ tên sản phẩm để bắt đầu...
            </div>`;
    }

    // Tự động focus con trỏ vào ô nhập liệu
    setTimeout(() => {
      if (document.getElementById("compare-search-input")) {
        document.getElementById("compare-search-input").focus();
      }
    }, 100);
  }
}

function closeCompareSearch() {
  const modal = document.getElementById("compare-search-modal");
  if (modal) modal.classList.add("hidden");
}

let compareSearchTimeout;
function debounceCompareSearch(event) {
  clearTimeout(compareSearchTimeout);
  compareSearchTimeout = setTimeout(() => {
    executeCompareSearch(event.target.value.trim());
  }, 500);
}

async function executeCompareSearch(keyword) {
  const container = document.getElementById("compare-search-results");
  if (!keyword) {
    container.innerHTML =
      '<div class="text-center text-graphite font-body-lg text-[14px] py-12">Vui lòng nhập tên sản phẩm...</div>';
    return;
  }

  // Hiển thị trạng thái đang tải (Sử dụng màu Carbon Ink)
  container.innerHTML = `
    <div class="text-center text-carbon-ink font-body-lg text-[14px] py-12 flex flex-col items-center">
        <span class="material-symbols-outlined animate-spin text-[32px] mb-2">progress_activity</span> 
        Đang tìm kiếm...
    </div>`;

  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/search?keyword=${encodeURIComponent(keyword)}&limit=10&page=0`,
    );

    if (res.ok) {
      const data = await res.json();
      const products = data.content || [];

      if (products.length === 0) {
        container.innerHTML =
          '<div class="text-center text-graphite font-body-lg text-[14px] py-12">Không tìm thấy sản phẩm phù hợp.</div>';
        return;
      }

      const currentListIds = getCompareList().map((p) => p.id);

      // Render danh sách sản phẩm theo Peak Design (Không shadow, viền Mist)
      container.innerHTML = products
        .map((p) => {
          const isAdded = currentListIds.includes(p.id);
          const safeName = p.name
            ? p.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")
            : "Sản phẩm";
          const safeThumbnail = p.thumbnail || "https://placehold.co/100";

          return `
            <div class="flex items-center gap-4 bg-paper-white p-4 border border-mist rounded-[8px] hover:border-carbon-ink transition-colors">
                
                <!-- Hình ảnh sản phẩm (Bo 8px theo rule Card) -->
                <div class="w-16 h-16 shrink-0 bg-surface-container-lowest rounded-[8px] border border-mist p-1 flex items-center justify-center">
                    <img src="${safeThumbnail}" class="w-full h-full object-contain mix-blend-multiply">
                </div>
                
                <!-- Thông tin Text (Sử dụng Geist) -->
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 class="font-body-sm text-[16px] font-semibold text-carbon-ink line-clamp-1" title="${p.name}">${p.name}</h4>
                    <p class="font-body-sm text-[16px] text-ember-red font-bold mt-1">${formatCurrencyCompare(p.salePrice || 0)}</p>
                </div>
                
                <!-- Nút thao tác (Sử dụng Bryant/font-label-caps) -->
                ${
                  isAdded
                    ? `<button disabled class="shrink-0 bg-mist text-graphite px-4 py-2 rounded font-body-lg text-[14px] tracking-widest cursor-not-allowed border border-transparent shadow-none">Đã thêm</button>`
                    : `<button onclick="selectProductForCompare(${p.id}, '${safeName}', '${safeThumbnail}', ${p.salePrice || 0})" class="shrink-0 bg-transparent text-carbon-ink border border-carbon-ink hover:bg-obsidian px-4 py-2 rounded font-body-lg text-[14px] tracking-widest transition-colors shadow-none hover:text-paper-white">Thêm</button>`
                }
            </div>
          `;
        })
        .join("");
    } else {
      container.innerHTML =
        '<div class="text-center text-ember-red font-body-lg text-[14px] py-10">Lỗi lấy dữ liệu từ hệ thống.</div>';
    }
  } catch (e) {
    console.error("Search Error:", e);
    container.innerHTML =
      '<div class="text-center text-ember-red font-body-lg text-[14px] py-10">Lỗi kết nối đến máy chủ.</div>';
  }
}

// Xử lý khi nhấn nút Thêm từ danh sách kết quả tìm kiếm
function selectProductForCompare(id, name, thumbnail, price) {
  // Thêm vào LocalStorage
  addToCompare(id, name, thumbnail, price);

  // Đóng Popup tìm kiếm
  closeCompareSearch();

  // Nếu người dùng đang đứng ở trang Bảng so sánh
  // Thì cần F5 lại trình duyệt và đổi URL để thêm cái máy mới vào Bảng lưới
  if (window.location.pathname.includes("compare.html")) {
    const list = getCompareList();
    const ids = list.map((p) => p.id).join(",");
    window.location.href = `compare.html?ids=${ids}`;
  }
}

// --- TRANG CHI TIẾT SO SÁNH ---
document.addEventListener("DOMContentLoaded", async () => {
  // Chỉ chạy logic này nếu đang ở trang compare.html
  if (!window.location.pathname.includes("compare.html")) return;

  const urlParams = new URLSearchParams(window.location.search);
  const idsString = urlParams.get("ids");

  if (!idsString) {
    showEmptyState();
    return;
  }

  const ids = idsString.split(",").filter((id) => id.trim() !== "");
  if (ids.length < 1) {
    showEmptyState();
    return;
  }

  await loadComparisonData(ids);
});

async function loadComparisonData(ids) {
  try {
    const productPromises = ids.map((id) =>
      fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`).then((res) => {
        if (!res.ok) throw new Error("Lỗi tải SP ID: " + id);
        return res.json();
      }),
    );

    const products = await Promise.all(productPromises);

    // Bật giao diện container chính
    document.getElementById("no-compare-data")?.classList.add("hidden");
    document
      .getElementById("compare-main-container")
      ?.classList.remove("hidden");

    // Tiến hành vẽ giao diện Lưới Peak Design
    renderCompareHeader(products);
    renderCompareBody(products);
  } catch (error) {
    console.error("Lỗi trang so sánh:", error);
    alert("Không thể lấy dữ liệu sản phẩm. Vui lòng kiểm tra lại kết nối!");
    showEmptyState();
  }
}

function renderCompareHeader(products) {
  const headerRow = document.getElementById("compare-header-row");
  if (!headerRow) return;

  // Cột 1: Trống (để chừa chỗ cho tiêu đề thông số bên dưới)
  let html = `<div class="hidden md:block"></div>`;

  // Cột 2, 3, 4: Sản phẩm
  products.forEach((p) => {
    html += `
        <div class="flex flex-col items-center text-center gap-sm h-full">
            <div class="aspect-[4/3] w-full bg-surface-container-lowest border border-mist rounded-lg flex items-center justify-center p-sm mb-sm overflow-hidden relative">
                <img alt="${p.name}" class="w-full h-full object-contain mix-blend-multiply" src="${p.thumbnail || "https://placehold.co/150"}">
                <button onclick="removeAndRefresh(${p.id})" class="absolute top-2 right-2 text-graphite hover:text-ember-red transition-colors">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            <h3 class="font-body-sm text-[16px] leading-tight text-carbon-ink font-semibold mt-xs line-clamp-2">${p.name}</h3>
            
            <button class="w-full bg-surface-container-lowest border border-carbon-ink text-carbon-ink py-2 px-4 font-body-lg text-body-lg font-bold uppercase rounded hover:bg-obsidian hover:text-paper-white transition-colors mt-auto">
                <a href="product_detail.html?id=${p.id}">Xem chi tiết</a>
            </button>
        </div>
    `;
  });

  // Nếu chưa đủ 3 máy, vẽ thêm ô "Thêm sản phẩm"
  const emptySlots = 3 - products.length;
  for (let i = 0; i < emptySlots; i++) {
    html += `
        <div class="flex flex-col h-full cursor-pointer group" onclick="openCompareSearch()">
            <!-- Box nét đứt chỉ cao bằng đúng phần hình ảnh (tỷ lệ 4:3) -->
            <div class="aspect-[4/3] w-full bg-surface-container-low border-2 border-dashed border-mist rounded-lg flex flex-col items-center justify-center p-sm transition-colors group-hover:border-carbon-ink group-hover:bg-fog">
                <span class="material-symbols-outlined text-[32px] text-graphite mb-2 group-hover:text-carbon-ink">add_circle</span>
                <span class="font-body-sm text-graphite group-hover:text-carbon-ink">Thêm sản phẩm</span>
            </div>
            <!-- Phần khoảng trống bên dưới để cân bằng chiều cao với cột sản phẩm -->
            <div class="flex-1"></div>
        </div>
    `;
  }

  headerRow.innerHTML = html;
}

function renderCompareBody(products) {
  const tbody = document.getElementById("compare-body");
  if (!tbody) return;

  let html = "";
  const emptySlots = 3 - products.length;

  // --- HÀNG: GIÁ BÁN ---
  // SỬA CLASS LƯỚI Ở ĐÂY
  html += `<div class="grid grid-cols-1 md:grid-cols-[220px_repeat(3,1fr)] border-b border-mist hover:bg-fog transition-colors">
             <div class="p-md font-body-lg text-label-sm uppercase text-graphite bg-surface-container-low md:bg-transparent flex items-center md:border-r border-mist">Giá bán</div>`;
  products.forEach((p) => {
    html += `<div class="p-md font-body-sm text-[20px] text-ember-red font-bold flex items-center justify-center text-center md:border-r border-mist">${formatCurrencyCompare(p.salePrice)}</div>`;
  });
  for (let i = 0; i < emptySlots; i++)
    html += `<div class="p-md border-mist ${i < emptySlots - 1 ? "md:border-r" : ""}"></div>`;
  html += `</div>`;

  // --- HÀNG: TÌNH TRẠNG ---
  // SỬA CLASS LƯỚI Ở ĐÂY
  html += `<div class="grid grid-cols-1 md:grid-cols-[220px_repeat(3,1fr)] border-b border-mist bg-surface-container-lowest hover:bg-fog transition-colors">
             <div class="p-md font-body-lg text-label-sm uppercase text-graphite bg-surface-container-low md:bg-surface-container-lowest flex items-center md:border-r border-mist">Tình trạng</div>`;
  products.forEach((p) => {
    const status = p.stock > 0 ? "Còn hàng" : "Hết hàng";
    html += `<div class="p-md font-body-sm text-carbon-ink flex items-center justify-center text-center md:border-r border-mist">${status}</div>`;
  });
  for (let i = 0; i < emptySlots; i++)
    html += `<div class="p-md border-mist ${i < emptySlots - 1 ? "md:border-r" : ""}"></div>`;
  html += `</div>`;

  // --- CÁC HÀNG THÔNG SỐ ĐỘNG (Chip, RAM, Màn hình...) ---
  const allSpecKeys = new Set();
  const specLabels = {};

  products.forEach((p) => {
    if (p.specs) Object.keys(p.specs).forEach((k) => allSpecKeys.add(k));
    if (p.categoryConfig && p.categoryConfig.labels)
      Object.assign(specLabels, p.categoryConfig.labels);
  });

  let isAltRow = false; // Tạo hiệu ứng màu so le giữa các hàng
  allSpecKeys.forEach((key) => {
    const label = specLabels[key] || key.toUpperCase();
    const bgClass = isAltRow ? "bg-surface-container-lowest" : "bg-transparent";
    const labelBgClass = isAltRow
      ? "md:bg-surface-container-lowest"
      : "md:bg-transparent";

    // SỬA CLASS LƯỚI Ở ĐÂY
    html += `<div class="grid grid-cols-1 md:grid-cols-[220px_repeat(3,1fr)] border-b border-mist ${bgClass} hover:bg-fog transition-colors">
               <div class="p-md font-body-lg text-label-sm uppercase text-graphite bg-surface-container-low ${labelBgClass} flex items-center md:border-r border-mist">${label}</div>`;

    products.forEach((p) => {
      const val = p.specs && p.specs[key] ? p.specs[key] : "—";
      html += `<div class="p-md font-body-sm text-carbon-ink flex items-center justify-center text-center md:border-r border-mist">${val}</div>`;
    });

    for (let i = 0; i < emptySlots; i++) {
      html += `<div class="p-md border-mist ${i < emptySlots - 1 ? "md:border-r" : ""}"></div>`;
    }
    html += `</div>`;

    isAltRow = !isAltRow;
  });

  tbody.innerHTML = html;
}

function showEmptyState() {
  document.getElementById("compare-main-container")?.classList.add("hidden");
  document.getElementById("no-compare-data")?.classList.remove("hidden");
}

function removeAndRefresh(id) {
  let list = JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
  list = list.filter((p) => p.id != id);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));

  if (list.length === 0) {
    window.location.href = "products.html";
  } else {
    const ids = list.map((p) => p.id).join(",");
    window.location.href = `compare.html?ids=${ids}`;
  }
}
