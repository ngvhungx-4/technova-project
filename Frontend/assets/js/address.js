let autocompleteTimeout = null;

const AddressManager = {
  isAddressSelected: false,

  // 1. KHỞI TẠO
  async init() {
    await this.injectModal();
    this.renderAddresses();
    this.setupAutocomplete();
  },
  // MỚI: Hàm tải Component HTML từ file bên ngoài
  async injectModal() {
    // Nếu modal đã tồn tại trên trang thì không tạo thêm nữa
    if (document.getElementById("address-modal")) return;

    try {
      // Dùng fetch để gọi file HTML.
      // LƯU Ý: Đường dẫn này tính từ nơi file HTML chính (cart.html) đang chạy
      const response = await fetch("assets/modal/address_modal.html");

      if (!response.ok) {
        throw new Error(`Không thể tải component (Lỗi ${response.status})`);
      }

      // Chuyển kết quả lấy được thành dạng văn bản (text)
      const modalHTML = await response.text();

      // Chèn mã HTML vào cuối thẻ <body> của trang
      document.body.insertAdjacentHTML("beforeend", modalHTML);
    } catch (error) {
      console.error("Lỗi khi chèn modal địa chỉ:", error);
    }
  },

  // 2. TÍNH NĂNG GỢI Ý ĐỊA CHỈ TỰ ĐỘNG (AUTOCOMPLETE)
  setupAutocomplete() {
    const addressInput = document.getElementById("fullAddress");
    const suggestionBox = document.getElementById("suggestionBox");

    addressInput.addEventListener("input", (e) => {
      // MỚI: Bất cứ khi nào người dùng gõ vào ô, reset trạng thái chọn về false
      this.isAddressSelected = false;

      clearTimeout(autocompleteTimeout);
      const text = e.target.value.trim();

      if (text.length < 2) {
        suggestionBox.classList.add("hidden");
        return;
      }

      autocompleteTimeout = setTimeout(async () => {
        try {
          const url = `${AppConfig.BASE_URL}/locations/autocomplete?text=${encodeURIComponent(text)}`;

          const res = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${AuthUtils.getToken()}`,
            },
          });

          if (!res.ok) throw new Error("Lỗi mạng hoặc chưa xác thực");

          const suggestions = await res.json();
          console.log("Dữ liệu gợi ý từ Backend:", suggestions);

          if (suggestions.length > 0) {
            suggestionBox.innerHTML = suggestions
              .map(
                (s) => `
              <div class="p-3 hover:bg-surface-container-low cursor-pointer text-[16px] font-body-sm text-carbon-ink border-b border-mist last:border-0" 
                   onclick="AddressManager.selectSuggestion('${s.display}')">
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
          console.error("Lỗi khi lấy gợi ý địa chỉ:", error);
        }
      }, 500);
    });

    document.addEventListener("click", (e) => {
      if (
        !addressInput.contains(e.target) &&
        !suggestionBox.contains(e.target)
      ) {
        suggestionBox.classList.add("hidden");
      }
    });
  },

  // Khi click chọn 1 địa chỉ
  selectSuggestion(displayAddress) {
    document.getElementById("fullAddress").value = displayAddress;
    document.getElementById("suggestionBox").classList.add("hidden");

    // MỚI: Đánh dấu là đã chọn địa chỉ hợp lệ từ danh sách
    this.isAddressSelected = true;
  },

  // 3. HIỂN THỊ DANH SÁCH ĐỊA CHỈ TRÊN MÀN HÌNH CHÍNH
  async renderAddresses() {
    const container = document.getElementById("address-list-container");

    // Nếu không tìm thấy HTML, in ra cảnh báo màu vàng
    if (!container) {
      return;
    }

    try {
      container.innerHTML =
        '<div class="p-10 text-center text-graphite font-body-sm">Đang tải danh sách địa chỉ...</div>';

      const token = AuthUtils.getToken();
      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.");
      }

      const response = await fetch(
        `${AppConfig.BASE_URL}/users/addresses/all`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Máy chủ từ chối kết nối (Mã lỗi: ${response.status})`);
      }

      const addresses = await response.json();

      if (addresses.length === 0) {
        container.innerHTML =
          '<div class="p-10 text-center text-graphite font-body-sm">Bạn chưa có địa chỉ nào. Hãy ấn Thêm Địa Chỉ Mới nhé!</div>';
        return;
      }

      // 6. Xóa chữ "Đang tải" và vẽ dữ liệu
      container.innerHTML = "";
      addresses.forEach((addr) => {
        const item = document.createElement("div");
        item.className =
          "flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-outline-variant/30 gap-4 hover:bg-surface-container-high/50 transition-colors";

        item.innerHTML = `
            <div class="flex flex-col gap-1.5 min-w-0">
                <div class="flex items-center gap-3">
                    <span class="font-medium text-on-surface truncate">${addr.receiverName} - ${addr.phoneNumber}</span>
                    ${addr.addressName ? `<span class="px-2 py-0.5 border border-carbon-ink text-carbon-ink text-[10px] font-body-sm uppercase tracking-widest">${addr.addressName}</span>` : ""}
                    ${addr.isDefault ? `<span class="px-2 py-0.5 bg-carbon-ink text-paper-white text-[10px] font-body-sm uppercase tracking-widest">Mặc định</span>` : ""}
                </div>
                <p class="text-sm text-on-surface-variant truncate mt-1">
                    ${addr.fullAddress}
                </p>
            </div>
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                ${
                  !addr.isDefault
                    ? `
                <button onclick="AddressManager.setDefault(${addr.addressId})" class="text-[12px] font-body-sm font-bold uppercase tracking-widest text-carbon-ink hover:underline">Đặt mặc định</button>
                <div class="w-px h-4 bg-mist mx-2"></div>
                `
                    : ""
                }
                <button onclick="AddressManager.edit(${addr.addressId})" class="text-[12px] font-body-sm font-bold uppercase tracking-widest text-carbon-ink hover:underline">Chỉnh sửa</button>
                <div class="w-px h-4 bg-mist mx-2"></div>
                <button onclick="AddressManager.delete(${addr.addressId})" class="text-[12px] font-body-sm font-bold uppercase tracking-widest text-error hover:underline">Xóa</button>
            </div>
        `;
        container.appendChild(item);
      });
    } catch (error) {
      console.error("Lỗi render:", error);
    }
  },
  // 4. LƯU (THÊM MỚI HOẶC CẬP NHẬT)
  async save() {
    // MỚI: Bắt lỗi nếu người dùng chưa chọn từ danh sách hoặc cố tình sửa tay
    if (!this.isAddressSelected) {
      alert("Vui lòng tìm và click chọn một địa chỉ từ danh sách gợi ý!");
      return;
    }

    const payload = {
      addressId: document.getElementById("address-id").value || null,
      receiverName: document.getElementById("receiverName").value.trim(),
      phoneNumber: document.getElementById("phoneNumber").value.trim(),
      fullAddress: document.getElementById("fullAddress").value.trim(),
      addressName: document.getElementById("addressName").value.trim(),
      isDefault: document.getElementById("isDefault").checked,
    };

    try {
      const method = payload.addressId ? "PUT" : "POST";
      const url = payload.addressId
        ? `${AppConfig.BASE_URL}/users/addresses/${payload.addressId}`
        : `${AppConfig.BASE_URL}/users/addresses`;

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${AuthUtils.getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toggleModal(false);
        this.renderAddresses();
        if (typeof loadAddresses === "function") {
          loadAddresses();
        }
      } else {
        const err = await response.text();
        alert("Lỗi: " + err);
      }
    } catch (error) {
      alert("Lỗi kết nối khi lưu!");
    }
  },

  // 5. MỞ POPUP ĐỂ CHỈNH SỬA
  async edit(addressId) {
    try {
      const response = await fetch(
        `${AppConfig.BASE_URL}/users/addresses/${addressId}`,
        {
          headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
        },
      );
      const addr = await response.json();

      document.getElementById("address-id").value = addr.addressId;
      document.getElementById("receiverName").value = addr.receiverName;
      document.getElementById("phoneNumber").value = addr.phoneNumber;
      document.getElementById("fullAddress").value = addr.fullAddress;
      document.getElementById("addressName").value = addr.addressName || "";
      document.getElementById("isDefault").checked = addr.isDefault;

      // MỚI: Khi mở form sửa, địa chỉ cũ đã là hợp lệ nên cờ bằng true
      this.isAddressSelected = true;

      toggleModal(true, true);
    } catch (error) {
      console.error("Lỗi lấy thông tin:", error);
    }
  },

  async delete(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;
    try {
      const res = await fetch(`${AppConfig.BASE_URL}/users/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
      });
      if (res.ok) this.renderAddresses();
      else alert(await res.text());
    } catch (error) {
      console.error(error);
    }
  },

  async setDefault(id) {
    try {
      const res = await fetch(
        `${AppConfig.BASE_URL}/users/addresses/${id}/default`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${AuthUtils.getToken()}` },
        },
      );
      if (res.ok) this.renderAddresses();
    } catch (error) {
      console.error(error);
    }
  },
};

// --- QUẢN LÝ TRẠNG THÁI MODAL (POPUP) ---
window.toggleModal = function (isOpen, isEdit = false) {
  const modal = document.getElementById("address-modal");
  const form = document.getElementById("address-form");
  const title = document.getElementById("modal-title");
  const btnSubmit = document.getElementById("btn-submit");

  if (isOpen) {
    // 1. Xóa ẩn và thêm thuộc tính flex để kích hoạt căn giữa
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (!isEdit) {
      form.reset();
      document.getElementById("address-id").value = "";
      title.innerText = "Thêm địa chỉ mới";
      btnSubmit.innerText = "Lưu";
      AddressManager.isAddressSelected = false;
    } else {
      title.innerText = "Chỉnh sửa địa chỉ";
      btnSubmit.innerText = "Cập nhật";
    }
  } else {
    // 2. Thêm ẩn và xóa thuộc tính flex khi đóng
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("suggestionBox").classList.add("hidden");
  }
};
document.addEventListener("DOMContentLoaded", () => AddressManager.init());
