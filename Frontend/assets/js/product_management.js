let currentPage = 0;
const pageSize = 10;
let currentSearch = "";
let currentCategory = "";
let currentStatus = "";

let allCategoriesAdmin = []; // Biến toàn cục lưu cache danh mục

document.addEventListener("DOMContentLoaded", () => {
  loadCategoriesForFilter();
  loadProducts();
  loadDashboardStats();

  // Lắng nghe tìm kiếm
  const searchInput = document.getElementById("search-product");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentSearch = e.target.value.trim();
        currentPage = 0;
        loadProducts();
      }
    });
  }

  // Lắng nghe bộ lọc Danh mục
  const catFilter = document.getElementById("filter-category");
  if (catFilter) {
    catFilter.addEventListener("change", (e) => {
      currentCategory = e.target.value;
      currentPage = 0;
      loadProducts();
    });
  }

  // Lắng nghe bộ lọc Trạng thái
  const statusFilter = document.getElementById("filter-status");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatus = e.target.value;
      currentPage = 0;
      loadProducts();
    });
  }
});

// Tải danh mục vào thẻ Select
async function loadCategoriesForFilter() {
  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/all`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (res.ok) {
      allCategoriesAdmin = await res.json();
      const selectFilter = document.getElementById("filter-category");
      const selectModal = document.getElementById("modal-product-category");

      let htmlOptions = "";
      allCategoriesAdmin.forEach((c) => {
        htmlOptions += `<option value="${c.id}">${c.parentName ? c.parentName + " > " : ""}${c.name}</option>`;
      });

      if (selectFilter) selectFilter.innerHTML += htmlOptions;
      if (selectModal)
        selectModal.innerHTML =
          `<option value="">-- Chọn danh mục --</option>` + htmlOptions;
    }
  } catch (e) {
    console.error("Lỗi tải danh mục:", e);
  }
}

// Gọi API lấy sản phẩm
async function loadProducts() {
  const tbody = document.getElementById("product-table-body");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-graphite">progress_activity</span> Đang tải...</td></tr>`;

  try {
    const url = `${AppConfig.PRODUCT_API_URL}/products/admin/all?keyword=${encodeURIComponent(currentSearch)}&categoryId=${currentCategory}&status=${currentStatus}&page=${currentPage}&size=${pageSize}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
    });

    if (!response.ok) throw new Error("Lỗi máy chủ");
    const data = await response.json();

    renderTable(data.content);
    renderPagination(data);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-ember-red py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}
function formatCompactCurrency(value) {
  if (!value) return "0 ₫";
  if (value >= 1e9) return (value / 1e9).toFixed(1) + "B ₫"; // Tỷ (Billion)
  if (value >= 1e6) return (value / 1e6).toFixed(1) + "M ₫"; // Triệu (Million)
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}
async function loadDashboardStats() {
  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/admin/dashboard-stats`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (response.ok) {
      const stats = await response.json();

      // Đổ dữ liệu vào giao diện
      document.getElementById("stat-total-stock").innerText = stats.totalStock;
      document.getElementById("stat-active-products").innerText =
        stats.activeProducts;
      document.getElementById("stat-low-stock").innerText =
        stats.lowStockWarning;
      document.getElementById("stat-total-value").innerText =
        formatCompactCurrency(stats.totalInventoryValue);
    }
  } catch (error) {
    console.error("Lỗi khi tải số liệu thống kê:", error);
  }
}

