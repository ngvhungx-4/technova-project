document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  const searchInput = document.getElementById("search-category");
  if (searchInput) {
    // tìm kiếm real-time ngay khi người dùng đang gõ
    searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.trim().toLowerCase();

      // Nếu ô tìm kiếm rỗng, hiển thị lại toàn bộ
      if (!keyword) {
        renderTable(categoriesData);
        return;
      }

      const filteredCategories = categoriesData.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          (c.parentName && c.parentName.toLowerCase().includes(keyword)),
      );

      renderTable(filteredCategories);
    });
  }
});

let categoriesData = [];

// TẢI DANH SÁCH DANH MỤC
async function loadCategories() {
  const tbody = document.getElementById("category-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8"><span class="material-symbols-outlined animate-spin text-primary">progress_activity</span> Đang tải...</td></tr>`;

  try {
    // GỌI SANG PRODUCT SERVICE
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/all`,
      {
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );
    if (!res.ok) throw new Error("Lỗi tải dữ liệu");

    categoriesData = await res.json();
    renderTable(categoriesData);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

// RENDER BẢNG DANH MỤC
function renderTable(categories) {
  const tbody = document.getElementById("category-table-body");

  // Cập nhật số lượng tổng cộng danh mục hiển thị trên màn hình
  const infoText = document.getElementById("category-count-info");
  if (infoText) {
    infoText.innerText = `Tổng cộng: ${categories.length} danh mục`;
  }

  if (categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-graphite font-body-lg">Không tìm thấy danh mục nào.</td></tr>`;
    return;
  }

  // ==========================================
  // BƯỚC ĐƯỢC SỬA: TÍNH TỔNG KHO CHÍNH XÁC
  // ==========================================
  // Sử dụng mảng gốc categoriesData để tổng kho không bị thay đổi khi người dùng tìm kiếm.
  // Chỉ cộng các danh mục CHÍNH (không có parentName) để tránh tính trùng sản phẩm của danh mục con.
  const totalProducts = categoriesData.reduce((sum, cat) => {
    if (!cat.parentName) {
      // Kiểm tra nếu đây là danh mục cha
      return sum + (cat.productCount || 0);
    }
    return sum; // Nếu là danh mục con thì bỏ qua không cộng vào tổng
  }, 0);

  tbody.innerHTML = categories
    .map((c) => {
      const displayName = c.parentName
        ? `${c.parentName} &rsaquo; ${c.name}`
        : c.name;
      const defaultImg = "https://placehold.co/100x100?text=Cate";
      const imgUrl = c.imageUrl || defaultImg;

      const statusHtml = c.isFeatured
        ? `<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-carbon-ink text-paper-white font-label-caps text-xs tracking-wider">
               <span class="material-symbols-outlined text-amber-300 text-xs" style="font-variation-settings: 'FILL' 1;" data-icon="star">star</span>
               <span>NỔI BẬT</span>
           </div>`
        : `<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fog border border-ash-border text-graphite font-label-caps text-xs tracking-wider">
               <span class="w-1.5 h-1.5 rounded-full bg-graphite"></span>
               <span>BÌNH THƯỜNG</span>
           </div>`;

      // Tính toán phần trăm dựa trên tổng kho đã được sửa lỗi
      const count = c.productCount || 0;
      let percentValue = 0;

      // Phòng trường hợp kho rỗng để tránh lỗi chia cho 0
      if (totalProducts > 0) {
        percentValue = (count / totalProducts) * 100;
      }

      const percentText = percentValue.toFixed(1);
      const barColorClass = c.isFeatured ? "bg-carbon-ink" : "bg-graphite";

      return `
        <tr class="hover:bg-fog/30 transition-colors group">
            <!-- Cột 1: Thông tin danh mục -->
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded bg-fog border border-ash-border flex items-center justify-center shrink-0 overflow-hidden">
                        <img class="w-full h-full object-cover" src="${imgUrl}" alt="${c.name}">
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-body-lg font-semibold text-sm text-carbon-ink group-hover:underline cursor-pointer">
                                ${displayName}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            
            <!-- Cột 2: Tiến trình sản phẩm -->
            <td class="py-4 px-4 text-center">
                <div class="flex flex-col gap-1.5">
                    <div class="flex justify-between items-baseline font-body-lg text-sm">
                        <span class="font-bold text-carbon-ink">${count}</span>
                        <span class="text-graphite text-[12px]">${percentText}% tổng kho</span>
                    </div>
                    <div class="w-full h-1.5 bg-fog rounded-full overflow-hidden">
                        <div class="${barColorClass} h-full rounded-full transition-all duration-500" style="width: ${percentValue}%;"></div>
                    </div>
                </div>
            </td>
            
            <!-- Cột 3: Trạng thái -->
            <td class="py-4 px-4 text-center">
                ${statusHtml}
            </td>
            
            <!-- Cột 4: Nút hành động -->
            <td class="py-4 px-4 text-center">
                <div class="flex items-center justify-end gap-1">
                    <button onclick="openCategoryModal(${c.id})" class="w-8 h-8 rounded-lg flex items-center justify-center text-graphite hover:text-carbon-ink hover:bg-fog transition-all duration-200 hover:scale-105 active:scale-95" title="Chỉnh sửa danh mục" type="button">
                        <span class="material-symbols-outlined text-base" data-icon="edit">edit</span>
                    </button>
                    <button onclick="deleteCategory(${c.id})" class="w-8 h-8 rounded-lg flex items-center justify-center text-graphite hover:text-ember-red hover:bg-red-50 transition-all duration-200 hover:scale-105 active:scale-95" title="Xóa danh mục" type="button">
                        <span class="material-symbols-outlined text-base" data-icon="delete">delete</span>
                    </button>
                </div>
            </td>
        </tr>
      `;
    })
    .join("");
}

function openCategoryModal(id = null) {
  document.getElementById("category-modal").classList.remove("hidden");
  const isEdit = id !== null;
  document.getElementById("modal-title").innerText = isEdit
    ? "Sửa danh mục"
    : "Thêm danh mục mới";

  // Reset biến file ảnh mỗi khi mở form
  categoryImageFile = null;
  const preview = document.getElementById("modal-cat-img-preview");

  // Đổ danh sách danh mục cha
  const parentSelect = document.getElementById("modal-cat-parent");
  parentSelect.innerHTML = '<option value="">-- Trống (Đây là danh mục gốc) --</option>';
  categoriesData.forEach((c) => {
    if (c.id !== id) {
      parentSelect.innerHTML += `<option value="${c.id}">${c.parentName ? c.parentName + " > " : ""}${c.name}</option>`;
    }
  });

  if (isEdit) {
    const cat = categoriesData.find((c) => c.id === id);
    document.getElementById("modal-cat-id").value = cat.id;
    document.getElementById("modal-cat-name").value = cat.name;
    document.getElementById("modal-cat-featured").checked = cat.isFeatured;
    document.getElementById("modal-cat-parent").value = cat.parentId || "";
    
    // Hiển thị ảnh hiện tại nếu có
    if (cat.imageUrl) {
        preview.innerHTML = `<img src="${cat.imageUrl}" class="w-full h-full object-cover" />`;
        preview.dataset.existingUrl = cat.imageUrl; // Lưu tạm URL cũ
    } else {
        preview.innerHTML = `<span class="material-symbols-outlined text-4xl">add_photo_alternate</span>`;
        preview.dataset.existingUrl = "";
    }
  } else {
    document.getElementById("modal-cat-id").value = "";
    document.getElementById("modal-cat-name").value = "";
    document.getElementById("modal-cat-featured").checked = true;
    document.getElementById("modal-cat-parent").value = "";
    
    // Đưa khung ảnh về trạng thái trống
    preview.innerHTML = `<span class="material-symbols-outlined text-4xl">add_photo_alternate</span>`;
    preview.dataset.existingUrl = "";
  }
}

function closeCategoryModal() {
  document.getElementById("category-modal").classList.add("hidden");
}

async function saveCategory() {
  const id = document.getElementById("modal-cat-id").value;
  const name = document.getElementById("modal-cat-name").value.trim();
  const isFeatured = document.getElementById("modal-cat-featured").checked;
  const parentId = document.getElementById("modal-cat-parent").value;
  const btn = document.getElementById("btn-save-category");

  if (!name) {
    alert("Vui lòng nhập tên danh mục!");
    return;
  }

  // Đổi trạng thái nút bấm (Cần chắc chắn bạn đã có UIUtils.setLoading trong common.js)
  const originalBtnText = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>ĐANG XỬ LÝ...</span>`;
  btn.disabled = true;

  try {
    // 1. TẢI ẢNH LÊN MÁY CHỦ (NẾU CÓ CHỌN ẢNH MỚI)
    let finalImageUrl = document.getElementById("modal-cat-img-preview").dataset.existingUrl || null;

    if (categoryImageFile) {
        const formData = new FormData();
        formData.append("file", categoryImageFile);

        // Gọi API Upload của ProductService
        const uploadRes = await fetch(`${AppConfig.PRODUCT_API_URL}/products/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
            body: formData
        });

        if (uploadRes.ok) {
            finalImageUrl = await uploadRes.text(); // Lấy đường dẫn URL trả về
        } else {
            throw new Error("Lỗi tải ảnh lên máy chủ!");
        }
    }

    // 2. GỌI API LƯU DANH MỤC
    const payload = {
      name: name,
      isFeatured: isFeatured,
      displayConfig: null,
      parentId: parentId ? parseInt(parentId) : null,
      imageUrl: finalImageUrl // THÊM TRƯỜNG NÀY ĐỂ GỬI LÊN BACKEND
    };

    const method = id ? "PUT" : "POST";
    const url = id
      ? `${AppConfig.PRODUCT_API_URL}/categories/admin/${id}`
      : `${AppConfig.PRODUCT_API_URL}/categories/admin`;

    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthUtils.getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
      closeCategoryModal();
      loadCategories(); // Tải lại bảng để thấy ảnh mới
    } else {
      alert("Lỗi: " + (await res.text()));
    }
  } catch (e) {
    alert(e.message || "Lỗi hệ thống!");
  } finally {
    // Khôi phục trạng thái nút bấm
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
}

