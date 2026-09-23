const AppConfig = {
  BASE_URL: "http://localhost:8080/api",
  PRODUCT_API_URL: "http://localhost:8080/api",
  CART_API_URL: "http://localhost:8080/api/cart",
  ORDER_API_URL: "http://localhost:8080/api",
  FLASHSALE_API_URL: "http://localhost:8080/api/flash-sales",
  KEYS: {
    TOKEN: "accessToken",
    USER_ID: "userId",
    EMAIL: "userEmail",
    FULL_NAME: "userFullName",
    ROLE: "userRole",
    AVATAR: "userAvatar",
    PHONE: "userPhone",
    SESSION_ID: "sessionId",
  },
};

const AuthUtils = {
  getToken() {
    return (
      sessionStorage.getItem(AppConfig.KEYS.TOKEN) ||
      localStorage.getItem(AppConfig.KEYS.TOKEN)
    );
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  getUserInfo(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  },
  saveAuthData(token, userData, isRemember = false) {
    const storage = isRemember ? localStorage : sessionStorage;
    const otherStorage = isRemember ? sessionStorage : localStorage;
    otherStorage.clear();

    storage.setItem(AppConfig.KEYS.TOKEN, token);
    if (userData) {
      if (userData.userId)
        storage.setItem(AppConfig.KEYS.USER_ID, userData.userId);
      if (userData.email) storage.setItem(AppConfig.KEYS.EMAIL, userData.email);
      if (userData.fullName)
        storage.setItem(AppConfig.KEYS.FULL_NAME, userData.fullName);
      if (userData.role) storage.setItem(AppConfig.KEYS.ROLE, userData.role);
      if (userData.avatar)
        storage.setItem(AppConfig.KEYS.AVATAR, userData.avatar);
      if (userData.phone) storage.setItem(AppConfig.KEYS.PHONE, userData.phone);
    }
  },
  logout(force = false) {
    if (!force) {
      if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        return;
      }
    }

    // 1. Xóa các thông tin của User (Giữ lại Session-Id của giỏ hàng)
    Object.values(AppConfig.KEYS).forEach((key) => {
      if (key !== AppConfig.KEYS.SESSION_ID) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    });

    // 2. THÊM VÀO ĐÂY: Xóa trạng thái Khách vãng lai
    localStorage.removeItem("isGuestMode");

    window.location.replace("home.html");
  },
  parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  },
  requireAdmin() {
    if (!this.isLoggedIn()) {
      alert("Vui lòng đăng nhập để truy cập trang quản trị!");
      window.location.href = "login.html";
      return false;
    }
    const role = this.getUserInfo(AppConfig.KEYS.ROLE);

    if (role !== "ADMIN" && role !== "ROLE_ADMIN") {
      alert("Truy cập bị từ chối! Bạn không có quyền quản trị viên.");
      window.location.href = "home.html";
      return false;
    }
    return true;
  },
  // THÊM MỚI HÀM NÀY: Xử lý khi người dùng bấm vào nút "Khách"
  continueAsGuest() {
    // Gọi hàm ApiUtils để chắc chắn rằng Session-Id vãng lai đã được tạo
    ApiUtils.getOrCreateSessionId();
    localStorage.setItem("isGuestMode", "true");

    alert(
      "Chào mừng! Bạn đang trải nghiệm mua sắm với tư cách Khách vãng lai.",
    );

    window.location.href = "home.html";
  },
};