// CẬP NHẬT: Render bảng sản phẩm, hiển thị chữ Đang hiện/Đang ẩn
function renderTable(products) {
  const tbody = document.getElementById("product-table-body");

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-secondary">Không tìm thấy sản phẩm nào.</td></tr>`;
    return;
  }

  // Định dạng tiền tệ
  const formatMoney =
    typeof UIUtils !== "undefined"
      ? UIUtils.formatCurrency
      : (val) =>
          new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(val);

  tbody.innerHTML = products
    .map((p) => {
      // 1. Giao diện trạng thái kho
      let statusHtml = "";
      if (p.stockStatus === "IN_STOCK") {
        statusHtml = `
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-body-lg font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Còn hàng
                </span>`;
      } else if (p.stockStatus === "OUT_OF_STOCK") {
        statusHtml = `
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium bg-red-50 text-ember-red border border-red-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-ember-red"></span> Hết hàng
                </span>`;
      } else {
        statusHtml = `
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-body-lg font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Đặt trước
                </span>`;
      }

      // 2. Giao diện trạng thái Hiển thị (MỚI: Hiển thị chữ thay vì nút gạt)
      const isShowing = p.isActive !== false;
      const activeHtml = isShowing
        ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-carbon-ink bg-blue-50 border border-blue-100">Đang hiện</span>`
        : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-graphite bg-gray-100 border border-gray-200">Đang ẩn</span>`;

      const thumbImg = p.thumbnail || "https://via.placeholder.com/150";

      // 3. Trả về hàng (tr) HTML
      return `
        <tr class="hover:bg-[#f1f4f3] transition-colors duration-150 cursor-default group">
            <td class="py-3 px-3">
                <div class="w-12 h-12 rounded bg-surface-container border border-ash-border/40 p-1 flex items-center justify-center overflow-hidden">
                    <img alt="${p.name}" class="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-200 ease-out" src="${thumbImg}" />
                </div>
            </td>
            <td class="py-3 px-4">
                <span class="font-body-lg font-semibold text-carbon-ink block text-[14px] group-hover:text-primary transition-colors truncate max-w-[250px]">${p.name}</span>
                <span class="font-body-lg text-[12px] text-graphite tracking-tight block mt-2">SKU: ${p.sku}</span>
            </td>
            <td class="py-3 px-4 text-center">
                <span class="font-body-lg text-carbon-ink text-[14px]">${p.categoryName || "Chưa phân loại"}</span>
            </td>
            <td class="py-3 px-4 text-center">
                <span class="font-body-lg font-semibold text-ember-red text-[14px]">${formatMoney(p.salePrice)}</span>
            </td>
            <td class="py-3 px-4 text-center">
                <span class="font-body-lg font-medium text-carbon-ink text-[14px]">${p.stock}</span>
            </td>
            <td class="py-3 px-4 text-center">${statusHtml}</td>
            <td class="py-3 px-4 text-center">${activeHtml}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2 text-graphite">
                    <button onclick="openProductModal(${p.id})" class="p-1.5 hover:text-black hover:bg-black/5 rounded transition-all duration-150 inline-flex items-center justify-center cursor-pointer active:scale-95" title="Chỉnh sửa sản phẩm">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="deleteProduct(${p.id})" class="p-1.5 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-150 inline-flex items-center justify-center cursor-pointer active:scale-95" title="Xóa khỏi hệ thống">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");
}

function renderPagination(pageData) {
  const info = document.getElementById("pagination-info");
  if (info) {
    const start = pageData.pageNo * pageData.pageSize + 1;
    const end = Math.min(start + pageData.pageSize - 1, pageData.totalElements);

    info.innerHTML =
      pageData.totalElements === 0
        ? `<span class="text-secondary text-xs font-body-sm">Không có dữ liệu</span>`
        : `<span class="text-secondary text-xs font-body-sm">Hiển thị <span class="font-medium text-carbon-ink">${start} - ${end}</span> trong tổng số <span class="font-medium text-carbon-ink font-body-sm">${pageData.totalElements}</span> sản phẩm</span>`;
  }

  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");

  if (btnPrev) btnPrev.disabled = pageData.pageNo === 0;
  if (btnNext) btnNext.disabled = pageData.last;
}

function changePage(dir) {
  currentPage += dir;
  loadProducts();
}

/* =================================================================
   XỬ LÝ MODAL (THÊM / SỬA / XÓA SẢN PHẨM)
================================================================= */

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

async function openProductModal(id = null) {
  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-form").reset();
  document.getElementById("modal-product-id").value = id || "";
  document.getElementById("modal-product-title").innerText = id
    ? "Cập nhật sản phẩm"
    : "Thêm sản phẩm mới";

  // Reset Data động
  document.getElementById("preview-thumbnail").classList.add("hidden");
  document.getElementById("modal-product-thumbnail-base64").value = "";
  document.getElementById("detail-images-container").innerHTML = "";
  document.getElementById("colors-container").innerHTML = "";
  document.getElementById("dynamic-specs-container").innerHTML = "";
  document.getElementById("specs-guide").style.display = "block";

  if (id) {
    try {
      const res = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${id}`);
      if (res.ok) {
        const product = await res.json();
        document.getElementById("modal-product-name").value = product.name;
        document.getElementById("modal-product-sku").value = product.sku;
        document.getElementById("modal-product-category").value =
          product.categoryId;
        document.getElementById("modal-product-featured").checked =
          product.isFeatured || false;
        document.getElementById("modal-product-cost-price").value =
          product.costPrice || 0;
        document.getElementById("modal-product-base-price").value =
          product.basePrice || 0;
        document.getElementById("modal-product-sale-price").value =
          product.salePrice || 0;
        document.getElementById("modal-product-stock").value =
          product.stock || 0;
        document.getElementById("modal-product-stock-status").value =
          product.stockStatus;
        document.getElementById("modal-product-is-active").value =
          product.isActive !== false ? "true" : "false";

        // Render Ảnh chính
        if (product.thumbnail) {
          document.getElementById("modal-product-thumbnail-base64").value =
            product.thumbnail;
          document.getElementById("preview-thumbnail").src = product.thumbnail;
          document
            .getElementById("preview-thumbnail")
            .classList.remove("hidden");
        }

        // Render List Ảnh phụ
        if (product.images)
          product.images.forEach((img) => addDetailImageRow(img));

        // Render List Màu
        if (product.colors)
          product.colors.forEach((c) =>
            addColorRow(c.colorName, c.colorImageUrl),
          );

        // Kích hoạt render Form Specs và đổ data cũ vào
        handleCategoryChange(product.specs);
      }
    } catch (e) {
      console.error("Lỗi lấy chi tiết:", e);
    }
  }
}