async function deleteCategory(id) {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm bên trong có thể bị ảnh hưởng!",
    )
  )
    return;

  try {
    const res = await fetch(
      `${AppConfig.PRODUCT_API_URL}/categories/admin/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      },
    );

    if (res.ok) {
      alert("Đã xóa danh mục!");
      loadCategories();
    } else alert("Không thể xóa danh mục này!");
  } catch (e) {
    alert("Lỗi hệ thống!");
  }
}
// Biến toàn cục để lưu trữ file ảnh, chuẩn bị cho bước gọi API Upload sau này
let categoryImageFile = null;

// Hàm xử lý hiển thị ảnh xem trước
function handleCategoryImagePreview(inputElement) {
  // Lấy file đầu tiên mà người dùng vừa chọn
  const file = inputElement.files[0];

  if (!file) {
    return; // Nếu người dùng ấn "Hủy" trong hộp thoại chọn file thì không làm gì cả
  }

  // Kiểm tra dung lượng file (giới hạn 2MB để hệ thống chạy mượt mà)
  if (file.size > 2 * 1024 * 1024) {
    alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
    inputElement.value = ""; // Xóa file không hợp lệ khỏi ô input
    return;
  }

  // Lưu file vào biến toàn cục để dành cho lúc bấm nút "Lưu danh mục"
  categoryImageFile = file;

  // Sử dụng FileReader để đọc file và chuyển thành URL hiển thị lên màn hình
  const reader = new FileReader();

  reader.onload = function (event) {
    // Tìm thẻ div dùng để chứa ảnh xem trước
    const previewContainer = document.getElementById("modal-cat-img-preview");

    // Xóa biểu tượng camera cũ và thay bằng thẻ <img> chứa ảnh thật
    previewContainer.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover" alt="Preview" />`;
  };

  // Kích hoạt tiến trình đọc file
  reader.readAsDataURL(file);
}