// ==========================================
// THÊM MỚI: QUẢN LÝ KẾT NỐI API & SESSION
// ==========================================
const ApiUtils = {
  getOrCreateSessionId() {
    let sessionId = localStorage.getItem(AppConfig.KEYS.SESSION_ID);
    if (!sessionId) {
      // Tạo mã ngẫu nhiên cho khách vãng lai
      sessionId = "guest_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(AppConfig.KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  },

  async fetchAPI(endpoint, options = {}) {
    const token = AuthUtils.getToken();
    const sessionId = this.getOrCreateSessionId();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Gắn Session-Id cho mọi Request
    headers["Session-Id"] = sessionId;

    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${AppConfig.BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // ĐÃ SỬA: Kiểm tra an toàn lỗi 401
      if (response.status === 401) {
        // Chỉ đăng xuất và chuyển hướng NẾU người dùng đang có Token
        if (AuthUtils.isLoggedIn()) {
          AuthUtils.logout(true);
        }
        throw new Error("Lỗi xác thực hoặc không có quyền truy cập.");
      }

      // Xử lý text trả về (tránh lỗi khi API trả về rỗng)
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text }; // Nếu không phải JSON, bọc vào object message
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Có lỗi xảy ra từ máy chủ",
        );
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};
// ==========================================

const UIUtils = {
  setLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (text) btn.innerText = text;
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector("span");
    if (!input || !icon) return;

    if (input.type === "password") {
      input.type = "text";
      icon.innerText = "visibility";
    } else {
      input.type = "password";
      icon.innerText = "visibility_off";
    }
  },

  getInitials(name) {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "US";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  toggleUserMenu() {
    const menu = document.getElementById("user-dropdown");
    if (menu) menu.classList.toggle("hidden");
  },

  renderBreadcrumb(containerId, paths) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <nav aria-label="Breadcrumb" class="flex text-body-sm text-on-surface-variant mb-6 w-full">
        <ol class="inline-flex items-center space-x-1 md:space-x-3 w-full flex-wrap">
          <li class="inline-flex items-center">
            <a class="hover:text-primary transition-colors" href="home.html">Trang chủ</a>
          </li>
    `;

    paths.forEach((path, index) => {
      const isLast = index === paths.length - 1;

      html += `
          <li ${isLast ? 'aria-current="page"' : ""}>
            <div class="flex items-center">
              <span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
              ${
                path.url && !isLast
                  ? `<a href="${path.url}" class="hover:text-primary transition-colors">${path.label}</a>`
                  : `<span class="text-on-surface truncate max-w-[200px] md:max-w-none" title="${path.label}">${path.label}</span>`
              }
            </div>
          </li>
      `;
    });

    html += `
        </ol>
      </nav>
    `;

    container.innerHTML = html;
  },

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  },
};

const HeaderLogic = {
  updateHeaderState() {
    const isLoggedIn = AuthUtils.isLoggedIn();
    const isGuestMode = localStorage.getItem("isGuestMode") === "true"; // Kiểm tra xem có đang ở chế độ khách không

    const guestActions = document.getElementById("guest-actions");
    const userActions = document.getElementById("user-actions");

    if (guestActions && userActions) {
      if (isLoggedIn || isGuestMode) {
        // Bật Layout của User/Guest, Tắt layout gốc
        guestActions.classList.add("hidden");
        guestActions.classList.remove("flex");
        userActions.classList.remove("hidden");
        userActions.classList.add("flex");

        this.updateCartBadge();

        // Tìm các thành phần cần điều khiển
        const notifBtn = document.getElementById("header-notification-btn");
        const profileGroup = document.getElementById("header-user-profile");
        const dropdownArrow = document.getElementById("header-dropdown-arrow");
        const dropdownContent = document.getElementById(
          "header-dropdown-content",
        );

        if (isLoggedIn) {
          // ==========================================
          // TRẠNG THÁI: USER (ĐÃ ĐĂNG NHẬP)
          // ==========================================
          if (notifBtn) notifBtn.classList.remove("hidden");
          if (dropdownArrow) dropdownArrow.classList.remove("hidden");
          if (dropdownContent) dropdownContent.classList.remove("hidden");
          if (profileGroup)
            profileGroup.classList.add("group", "cursor-pointer");

          // Hiển thị lại toàn bộ menu của User
          if (dropdownContent) {
            const menuItems = dropdownContent.querySelectorAll("a");
            const separators = dropdownContent.querySelectorAll("div.border-t");
            menuItems.forEach((item) => {
              item.classList.remove("hidden");
              // Phục hồi lại nút Đăng xuất
              if (item.getAttribute("onclick")?.includes("logout")) {
                item.innerHTML = `Đăng xuất`;
              }
            });
            separators.forEach((sep) => sep.classList.remove("hidden"));
          }

          const fullName =
            AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
          const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);

          if (fullName) {
            const initials = UIUtils.getInitials(fullName);
            document
              .querySelectorAll(".header-avatar-initials")
              .forEach((el) => (el.innerText = initials));
            document
              .querySelectorAll(".display-name-global")
              .forEach((el) => (el.innerText = fullName));
          }

          // Khúc code cũ của bạn:
          const hasAvatar =
            avatarUrl &&
            avatarUrl !== "null" &&
            avatarUrl.trim() !== "" &&
            avatarUrl.startsWith("http");

          // --- BẮT ĐẦU ĐOẠN MÃ CẦN CẬP NHẬT ---

          // Khai báo đường dẫn tới ảnh mặc định (Bạn hãy chỉnh sửa lại path này nếu bạn lưu ảnh ở thư mục khác)
          const defaultAvatar = "assets/img/avatar-default-svgrepo-com.svg";

          // Xử lý thẻ <img>: Luôn hiển thị, thay đổi src tùy theo trạng thái hasAvatar
          document.querySelectorAll(".header-avatar-img").forEach((img) => {
            img.src = hasAvatar ? avatarUrl : defaultAvatar;
            img.classList.remove("hidden"); // Luôn hiển thị thẻ ảnh
          });

          // Xử lý khối chữ cái (initials): Vì đã dùng ảnh mặc định, ta sẽ luôn ẩn khối này
          document
            .querySelectorAll(".header-avatar-initials")
            .forEach((initialEl) => {
              initialEl.classList.add("hidden");
            });

          // --- KẾT THÚC ĐOẠN MÃ CẬP NHẬT ---
        } else if (isGuestMode) {
          // ==========================================
          // TRẠNG THÁI: GUEST MODE (KHÁCH VÃNG LAI)
          // ==========================================
          if (notifBtn) notifBtn.classList.add("hidden");
          if (dropdownArrow) dropdownArrow.classList.remove("hidden");
          if (dropdownContent) dropdownContent.classList.remove("hidden");
          if (profileGroup)
            profileGroup.classList.add("group", "cursor-pointer");

          if (dropdownContent) {
            const menuItems = dropdownContent.querySelectorAll("a");
            const separators = dropdownContent.querySelectorAll("div.border-t");
            menuItems.forEach((item) => {
              if (!item.getAttribute("onclick")?.includes("logout")) {
                item.classList.add("hidden");
              } else {
                item.classList.remove("hidden");
                item.innerHTML = `Thoát chế độ khách`;
              }
            });
            separators.forEach((sep) => sep.classList.add("hidden"));
          }

          // --- ĐOẠN MÃ ĐƯỢC CẬP NHẬT ---
          // 1. Đặt tên hiển thị là "Khách"
          document
            .querySelectorAll(".display-name-global")
            .forEach((el) => (el.innerText = "Khách"));

          // 2. Sử dụng đường dẫn file SVG mặc định
          // (Đảm bảo đường dẫn này khớp với thư mục dự án của bạn)
          const defaultAvatar = "assets/img/avatar-default-svgrepo-com.svg";

          // 3. Hiển thị thẻ <img> và gán ảnh mặc định
          document.querySelectorAll(".header-avatar-img").forEach((img) => {
            img.src = defaultAvatar;
            img.classList.remove("hidden");
          });

          // 4. Ẩn khối chữ cái (nếu bạn chưa xóa nó trong HTML)
          document.querySelectorAll(".header-avatar-initials").forEach((el) => {
            el.classList.add("hidden");
          });
          // --- KẾT THÚC ĐOẠN CẬP NHẬT ---
        }
      } else {
        // ==========================================
        // TRẠNG THÁI: MẶC ĐỊNH (CHƯA BẤM GÌ CẢ)
        // ==========================================
        guestActions.classList.remove("hidden");
        guestActions.classList.add("flex");
        userActions.classList.add("hidden");
        this.updateCartBadge();
      }
    }

    // ==========================================
    // CẬP NHẬT GIAO DIỆN ADMIN HEADER MỚI
    // ==========================================
    const adminProfileBtn = document.getElementById("admin-profile-btn");

    // Nếu tìm thấy nút profile của admin và người dùng đã đăng nhập
    if (adminProfileBtn && isLoggedIn) {
      const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);
      const adminDefaultIcon = document.getElementById("admin-default-icon");
      const adminAvatarContainer = document.getElementById(
        "admin-avatar-container",
      );

      if (adminDefaultIcon && adminAvatarContainer) {
        // Kiểm tra xem URL ảnh có hợp lệ không
        const hasAvatar =
          avatarUrl &&
          avatarUrl !== "null" &&
          avatarUrl.trim() !== "" &&
          avatarUrl.startsWith("http");

        if (hasAvatar) {
          // Nếu có ảnh: Ẩn icon mặc định, chèn ảnh vào background và hiển thị
          adminDefaultIcon.classList.add("hidden");
          adminAvatarContainer.style.backgroundImage = `url('${avatarUrl}')`;
          adminAvatarContainer.classList.remove("hidden");
          adminAvatarContainer.classList.add("block");
        } else {
          // Nếu không có ảnh: Giữ nguyên icon mặc định
          adminDefaultIcon.classList.remove("hidden");
          adminAvatarContainer.classList.add("hidden");
          adminAvatarContainer.classList.remove("block");
        }
      }
    }
  },

  getCategoryIcon(name) {
    const n = name.toLowerCase();
    if (n.includes("laptop")) return "laptop_mac";
    if (n.includes("điện thoại")) return "smartphone";
    if (n.includes("tivi")) return "tv";
    if (n.includes("đồng hồ")) return "watch";
    return "grid_view";
  },

  async loadCategories() {
    const container = document.getElementById("category-list-container");
    if (!container) return;

    try {
      // 1. Lấy cây danh mục
      const categories = await ApiUtils.fetchAPI("/categories/tree");
      container.innerHTML = `
        <div class="flex items-center gap-md cursor-pointer">
            <span class="material-symbols-outlined text-ember-red text-xl" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
            <a class="text-ember-red font-label-caps text-label-caps uppercase tracking-widest block"
           href="flash_sale.html">FLASH SALE
        </a>
        </div>
      `;

      // 2. Gọi API song song để lấy bộ lọc (chứa danh sách thương hiệu) cho tất cả danh mục cha
      const brandPromises = categories.map((cat) =>
        ApiUtils.fetchAPI(`/products/category/${cat.id}/filters`)
          .then((res) => ({ id: cat.id, brands: res?.filters?.brand || [] }))
          .catch(() => ({ id: cat.id, brands: [] })),
      );

      // Đợi tất cả API trả về và lưu vào một object (map) để tra cứu nhanh
      const brandsData = await Promise.all(brandPromises);
      const brandMap = {};
      brandsData.forEach((item) => {
        brandMap[item.id] = item.brands;
      });

      // 3. Render giao diện
      categories.forEach((cat) => {
        const hasChildren = cat.children && cat.children.length > 0;
        const item = document.createElement("div");
        const displayImage = cat.imageUrl
          ? cat.imageUrl
          : "https://placehold.co/400x300?text=No+Image";
        item.className = "group relative flex items-center";

        // Nút điều hướng chính trên thanh menu
        let htmlContent = `
        <a class="text-on-surface-variant dark:text-surface-variant hover:text-carbon-ink dark:hover:text-paper-white transition-colors duration-300 font-label-caps text-label-caps uppercase tracking-widest block"
           href="products.html?category=${cat.id}">
           ${cat.name}
        </a>
      `;

        if (hasChildren) {
          // Chuẩn bị HTML cho cột thương hiệu
          let brandLinks = "";
          const catBrands = brandMap[cat.id] || [];

          if (catBrands.length > 0) {
            // Lấy tối đa 5 thương hiệu để tránh làm giao diện đổ xuống bị quá dài
            catBrands.slice(0, 5).forEach((brandName) => {
              brandLinks += `
                    <a class="font-body-sm text-on-surface-variant hover:text-carbon-ink transition-colors"
                       href="products.html?category=${cat.id}&brand=${encodeURIComponent(brandName)}">${brandName}</a>
                `;
            });
          } else {
            brandLinks = `<span class="font-body-sm text-on-surface-variant italic">Đang cập nhật...</span>`;
          }

          htmlContent += `
          <div class="absolute top-full left-1/2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 bg-paper-white border border-mist w-[800px] z-50 p-xl shadow-sm flex gap-xl mt-2">
            
            <!-- Khu vực chia 2 cột -->
            <div class="flex-1 grid grid-cols-2 gap-lg">
              
              <!-- CỘT 1: PHÂN LOẠI -->
              <div class="flex flex-col gap-md">
                <span class="font-label-caps text-label-caps text-carbon-ink border-b border-mist pb-xs mb-xs">Phân loại</span>
        `;

          // Render dữ liệu Phân loại (danh mục con)
          cat.children.forEach((child) => {
            htmlContent += `
                <a class="font-body-sm text-on-surface-variant hover:text-carbon-ink transition-colors"
                   href="products.html?category=${child.id}">${child.name}</a>
          `;
          });

          htmlContent += `
              </div>
              
              <!-- CỘT 2: THƯƠNG HIỆU -->
              <div class="flex flex-col gap-md">
                <span class="font-label-caps text-label-caps text-carbon-ink border-b border-mist pb-xs mb-xs">Thương hiệu</span>
                ${brandLinks}
              </div>
            </div>
            
            <!-- Khu vực Hình ảnh nổi bật bên phải -->
            <div class="w-1/3 bg-fog p-md rounded overflow-hidden relative group/img">
              <img alt="${cat.name}"
                   class="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover/img:scale-110"
                   src="${displayImage}" />
            </div>
          </div>
        `;
        }

        item.innerHTML = htmlContent;
        container.appendChild(item);
      });
    } catch (error) {
      console.error("Lỗi tải danh mục:", error);
      container.innerHTML = `<p class="text-xs text-red-500 font-medium">Không thể tải danh mục</p>`;
    }
  },

  initSearch() {
    const searchInput = document.getElementById("search-input");

    if (searchInput) {
      searchInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          const keyword = this.value.trim();

          if (keyword) {
            window.location.href = `products.html?search=${encodeURIComponent(keyword)}`;
          }
        }
      });
    }
  },

  initSearchUI() {
    const container = document.getElementById("search-container");
    const input = document.getElementById("search-input");
    const toggle = document.getElementById("search-toggle");

    if (!container || !input || !toggle) return;

    const expandSearch = () => {
      // Xóa trạng thái thu nhỏ, thêm trạng thái mở rộng
      input.classList.remove("w-10", "opacity-0", "cursor-pointer");
      input.classList.add("w-64", "opacity-100", "cursor-text");
    };

    const collapseSearch = () => {
      // CHỈ thu nhỏ khi ô nhập liệu trống (không có chữ)
      if (input.value.trim() === "") {
        input.classList.remove("w-64", "opacity-100", "cursor-text");
        input.classList.add("w-10", "opacity-0", "cursor-pointer");
      }
    };

    // Mở rộng khi chuột di chuyển vào khu vực tìm kiếm
    container.addEventListener("mouseenter", expandSearch);

    // Thu nhỏ khi chuột rời đi (hàm collapseSearch sẽ tự kiểm tra xem có chữ không)
    container.addEventListener("mouseleave", collapseSearch);

    // Xử lý khi click thẳng vào biểu tượng kính lúp
    toggle.addEventListener("click", () => {
      expandSearch();
      input.focus();
    });

    // Khi đang gõ chữ, đảm bảo ô luôn mở
    input.addEventListener("input", expandSearch);

    // Khi người dùng click chuột ra vùng khác trên trang web (mất focus)
    input.addEventListener("blur", collapseSearch);
  },

  async updateCartBadge() {
    const badges = document.querySelectorAll(".global-cart-badge");
    if (badges.length === 0) return;

    try {
      // Cập nhật sử dụng ApiUtils.fetchAPI để tự động truyền Session-Id cho khách vãng lai
      const cart = await ApiUtils.fetchAPI("/cart");
      const totalItems = cart.totalItems || 0;

      badges.forEach((b) => {
        if (totalItems > 0) {
          b.innerText = totalItems;
          b.classList.remove("hidden");
        } else {
          b.classList.add("hidden");
        }
      });
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng:", error);
      badges.forEach((b) => b.classList.add("hidden"));
    }
  },
};

const SidebarLogic = {
  init() {
    // 1. Lấy tên file HTML hiện tại...
    const currentPath =
      window.location.pathname.split("/").pop().split("?")[0] ||
      "user_infor.html";

    // 2. Tìm tất cả các liên kết trong menu Sidebar...
    const links = document.querySelectorAll("#sidebar-nav .sidebar-link");

    links.forEach((link) => {
      const hrefRaw = link.getAttribute("href");
      const href = hrefRaw ? hrefRaw.split("?")[0] : "";
      const icon = link.querySelector(".material-symbols-outlined");

      if (href === currentPath) {
        link.className =
          "sidebar-link flex items-center gap-3 px-4 py-3 bg-surface-container-low text-carbon-ink w-full text-left transition-colors hover:bg-surface-container-high border border-carbon-ink ";
        if (icon) icon.style.fontVariationSettings = "'FILL' 1";
      } else {
        link.className =
          "sidebar-link flex items-center gap-3 px-4 py-3 text-carbon-ink w-full text-left transition-colors hover:bg-surface-container-low border border-transparent hover:border-mist";
        if (icon) icon.style.fontVariationSettings = "'FILL' 0";
      }
    });
  },

  // THÊM MỚI HÀM NÀY: Hàm cập nhật thông tin người dùng
  updateUserInfo() {
    // Lấy tên người dùng (Nếu chưa đăng nhập sẽ hiển thị "Khách hàng")
    const fullName =
      AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "Khách hàng";
    const nameEl = document.getElementById("sidebar-fullname");
    if (nameEl) {
      nameEl.innerText = fullName;
      nameEl.title = fullName;
    }

    // Lấy link ảnh và cập nhật
    const avatarUrl = AuthUtils.getUserInfo(AppConfig.KEYS.AVATAR);
    const avatarEl = document.getElementById("sidebar-avatar");

    if (avatarEl) {
      const defaultAvatar = "assets/img/avatar-default-svgrepo-com.svg";
      // Kiểm tra xem url ảnh có tồn tại và hợp lệ không
      const hasValidAvatar =
        avatarUrl && avatarUrl !== "null" && avatarUrl.trim() !== "";
      const avatarSrc = hasValidAvatar ? avatarUrl : defaultAvatar;

      // Chèn ảnh vào thuộc tính background-image
      avatarEl.style.backgroundImage = `url('${avatarSrc}')`;
    }
  },
};

const AdminSidebarLogic = {
  init() {
    // 1. Lấy tên tệp của trang hiện tại từ URL
    let currentPath = window.location.pathname.split("/").pop();

    if (!currentPath || currentPath === "") {
      currentPath = "dashboard.html";
    }

    // 2. Tìm sidebar trong DOM
    const sidebar = document.getElementById("admin-sidebar-placeholder");
    if (!sidebar) return;

    // 3. Lấy tất cả các thẻ <a> bên trong sidebar
    const links = sidebar.querySelectorAll("a");

    links.forEach((link) => {
      const href = link.getAttribute("href");

      // BƯỚC SỬA LỖI: Kiểm tra xem bên trong thẻ <a> này có chứa thẻ <span> nào mang data-icon="logout" không
      const isLogoutButton =
        link.querySelector('[data-icon="logout"]') !== null;

      // 4. Kiểm tra trạng thái Active
      const isActive = href && href !== "#" && currentPath.includes(href);

      // 5. Cập nhật class
      if (isActive) {
        // TRẠNG THÁI ACTIVE
        link.className =
          "flex items-center gap-md px-lg py-md text-paper-white border-l-2 border-ember-red bg-carbon-ink hover:bg-carbon-ink transition-colors duration-200 active:scale-[0.98] transition-transform";
      } else {
        // TRẠNG THÁI INACTIVE
        if (isLogoutButton) {
          // Nếu đây là nút Đăng xuất -> Áp dụng hiệu ứng hover màu đỏ
          link.className =
            "flex items-center gap-md px-lg py-md text-graphite hover:text-ember-red hover:bg-carbon-ink transition-colors duration-200";
        } else {
          // Các nút menu bình thường -> Áp dụng hiệu ứng hover màu sáng (mist)
          link.className =
            "flex items-center gap-md px-lg py-md text-graphite hover:text-mist hover:bg-carbon-ink transition-colors duration-200";
        }
      }
    });
  },
};

async function loadSharedComponents() {
  try {
    const isAdminPage =
      document.getElementById("admin-sidebar-placeholder") !== null;

    if (isAdminPage) {
      if (!AuthUtils.requireAdmin()) {
        return;
      }
    }

    const headerPlaceholder = document.getElementById("header-placeholder");
    if (headerPlaceholder) {
      const headerRes = await fetch("components/header.html");
      if (headerRes.ok) headerPlaceholder.innerHTML = await headerRes.text();
    }

    const footerPlaceholder = document.getElementById("footer-placeholder");
    if (footerPlaceholder) {
      const footerRes = await fetch("components/footer.html");
      if (footerRes.ok) footerPlaceholder.innerHTML = await footerRes.text();
    }

    const sidebarPlaceholder = document.getElementById("sidebar-placeholder");
    if (sidebarPlaceholder) {
      const sidebarRes = await fetch("components/sidebar.html");
      if (sidebarRes.ok) {
        sidebarPlaceholder.innerHTML = await sidebarRes.text();
        SidebarLogic.init();
        SidebarLogic.updateUserInfo();
      }
    }

    const adminHeaderPlaceholder = document.getElementById(
      "admin-header-placeholder",
    );
    if (adminHeaderPlaceholder) {
      const headerRes = await fetch("components/header_admin.html");
      if (headerRes.ok)
        adminHeaderPlaceholder.innerHTML = await headerRes.text();
    }

    const adminSidebarPlaceholder = document.getElementById(
      "admin-sidebar-placeholder",
    );
    if (adminSidebarPlaceholder) {
      const sidebarRes = await fetch("components/sidebar_admin.html");
      if (sidebarRes.ok) {
        adminSidebarPlaceholder.innerHTML = await sidebarRes.text();
        AdminSidebarLogic.init();
      }
    }

    const comparePlaceholder = document.getElementById("compare-placeholder");
    if (comparePlaceholder) {
      const compareRes = await fetch("components/compare.html");
      if (compareRes.ok) {
        comparePlaceholder.innerHTML = await compareRes.text();

        if (typeof renderCompareModal === "function") {
          renderCompareModal();
        }
      }
    }

    HeaderLogic.updateHeaderState();
    HeaderLogic.loadCategories();
    HeaderLogic.initSearch();
    HeaderLogic.initSearchUI();
  } catch (error) {
    console.error("Lỗi tải thành phần chung:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadSharedComponents);

window.toggleUserMenu = UIUtils.toggleUserMenu;
window.addEventListener("click", (e) => {
  const btn = document.getElementById("user-menu-btn");
  const menu = document.getElementById("user-dropdown");
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add("hidden");
  }
});