async function saveProduct() {
  const id = document.getElementById("modal-product-id").value;

  // Gom Data Ảnh phụ
  const detailImages = [];
  document.querySelectorAll(".detail-img-data").forEach((input) => {
    if (input.value) detailImages.push(input.value);
  });

  // Gom Data Màu sắc
  const colors = [];
  document.querySelectorAll(".color-row").forEach((row) => {
    const name = row.querySelector(".color-name").value.trim();
    const img = row.querySelector(".color-img-data").value;
    if (name) colors.push({ colorName: name, colorImageUrl: img });
  });

  // Gom Data Specs
  const specs = {};
  document.querySelectorAll(".spec-input").forEach((input) => {
    if (input.value.trim() !== "") {
      specs[input.dataset.specKey] = input.value.trim();
    }
  });

  // Build Request Payload
  const requestData = {
    name: document.getElementById("modal-product-name").value.trim(),
    sku: document.getElementById("modal-product-sku").value.trim(),
    categoryId: parseInt(
      document.getElementById("modal-product-category").value,
    ),
    isFeatured: document.getElementById("modal-product-featured").checked,
    costPrice: parseFloat(
      document.getElementById("modal-product-cost-price").value || 0,
    ),
    basePrice: parseFloat(
      document.getElementById("modal-product-base-price").value || 0,
    ),
    salePrice: parseFloat(
      document.getElementById("modal-product-sale-price").value || 0,
    ),
    stock: parseInt(document.getElementById("modal-product-stock").value || 0),
    stockStatus: document.getElementById("modal-product-stock-status").value,
    isActive:
      document.getElementById("modal-product-is-active").value === "true",
    thumbnail: document.getElementById("modal-product-thumbnail-base64").value,
    images: detailImages,
    colors: colors,
    specs: specs,
  };

  if (!requestData.name || !requestData.sku || !requestData.categoryId) {
    alert("Vui lòng nhập đầy đủ Tên, SKU và chọn Danh mục!");
    return;
  }

  const btn = document.getElementById("btn-save-product");
  const originalText = btn.innerText;
  if (typeof UIUtils !== "undefined") {
    UIUtils.setLoading(btn, true, "Đang lưu...");
  } else {
    btn.innerText = "Đang lưu...";
    btn.disabled = true;
  }

  try {
    const url = id
      ? `${AppConfig.PRODUCT_API_URL}/products/admin/${id}`
      : `${AppConfig.PRODUCT_API_URL}/products/admin`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      alert(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
      closeProductModal();
      loadProducts();
    } else {
      alert("Lỗi: " + (await response.text()));
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ");
  } finally {
    if (typeof UIUtils !== "undefined") {
      UIUtils.setLoading(btn, false, "Lưu sản phẩm");
    } else {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  }
}

async function deleteProduct(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này vĩnh viễn?")) return;

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/admin/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (response.ok) {
      alert("Đã xóa sản phẩm!");
      loadProducts();
    } else {
      const err = await response.text();
      alert("Không thể xóa: " + err);
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ");
  }
}

// Hàm mới: Tải file lên server và nhận lại URL
async function uploadImageToServer(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AuthUtils.getToken()}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error("Lỗi khi tải ảnh lên máy chủ");
    }

    const imageUrl = await response.text();
    return imageUrl;
  } catch (error) {
    console.error("Lỗi upload:", error);
    alert("Không thể tải ảnh lên, vui lòng thử lại!");
    return null;
  }
}

// Thêm hàm này vào phần XỬ LÝ ẢNH & THÔNG SỐ
async function deleteImageFromServer(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("http")) return; // Bỏ qua nếu không có URL hoặc là ảnh base64 cũ

  try {
    await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/upload?fileUrl=${encodeURIComponent(fileUrl)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    console.log("Đã dọn rác ảnh:", fileUrl);
  } catch (e) {
    console.error("Lỗi khi xóa ảnh rác:", e);
  }
}

document
  .getElementById("upload-thumbnail")
  ?.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (file) {
      const preview = document.getElementById("preview-thumbnail");
      const hiddenInput = document.getElementById(
        "modal-product-thumbnail-base64",
      );

      // MỚI: Nếu trước đó đã có URL ảnh, báo server xóa nó đi vì người dùng đã chọn ảnh khác
      const oldUrl = hiddenInput.value;
      if (oldUrl && oldUrl.startsWith("http")) {
        await deleteImageFromServer(oldUrl);
      }

      preview.src = "https://via.placeholder.com/150?text=Uploading...";
      preview.classList.remove("hidden");

      const imageUrl = await uploadImageToServer(file);

      if (imageUrl) {
        hiddenInput.value = imageUrl;
        preview.src = imageUrl;
      } else {
        preview.classList.add("hidden");
      }
    }
  });

function addDetailImageRow(existingUrl = "") {
  const container = document.getElementById("detail-images-container");
  const rowId = Date.now() + Math.random();
  const div = document.createElement("div");
  // Dùng nền surface, viền mist
  div.className =
    "flex items-center justify-between gap-3 bg-surface p-3 rounded-md border border-mist detail-img-row";
  div.innerHTML = `
        <div class="flex items-center gap-3 flex-1">
            <input type="file" accept="image/*" class="text-sm text-graphite file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-ash-border file:bg-paper-white file:text-xs file:font-medium hover:file:bg-mist cursor-pointer" onchange="previewDetailRow(this, '${rowId}')">
            <input type="hidden" class="detail-img-data" value="${existingUrl}">
            <img id="preview-img-${rowId}" src="${existingUrl}" class="w-10 h-10 object-cover rounded border border-mist bg-paper-white ${existingUrl ? "" : "hidden"}">
        </div>
        <button type="button" onclick="removeImageRow(this)" class="text-ember-red hover:text-red-700 p-1 flex items-center justify-center rounded transition-colors" title="Xóa ảnh này">
            <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
    `;
  container.appendChild(div);
}
// Hàm xử lý việc tải ảnh lên cho Ảnh chi tiết và Ảnh màu sắc
async function previewDetailRow(inputEl, rowId) {
    if (inputEl.files[0]) {
        const file = inputEl.files[0];
        const img = document.getElementById(`preview-img-${rowId}`);
        const hiddenInput = inputEl.nextElementSibling; // Thẻ input ẩn chứa dữ liệu (URL cũ nếu có)
        
        // --- PHẦN MÃ BỔ SUNG ĐỂ SỬA LỖI ---
        // Lấy đường dẫn URL cũ trước khi nó bị ghi đè
        const oldUrl = hiddenInput.value;
        
        // Kiểm tra nếu có ảnh cũ thì gửi yêu cầu xóa ảnh đó trên server
        if (oldUrl && oldUrl.startsWith("http")) {
            console.log("Phát hiện ảnh cũ bị ghi đè, tiến hành xóa:", oldUrl);
            await deleteImageFromServer(oldUrl);
        }
        // -----------------------------------

        // Hiển thị chữ "Uploading..." tạm thời để báo cho người dùng biết hệ thống đang xử lý
        img.src = "https://via.placeholder.com/40?text=Uploading...";
        img.classList.remove("hidden");

        // Gọi API tải ảnh mới lên server
        const imageUrl = await uploadImageToServer(file);

        if (imageUrl) {
            // Lưu URL mới từ server trả về vào input ẩn
            hiddenInput.value = imageUrl; 
            // Hiển thị ảnh thật cho người dùng xem
            img.src = imageUrl;           
        } else {
            // Nếu có lỗi khi tải ảnh lên, ẩn thẻ ảnh và xóa dữ liệu
            img.classList.add("hidden");
            hiddenInput.value = ""; 
            inputEl.value = ""; // Làm sạch giá trị file input
        }
    }
}
function addColorRow(name = "", imgUrl = "") {
  const container = document.getElementById("colors-container");
  const rowId = Date.now() + Math.random();
  const div = document.createElement("div");
  // Dùng nền surface, viền mist, focus:carbon-ink
  div.className =
    "bg-surface p-3 rounded-md border border-mist color-row flex flex-col gap-3 relative";
  div.innerHTML = `
        <div class="flex items-center gap-2 pr-6">
            <input type="text" placeholder="Tên biến thể (VD: Đen Titan)..." class="color-name w-full h-9 px-3 text-sm border border-ash-border rounded-md focus:border-carbon-ink focus:ring-1 focus:ring-carbon-ink outline-none" value="${name}">
        </div>
        <div class="flex items-center gap-3">
            <input type="file" accept="image/*" class="text-sm text-graphite file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-ash-border file:bg-paper-white file:text-xs file:font-medium hover:file:bg-mist cursor-pointer" onchange="previewDetailRow(this, '${rowId}')">
            <input type="hidden" class="color-img-data" value="${imgUrl}">
            <img id="preview-img-${rowId}" src="${imgUrl}" class="w-10 h-10 object-cover rounded border border-mist bg-paper-white ${imgUrl ? "" : "hidden"}">
        </div>
        <button type="button" onclick="removeImageRow(this)" class="absolute top-3 right-3 text-ember-red hover:text-red-700 transition-colors" title="Xóa màu này">
            <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
    `;
  container.appendChild(div);
}

function handleCategoryChange(existingSpecs = null) {
  const catId = parseInt(
    document.getElementById("modal-product-category").value,
  );
  const container = document.getElementById("dynamic-specs-container");
  const guide = document.getElementById("specs-guide");
  container.innerHTML = "";

  if (!catId) {
    guide.style.display = "block";
    return;
  }
  guide.style.display = "none";

  let cat = allCategoriesAdmin.find((c) => c.id === catId);
  let configJsonString = cat?.displayConfig;

  if (!configJsonString && cat?.parentId) {
    let parentCat = allCategoriesAdmin.find((c) => c.id === cat.parentId);
    configJsonString = parentCat?.displayConfig;
  }

  if (!configJsonString) {
    container.innerHTML = `<p class="text-sm text-amber-600 italic col-span-2">Danh mục này chưa được định nghĩa cấu trúc thông số kỹ thuật.</p>`;
    return;
  }

  try {
    const config = JSON.parse(configJsonString);
    const labels = config.labels;

    if (labels) {
      Object.keys(labels).forEach((key) => {
        const viName = labels[key];
        const value = existingSpecs ? existingSpecs[key] || "" : "";
        // Cập nhật viền (ash-border) và hiệu ứng focus (carbon-ink)
        container.innerHTML += `
                    <div>
                        <label class="block text-sm font-bold text-carbon-ink mb-1.5">${viName}</label>
                        <input type="text" data-spec-key="${key}" value="${value}" placeholder="Nhập ${viName.toLowerCase()}..." class="spec-input w-full h-10 px-3 rounded-md border border-ash-border focus:ring-carbon-ink focus:border-carbon-ink text-sm outline-none transition-colors">
                    </div>
                `;
      });
    }
  } catch (e) {
    console.error("Lỗi parse config JSON", e);
    container.innerHTML = `<p class="text-sm text-ember-red italic col-span-2">Cấu hình JSON của danh mục bị lỗi định dạng!</p>`;
  }
}
async function removeImageRow(btnElement) {
  // 1. Tìm thẻ cha chứa hàng (row)
  const row = btnElement.parentElement;

  // 2. Tìm thẻ input ẩn lưu URL bên trong hàng đó (dùng chung class 'detail-img-data' hoặc 'color-img-data')
  const hiddenInput = row.querySelector(".detail-img-data, .color-img-data");

  // 3. Xóa file trên server nếu đã có URL
  if (hiddenInput && hiddenInput.value) {
    await deleteImageFromServer(hiddenInput.value);
  }

  // 4. Xóa giao diện HTML
  row.remove();
}
