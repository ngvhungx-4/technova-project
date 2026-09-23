document.addEventListener("DOMContentLoaded", () => {
  let allProducts = [];
  let selectedProducts = [];

  // ==========================================
  // 2. LẤY CÁC THẺ HTML (DOM ELEMENTS)
  // ==========================================
  const createModal = document.getElementById("create-campaign-modal");
  const btnOpenCreateModal = document.getElementById("btn-open-create-modal");
  const btnCloseCreateModal = document.getElementById("btn-close-create-modal");
  const btnCancelCreate = document.getElementById("btn-cancel-create");
  const btnSubmitCampaign = document.getElementById("btn-submit-campaign");

  const inputCampaignName = document.getElementById("input-campaign-name");
  const inputCampaignDate = document.getElementById("input-campaign-date");
  const inputCampaignTime = document.getElementById("input-campaign-time");

  const selectProductsModal = document.getElementById("select-products-modal");
  const btnOpenSelectProducts = document.getElementById(
    "btn-open-select-products",
  );
  const btnCloseSelectModal = document.getElementById("btn-close-select-modal");
  const btnCancelSelect = document.getElementById("btn-cancel-select");
  const btnConfirmAddProducts = document.getElementById(
    "btn-confirm-add-products",
  );

  const selectedProductsContainer = document.getElementById(
    "selected-products-container",
  );
  const selectProductsTbody = document.querySelector(
    "#select-products-modal tbody",
  );
  const selectedCountElement = document.getElementById("selected-count");

  // Các thẻ phục vụ cho Tìm kiếm & Lọc
  const inputSearchProduct = document.getElementById("input-search-product");
  const selectCategoryFilter = document.getElementById(
    "select-category-filter",
  );
  const selectStatusFilter = document.getElementById("select-status-filter");

  const activeCampaignContainer = document.getElementById(
    "active-campaign-container",
  );
  const scheduleContainer = document.getElementById("schedule-container");
  const campaignProductsTbody = document.getElementById(
    "campaign-products-tbody",
  );
  const currentSlotTitle = document.getElementById("current-slot-title");

  let debounceTimer; // Dùng để hoãn (delay) việc gọi API khi người dùng đang gõ phím
  let isCategoryLoaded = false; // Tránh gọi API danh mục nhiều lần

  let currentPage = 0; // Spring Boot bắt đầu đếm trang từ 0
  let pageSize = 12; // Số sản phẩm hiển thị trên 1 trang
  let totalElements = 0;
  let totalPages = 0;

  let tempSelectedItems = new Map();
  let countdownTimer;
  let windowDashboardData = null;
  let currentEditCampaignId = null;

  function calculateTimeLeft(targetTimeStr) {
    let now = new Date();
    // Tách "20:00" thành mảng [20, 0]
    let parts = targetTimeStr.split(":").map(Number);
    let target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parts[0],
      parts[1],
      0,
    );

    let diff = Math.floor((target - now) / 1000);
    if (diff <= 0) return "00:00:00";

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;
    return (
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0")
    );
  }

  // ==========================================
  // 3. EVENT LISTENERS
  // ==========================================
  if (btnOpenCreateModal) {
    btnOpenCreateModal.addEventListener("click", () => {
      // Đặt lại là chế độ Tạo mới
      currentEditCampaignId = null;

      // Reset các ô nhập liệu
      inputCampaignName.value = "";
      inputCampaignDate.value = "";
      inputCampaignTime.value = "";

      // Xóa danh sách sản phẩm đã chọn
      tempSelectedItems.clear();
      selectedProducts = [];
      renderSelectedProducts();
      updateSelectedCountUI();

      // Đổi tiêu đề và nút bấm về chế độ Tạo mới
      const modalTitle = createModal.querySelector("h2");
      if (modalTitle) modalTitle.textContent = "Thêm chiến dịch Flash Sale mới";
      if (btnSubmitCampaign) {
        btnSubmitCampaign.innerHTML = `<span class="material-symbols-outlined text-[16px]">check</span> Tạo chiến dịch`;
      }

      toggleModal(createModal, true);
    });
  }
  if (btnCloseCreateModal)
    btnCloseCreateModal.addEventListener("click", () =>
      toggleModal(createModal, false),
    );
  if (btnCancelCreate)
    btnCancelCreate.addEventListener("click", () =>
      toggleModal(createModal, false),
    );

  if (btnCloseSelectModal)
    btnCloseSelectModal.addEventListener("click", () =>
      toggleModal(selectProductsModal, false),
    );
  if (btnCancelSelect)
    btnCancelSelect.addEventListener("click", () =>
      toggleModal(selectProductsModal, false),
    );

  if (btnOpenSelectProducts) {
    btnOpenSelectProducts.addEventListener("click", async () => {
      toggleModal(selectProductsModal, true);

      // Đồng bộ dữ liệu đã chọn từ trước vào bộ nhớ tạm
      tempSelectedItems.clear();
      selectedProducts.forEach((p) => {
        tempSelectedItems.set(p.productId, { ...p });
      });

      // BỔ SUNG: Cập nhật con số trên UI ngay khi vừa mở Modal
      updateSelectedCountUI();

      await loadCategoriesForFilter();
      await loadProductsFromBackend();
    });
  }

  if (inputSearchProduct) {
    inputSearchProduct.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadProductsFromBackend();
      }, 500); // Đợi 500ms sau khi người dùng ngừng gõ mới gọi API
    });
  }

  // Lắng nghe sự kiện đổi Dropdown Danh mục
  if (selectCategoryFilter) {
    selectCategoryFilter.addEventListener("change", () => {
      loadProductsFromBackend();
    });
  }

  // Lắng nghe sự kiện đổi Dropdown Trạng thái tồn kho
  if (selectStatusFilter) {
    selectStatusFilter.addEventListener("change", () => {
      loadProductsFromBackend();
    });
  }

  if (btnConfirmAddProducts)
    btnConfirmAddProducts.addEventListener("click", handleConfirmProducts);
  if (btnSubmitCampaign)
    btnSubmitCampaign.addEventListener("click", handleSubmitCampaign);

  // ==========================================
  // 4. LOGIC HANDLERS
  // ==========================================

  // Tải toàn bộ dữ liệu Dashboard khi vào trang
  async function loadDashboardData() {
    try {
      const dashboardData = await ApiUtils.fetchAPI(
        "/flash-sales/admin/dashboard/today",
      );

      if (dashboardData) {
        windowDashboardData = dashboardData; // Lưu lại dữ liệu

        renderSchedule(dashboardData.schedules);

        const currentSchedule =
          dashboardData.schedules.find((s) => s.status === "ACTIVE") ||
          dashboardData.schedules.find((s) => s.status === "UPCOMING") ||
          dashboardData.schedules[0];

        if (currentSchedule) {
          loadCampaignProducts(currentSchedule); // Truyền toàn bộ object
        }
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu Dashboard:", error);
    }
  }

  function renderActiveCampaign(campaign) {
    if (!activeCampaignContainer || !campaign) return;

    let statusTagHTML = "";
    let timeLabel = "THỜI GIAN CÒN LẠI"; // Mặc định

    if (campaign.status === "ACTIVE") {
      statusTagHTML = `<span class="w-2 h-2 bg-ember-red rounded-full animate-pulse"></span><span class="font-label-caps text-label-caps font-semibold text-ember-red uppercase">ĐANG DIỄN RA</span>`;
      timeLabel = "THỜI GIAN CÒN LẠI";
    } else if (campaign.status === "UPCOMING") {
      statusTagHTML = `<span class="font-label-caps text-label-caps font-semibold text-carbon-ink uppercase">SẮP DIỄN RA</span>`;
      timeLabel = "THỜI GIAN BẮT ĐẦU"; // Thay đổi nhãn
    } else {
      statusTagHTML = `<span class="font-label-caps text-label-caps font-semibold text-graphite uppercase">ĐÃ KẾT THÚC</span>`;
      timeLabel = "ĐÃ KẾT THÚC";
    }

    // CHỈ HIỂN THỊ CÁC NÚT THAO TÁC NẾU CHIẾN DỊCH LÀ 'UPCOMING' (Sắp diễn ra)
    let actionButtonHTML = "";
    if (campaign.status === "UPCOMING") {
      actionButtonHTML = `
        <div class="col-span-1 flex flex-col justify-end items-end gap-sm z-10">
            <button class="w-full border border-carbon-ink text-carbon-ink bg-transparent font-label-sm text-label-sm uppercase px-lg py-sm rounded-DEFAULT hover:bg-carbon-ink hover:text-paper-white transition-colors" onclick="manageCampaign(${campaign.id})">
                QUẢN LÝ CHIẾN DỊCH NÀY
            </button>
            <button class="w-full border border-ember-red text-ember-red bg-transparent font-label-sm text-label-sm uppercase px-lg py-sm rounded-DEFAULT hover:bg-ember-red hover:text-paper-white transition-colors" onclick="deleteCampaign(${campaign.id})">
                XÓA CHIẾN DỊCH
            </button>
        </div>
      `;
    }

    activeCampaignContainer.innerHTML = `
      <div class="absolute top-0 right-0 w-32 h-32 bg-ember-red opacity-5 rounded-bl-full pointer-events-none"></div>
      <div class="col-span-1 md:col-span-2 space-y-md z-10">
          <div class="flex items-center gap-sm">
              ${statusTagHTML}
          </div>
          <h2 class="font-body-lg text-[32px] font-bold text-carbon-ink">${campaign.name}</h2>
          <div class="flex gap-lg font-label-caps text-technical-mono font-semibold text-carbon-ink mt-md">
              <div class="border-l-2 border-ember-red pl-md">
                  <div class="text-graphite mb-xs text-[12px]">${timeLabel}</div>
                  <div id="active-countdown" class="text-[24px] font-bold ${
                    campaign.status === "ACTIVE"
                      ? "text-ember-red"
                      : "text-carbon-ink"
                  }">${campaign.timeLeft || "00:00:00"}</div>
              </div>
              <div class="hairline-l pl-md">
                  <div class="text-graphite mb-xs text-[12px]">SẢN PHẨM</div>
                  <div class="text-[24px]">${campaign.totalProducts}</div>
              </div>
              <div class="hairline-l pl-md">
                  <div class="text-graphite mb-xs text-[12px]">DOANH THU TẠM TÍNH</div>
                  <div class="text-[24px]">${campaign.estimatedRevenue.toLocaleString()} ₫</div>
              </div>
          </div>
      </div>
      <!-- IN BIẾN actionButtonHTML VÀO ĐÂY -->
      ${actionButtonHTML}
    `;

    // CHÚ Ý: Cho phép đếm ngược với cả trạng thái ACTIVE và UPCOMING
    if (
      (campaign.status === "ACTIVE" || campaign.status === "UPCOMING") &&
      campaign.timeLeft
    ) {
      startCountdown(campaign.timeLeft);
    } else if (countdownTimer) {
      clearInterval(countdownTimer);
    }
  }

  // HÀM XỬ LÝ LOGIC ĐẾM NGƯỢC THỜI GIAN
  function startCountdown(timeStr) {
    // Xóa bộ đếm cũ nếu có để tránh bị chồng chéo vòng lặp
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    const timerElement = document.getElementById("active-countdown");
    if (!timerElement || !timeStr) return;

    // Tách chuỗi thời gian (VD: "01:01:55") thành mảng [1, 1, 55]
    let parts = timeStr.split(":");
    if (parts.length !== 3) return;

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    let seconds = parseInt(parts[2], 10);

    // Đổi tất cả ra tổng số giây
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;

    // Bắt đầu vòng lặp chạy mỗi 1000ms (1 giây)
    countdownTimer = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(countdownTimer);
        timerElement.textContent = "00:00:00";

        // Tùy chọn: Khi hết giờ, tự động tải lại dữ liệu Dashboard để làm mới ca Flash Sale
        loadDashboardData();
        return;
      }

      totalSeconds--; // Trừ đi 1 giây

      // Tính toán lại giờ, phút, giây từ tổng số giây mới
      let h = Math.floor(totalSeconds / 3600);
      let m = Math.floor((totalSeconds % 3600) / 60);
      let s = totalSeconds % 60;

      // Định dạng lại chuỗi có số 0 ở đầu (VD: 9 -> "09")
      let displayTime =
        String(h).padStart(2, "0") +
        ":" +
        String(m).padStart(2, "0") +
        ":" +
        String(s).padStart(2, "0");

      // Cập nhật lên giao diện
      timerElement.textContent = displayTime;
    }, 1000);
  }

  // RENDER LỊCH TRÌNH BÊN TRÁI (SIDEBAR)
  function renderSchedule(schedules) {
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = "";

    // BỔ SUNG LOGIC: Sắp xếp để đưa các ca "ENDED" xuống dưới cùng
    // Sử dụng mảng copy [...schedules] để không làm biến đổi mảng gốc
    const sortedSchedules = [...schedules].sort((a, b) => {
      if (a.status === "ENDED" && b.status !== "ENDED") return 1; // Đẩy a xuống dưới
      if (a.status !== "ENDED" && b.status === "ENDED") return -1; // Giữ a ở trên
      return 0; // Nếu cùng trạng thái thì giữ nguyên thứ tự thời gian gốc
    });

    // Thay đổi từ schedules.forEach thành sortedSchedules.forEach
    sortedSchedules.forEach((schedule) => {
      const isEnded = schedule.status === "ENDED";
      const isActive = schedule.status === "ACTIVE";
      const isUpcoming = schedule.status === "UPCOMING";

      let containerClass =
        "p-md rounded-DEFAULT cursor-pointer transition-colors ";
      let contentHTML = "";

      if (isActive) {
        containerClass +=
          "bg-carbon-ink text-paper-white relative overflow-hidden group";
        contentHTML = `
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-ember-red"></div>
          <div class="font-label-sm text-label-sm uppercase mb-xs opacity-80 group-hover:opacity-100 transition-opacity">${schedule.timeRange}</div>
          <div class="font-body-sm text-body-sm flex justify-between items-center">
              <span>Đang diễn ra</span>
              <span class="material-symbols-outlined text-[16px] text-ember-red animate-pulse">bolt</span>
          </div>`;
      } else if (isUpcoming) {
        containerClass += "bg-paper-white hairline hover:bg-fog";
        contentHTML = `
          <div class="font-label-sm text-label-sm uppercase text-carbon-ink mb-xs">${schedule.timeRange}</div>
          <div class="font-body-sm text-body-sm text-graphite flex justify-between items-center">
              <span>Sắp diễn ra</span>
              <span class="text-xs">${schedule.productCount} SP</span>
          </div>`;
      } else {
        containerClass += "bg-surface-container-high hairline opacity-60";
        contentHTML = `
          <div class="font-label-sm text-label-sm uppercase text-graphite mb-xs">${schedule.timeRange}</div>
          <div class="font-body-sm text-body-sm text-graphite flex justify-between items-center">
              <span>Đã kết thúc</span>
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
          </div>`;
      }

      const div = document.createElement("div");
      div.className = containerClass;
      div.innerHTML = contentHTML;

      div.addEventListener("click", () => {
        loadCampaignProducts(schedule); // Thay đổi tại đây
      });

      scheduleContainer.appendChild(div);
    });
  }

  // SỬA: Nhận đối tượng schedule
  async function loadCampaignProducts(schedule) {
    if (!campaignProductsTbody) return;

    if (currentSlotTitle) {
      currentSlotTitle.textContent = `Sản Phẩm Khung Giờ (${schedule.timeRange})`;
    }

    campaignProductsTbody.innerHTML =
      '<tr><td colspan="3" class="p-md text-center text-graphite">Đang tải dữ liệu...</td></tr>';

    try {
      // Dùng schedule.id để gọi API
      const products = await ApiUtils.fetchAPI(
        `/flash-sales/admin/schedules/${schedule.id}/products`,
      );

      // Tính tổng doanh thu
      let totalRevenue = 0;
      products.forEach((p) => {
        totalRevenue += p.flashSalePrice * (p.sold || 0);
      });

      // Lấy tên chiến dịch (Từ activeCampaign nếu có, hoặc tên mặc định)
      let campaignName = schedule.name || "Chiến dịch Flash Sale";

      // Tính toán thời gian đếm ngược dựa vào ca Sắp diễn ra hoặc Đang diễn ra
      let timeLeftStr = "00:00:00";
      if (schedule.status === "UPCOMING") {
        const startTimeStr = schedule.timeRange.split("-")[0].trim();
        timeLeftStr = calculateTimeLeft(startTimeStr);
      } else if (schedule.status === "ACTIVE") {
        const endTimeStr = schedule.timeRange.split("-")[1].trim();
        timeLeftStr = calculateTimeLeft(endTimeStr);
      }

      const campaignInfo = {
        id: schedule.id,
        name: campaignName,
        timeLeft: timeLeftStr,
        totalProducts: schedule.productCount || products.length,
        estimatedRevenue: totalRevenue,
        status: schedule.status,
      };

      // GỌI HÀM CẬP NHẬT HERO BANNER TẠI ĐÂY
      renderActiveCampaign(campaignInfo);

      campaignProductsTbody.innerHTML = "";

      products.forEach((product) => {
        const isSoldOut = product.sold >= product.stock;
        const rowClass = isSoldOut
          ? "hover:bg-surface-bright transition-colors group bg-surface-container-low opacity-75"
          : "hover:bg-surface-bright transition-colors group";

        const imgClass = isSoldOut
          ? "w-12 h-12 bg-surface-container hairline rounded-sm overflow-hidden flex-shrink-0 grayscale"
          : "w-12 h-12 bg-surface-container hairline rounded-sm overflow-hidden flex-shrink-0";

        const nameClass = isSoldOut
          ? "font-bold text-graphite line-through"
          : "font-bold text-carbon-ink";

        const priceClass = isSoldOut
          ? "text-graphite font-bold flex items-center gap-xs"
          : "text-ember-red font-bold flex item-center gap-xs";

        const stock = product.stock || 1; // Tránh chia cho 0
        const soldPercentage = (product.sold / stock) * 100;

        let stockDisplayHTML;
        if (isSoldOut) {
          stockDisplayHTML = `
            <span class="text-ember-red font-bold">${product.sold}/${product.stock}</span>
            <div class="w-full max-w-[80px] h-1 bg-surface-variant mt-xs rounded-full overflow-hidden">
                <div class="h-full bg-ember-red w-full"></div>
            </div>`;
        } else {
          stockDisplayHTML = `
            <span class="">${product.sold}/<span class="text-carbon-ink font-bold">${product.stock}</span></span>
            <div class="w-full max-w-[80px] h-1 bg-surface-variant mt-xs rounded-full overflow-hidden">
                <div class="h-full ${soldPercentage > 80 ? "bg-ember-red" : "bg-carbon-ink"} w-[${soldPercentage}%]"></div>
            </div>`;
        }

        const tr = document.createElement("tr");
        tr.className = rowClass;
        tr.innerHTML = `
          <!-- BƯỚC 1: Xóa các class flex trên thẻ td, chỉ để lại width và padding -->
          <td class="w-[55%] p-md">
              <!-- BƯỚC 2: Bọc nội dung bằng 1 thẻ div có class flex và w-full -->
              <div class="flex items-center gap-md w-full">
                  <div class="${imgClass}">
                      <img class="w-full h-full object-cover" src="${product.thumbnail}" alt="${product.name}">
                  </div>
                  <div class="flex-1 min-w-0">
                      <div class="${nameClass} line-clamp-2" title="${product.name}">${product.name}</div>
                  </div>
              </div>
          </td>
          <td class="w-[25%] p-md">
              <div class="line-through text-graphite text-[12px]">${product.originalPrice.toLocaleString()} ₫</div>
              <div class="${priceClass}">${product.flashSalePrice.toLocaleString()} ₫</div>
          </td>
          <td class="w-[20%] p-md text-right font-body-lg">
              <div class="flex flex-col items-end">
                  ${stockDisplayHTML}
              </div>
          </td>
        `;
        campaignProductsTbody.appendChild(tr);
      });
    } catch (error) {
      campaignProductsTbody.innerHTML = `<tr><td colspan="3" class="p-md text-center text-ember-red">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    }
  }

  // GỌI HÀM KHỞI TẠO DỮ LIỆU
  loadDashboardData();

  function toggleModal(modalElement, isShow) {
    if (!modalElement) return;
    if (isShow) {
      modalElement.classList.remove("hidden");
      modalElement.classList.add("flex");
    } else {
      modalElement.classList.remove("flex");
      modalElement.classList.add("hidden");
    }
  }
  function updateSelectedCountUI() {
    if (selectedCountElement) {
      // tempSelectedItems.size sẽ đếm chính xác số sản phẩm đang nằm trong bộ nhớ tạm
      selectedCountElement.textContent = tempSelectedItems.size;
    }
  }

  // TẢI DANH MỤC TỪ BACKEND ĐỔ VÀO DROPDOWN VÀ FORMAT THEO CẤP
  async function loadCategoriesForFilter() {
    if (isCategoryLoaded || !selectCategoryFilter) return;
    try {
      // Gọi API lấy danh sách toàn bộ danh mục
      const categories = await ApiUtils.fetchAPI("/categories/admin/all");

      // Xóa các option cũ và thêm option mặc định
      selectCategoryFilter.innerHTML =
        '<option value="">Tất cả danh mục</option>';

      // Tách danh sách thành 2 nhóm: Danh mục cha và Danh mục con
      const parentCategories = categories.filter((c) => !c.parentId);
      const childCategories = categories.filter((c) => c.parentId);

      // 1. Render nhóm Danh mục cha trước (VD: Laptop, Điện thoại, Tivi...)
      parentCategories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        selectCategoryFilter.appendChild(option);
      });

      // 2. Sắp xếp danh mục con theo tên danh mục cha để nhóm chúng lại với nhau
      childCategories.sort((a, b) => {
        if (a.parentName < b.parentName) return -1;
        if (a.parentName > b.parentName) return 1;
        return 0;
      });

      // 3. Render nhóm Danh mục con với định dạng "Cha > Con"
      childCategories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        // Ghép chuỗi tên danh mục cha và con bằng dấu ">"
        option.textContent = `${cat.parentName} > ${cat.name}`;
        selectCategoryFilter.appendChild(option);
      });

      // Đánh dấu là đã tải xong để không gọi API lại nhiều lần
      isCategoryLoaded = true;
    } catch (error) {
      console.error("Lỗi tải danh mục:", error);
    }
  }

  // TẢI SẢN PHẨM (CÓ KÈM ĐIỀU KIỆN LỌC VÀ PHÂN TRANG)
  async function loadProductsFromBackend() {
    if (!selectProductsTbody) return;
    selectProductsTbody.innerHTML =
      '<tr><td colspan="7" class="p-md text-center">Đang tải dữ liệu...</td></tr>';

    try {
      const keyword = inputSearchProduct ? inputSearchProduct.value.trim() : "";
      const categoryId = selectCategoryFilter ? selectCategoryFilter.value : "";
      const status = selectStatusFilter ? selectStatusFilter.value : "";

      // 1. Cập nhật query parameters với currentPage và pageSize
      let queryParams = new URLSearchParams({
        page: currentPage,
        size: pageSize,
      });
      if (keyword) queryParams.append("keyword", keyword);
      if (categoryId) queryParams.append("categoryId", categoryId);
      if (status) queryParams.append("status", status);

      const data = await ApiUtils.fetchAPI(
        `/products/admin/all?${queryParams.toString()}`,
      );

      // 2. Cập nhật các biến phân trang từ dữ liệu Backend trả về
      allProducts = data.content || [];
      totalElements = data.totalElements || 0;
      totalPages = data.totalPages || 0;

      if (allProducts.length === 0) {
        selectProductsTbody.innerHTML =
          '<tr><td colspan="7" class="p-md text-center text-graphite">Không tìm thấy sản phẩm nào phù hợp.</td></tr>';
      } else {
        renderProductsToSelectTable(allProducts);
      }

      // 3. Gọi hàm cập nhật giao diện phân trang sau khi có dữ liệu
      renderPaginationUI();
    } catch (error) {
      console.error(error);
      selectProductsTbody.innerHTML = `<tr><td colspan="7" class="p-md text-center text-ember-red">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    }
  }

  // CẬP NHẬT GIAO DIỆN (NÚT BẤM VÀ THÔNG TIN PHÂN TRANG)
  function renderPaginationUI() {
    const paginationInfo = document.getElementById("pagination-info");
    const btnPrevPage = document.getElementById("btn-prev-page");
    const btnNextPage = document.getElementById("btn-next-page");

    if (!paginationInfo || !btnPrevPage || !btnNextPage) return;

    // Tính toán số hiển thị (Ví dụ: Hiển thị 1 - 12 trong tổng số 50)
    const startItem = totalElements === 0 ? 0 : currentPage * pageSize + 1;
    const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

    // Cập nhật câu chữ
    paginationInfo.innerHTML = `
      <span class="text-secondary text-xs font-body-sm">
          Hiển thị <span class="font-medium text-carbon-ink">${startItem} - ${endItem}</span> trong tổng số <span class="font-medium text-carbon-ink font-body-sm">${totalElements}</span> sản phẩm
      </span>
    `;

    // Vô hiệu hóa (disable) nút "Trước" nếu đang ở trang đầu (0)
    btnPrevPage.disabled = currentPage === 0;

    // Vô hiệu hóa (disable) nút "Sau" nếu đang ở trang cuối cùng
    btnNextPage.disabled = currentPage >= totalPages - 1 || totalElements === 0;
  }

  // RENDER BẢNG CHỌN SẢN PHẨM
  function renderProductsToSelectTable(products) {
    if (!selectProductsTbody) return;
    selectProductsTbody.innerHTML = "";

    products.forEach((product) => {
      const originalPrice = product.salePrice || product.basePrice || 0;

      // Kiểm tra xem sản phẩm này đã được lưu trong bộ nhớ tạm chưa
      const isSelected = tempSelectedItems.has(product.id);
      const savedData = tempSelectedItems.get(product.id) || {};

      // Nếu có, lấy lại giá và slot đã nhập. Nếu không, để trống
      const fsPriceValue = savedData.flashSalePrice || "";
      const slotValue = savedData.allocatedQuantity || "";

      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-surface-bright transition-colors bg-surface-container-low/30";

      tr.innerHTML = `
                <td class="p-sm text-center">
                    <input type="checkbox" class="product-checkbox rounded-sm border-mist text-carbon-ink focus:ring-carbon-ink cursor-pointer" data-id="${product.id}" ${isSelected ? "checked" : ""}>
                </td>
                <td class="p-md flex items-center gap-md">
                    <div class="w-10 h-10 bg-surface-container hairline rounded-sm overflow-hidden flex-shrink-0">
                        <img class="w-full h-full object-cover" src="${product.thumbnail || ""}" alt="${product.name}">
                    </div>
                    <div><div class="font-semibold text-[14px] font-body-lg text-carbon-ink leading-tight">${product.name}</div></div>
                </td>
                <td class="p-md text-center font-body-lg text-carbon-ink font-medium">${product.stock || 0}</td>
                <td class="p-md text-center font-body-lg text-graphite text-[12px]">${originalPrice.toLocaleString()}₫</td>
                <td class="p-md text-center">
                    <input type="number" class="fs-price-input w-32 px-xs py-1 border border-mist rounded font-body-lg text-right text-ember-red font-bold text-[13px] bg-paper-white focus:outline-none focus:border-ember-red" value="${fsPriceValue}">
                </td>
                <td class="p-md text-center">
                    <input type="number" class="fs-slot-input w-16 px-xs py-1 border border-mist rounded font-body-lg text-right text-carbon-ink font-bold text-[13px] bg-paper-white focus:outline-none focus:border-carbon-ink" min="1" max="${product.stock || 999}" value="${slotValue}">
                </td>
            `;
      selectProductsTbody.appendChild(tr);

      // --- BẮT SỰ KIỆN ĐỂ LƯU VÀO BỘ NHỚ TẠM ---
      const checkbox = tr.querySelector(".product-checkbox");
      const priceInput = tr.querySelector(".fs-price-input");
      const slotInput = tr.querySelector(".fs-slot-input");

      // Hàm lưu dữ liệu của hàng này vào Map
      const saveTempData = () => {
        if (checkbox.checked) {
          tempSelectedItems.set(product.id, {
            productId: product.id,
            productName: product.name,
            thumbnail: product.thumbnail,
            originalPrice: originalPrice,
            flashSalePrice: parseFloat(priceInput.value) || 0,
            allocatedQuantity: parseInt(slotInput.value) || 0,
            stock: product.stock,
          });
        } else {
          // Nếu bỏ tích, xóa khỏi bộ nhớ tạm
          tempSelectedItems.delete(product.id);
        }

        // BỔ SUNG: Cập nhật lại UI đếm số lượng mỗi khi tích/bỏ tích
        updateSelectedCountUI();
      };

      // Gọi hàm lưu khi có bất kỳ thay đổi nào
      checkbox.addEventListener("change", saveTempData);
      priceInput.addEventListener("input", (e) => {
        let enteredPrice = parseFloat(e.target.value);

        // Kiểm tra ngoại lệ: Giá Flash Sale không được lớn hơn Giá gốc
        if (enteredPrice > originalPrice) {
          e.target.value = originalPrice; // Tự động giảm xuống bằng giá gốc
        }

        // Lưu vào bộ nhớ tạm nếu đang được tích chọn
        if (checkbox.checked) saveTempData();
      });
      slotInput.addEventListener("input", (e) => {
        let enteredSlot = parseInt(e.target.value);

        // Kiểm tra ngoại lệ: Slot không được lớn hơn Tồn kho
        if (enteredSlot > product.stock) {
          e.target.value = product.stock; // Tự động giảm xuống bằng số tồn kho
        }

        // Lưu vào bộ nhớ tạm nếu đang được tích chọn
        if (checkbox.checked) saveTempData();
      });
    });
  }

  // XỬ LÝ NÚT "XÁC NHẬN THÊM"
  function handleConfirmProducts() {
    // Thay vì đi tìm các checkbox trên màn hình (sẽ bị thiếu các trang khác),
    // ta chỉ cần lấy toàn bộ dữ liệu từ bộ nhớ tạm
    selectedProducts = [];

    tempSelectedItems.forEach((item) => {
      selectedProducts.push(item);
    });

    renderSelectedProducts();
    toggleModal(selectProductsModal, false);
  }

  // RENDER SẢN PHẨM ĐÃ CHỌN VÀO FORM TẠO CHIẾN DỊCH (CHO PHÉP CHỈNH SỬA)
  function renderSelectedProducts() {
    if (!selectedProductsContainer) return;
    selectedProductsContainer.innerHTML = "";

    selectedProducts.forEach((item) => {
      const div = document.createElement("div");
      div.className =
        "flex flex-col sm:flex-row sm:items-center justify-between p-md bg-paper-white border border-mist rounded-DEFAULT gap-md shadow-sm hover:border-carbon-ink transition-colors";

      div.innerHTML = `
                <div class="flex items-center gap-md flex-1 min-w-0">
                    <div class="w-12 h-12 bg-surface-container hairline rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img class="w-full h-full object-cover" src="${item.thumbnail || ""}" alt="${item.productName}">
                    </div>
                    <div class="min-w-0 flex flex-col justify-center gap-xs">
                        <div class="text-body-sm font-bold text-carbon-ink leading-tight truncate">${item.productName}</div>
                        <div class="text-[12px] text-graphite font-body-lg">Gốc: <span class="line-through">${item.originalPrice.toLocaleString()}₫</span></div>
                    </div>
                </div>
                <div class="flex items-center gap-md flex-shrink-0">
                    <div class="flex items-center gap-xs">
                        <label class="font-label-sm uppercase text-[11px] text-graphite">Giá FS:</label>
                        <div class="relative flex items-center">
                            <!-- Bỏ readonly, đổi sang type="number", thêm class edit-fs-price -->
                            <input class="edit-fs-price w-32 px-sm py-xs border border-mist rounded-DEFAULT font-body-lg text-body-sm font-bold text-ember-red bg-surface-container-lowest text-right focus:outline-none focus:border-ember-red" 
                                type="number" 
                                data-id="${item.productId}" 
                                value="${item.flashSalePrice}">
                            <span class="text-[12px] font-body-lg text-ember-red ml-xs">₫</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-xs">
                        <label class="font-label-sm uppercase text-[11px] text-graphite">Slot:</label>
                        <!-- Bỏ readonly, đổi sang type="number", thêm class edit-fs-slot -->
                        <input class="edit-fs-slot w-16 px-sm py-xs border border-mist rounded-DEFAULT font-body-lg text-body-sm font-bold text-carbon-ink bg-surface-container-lowest text-center focus:outline-none focus:border-carbon-ink" 
                            type="number" 
                            data-id="${item.productId}" 
                            value="${item.allocatedQuantity}">
                    </div>
                    <button class="btn-remove-item text-graphite hover:text-ember-red p-xs rounded hover:bg-surface-container flex items-center justify-center transition-colors" data-id="${item.productId}" type="button">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            `;
      selectedProductsContainer.appendChild(div);
    });

    // --- XỬ LÝ SỰ KIỆN: XÓA SẢN PHẨM ---
    document.querySelectorAll(".btn-remove-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        selectedProducts = selectedProducts.filter((p) => p.productId !== id);

        // Xóa luôn khỏi bộ nhớ tạm để đồng bộ
        tempSelectedItems.delete(id);

        renderSelectedProducts();
        updateSelectedCountUI(); // Cập nhật lại số lượng đếm nếu bạn đang dùng
      });
    });

    // --- XỬ LÝ SỰ KIỆN: CHỈNH SỬA GIÁ FLASH SALE ---
    document.querySelectorAll(".edit-fs-price").forEach((input) => {
      input.addEventListener("input", (e) => {
        const id = parseInt(e.target.getAttribute("data-id"));
        const product = selectedProducts.find((p) => p.productId === id);

        if (product) {
          let newPrice = parseFloat(e.target.value) || 0;

          // Kiểm tra ngoại lệ: Giá FS không lớn hơn Giá gốc
          if (newPrice > product.originalPrice) {
            newPrice = product.originalPrice;
            e.target.value = newPrice;
          }

          product.flashSalePrice = newPrice; // Cập nhật mảng chính

          // Đồng bộ vào bộ nhớ tạm
          if (tempSelectedItems.has(id)) {
            tempSelectedItems.get(id).flashSalePrice = newPrice;
          }
        }
      });
    });

    // --- XỬ LÝ SỰ KIỆN: CHỈNH SỬA SLOT ---
    document.querySelectorAll(".edit-fs-slot").forEach((input) => {
      input.addEventListener("input", (e) => {
        const id = parseInt(e.target.getAttribute("data-id"));
        const product = selectedProducts.find((p) => p.productId === id);

        if (product) {
          let newSlot = parseInt(e.target.value) || 0;
          const maxStock = product.stock || 999;

          // Kiểm tra ngoại lệ: Slot không lớn hơn Tồn kho
          if (newSlot > maxStock) {
            newSlot = maxStock;
            e.target.value = newSlot;
          }

          product.allocatedQuantity = newSlot; // Cập nhật mảng chính

          // Đồng bộ vào bộ nhớ tạm
          if (tempSelectedItems.has(id)) {
            tempSelectedItems.get(id).allocatedQuantity = newSlot;
          }
        }
      });
    });
  }

  // GỬI DỮ LIỆU TẠO CHIẾN DỊCH LÊN BACKEND (CÓ KIỂM TRA VÀ CHUẨN HÓA THỜI GIAN)
  async function handleSubmitCampaign() {
    if (selectedProducts.length === 0) {
      alert("Vui lòng thêm ít nhất 1 sản phẩm vào chiến dịch!");
      return;
    }

    const name = inputCampaignName.value.trim();
    const dateStr = inputCampaignDate.value;
    const timeStr = inputCampaignTime.value;

    if (!name || !dateStr || !timeStr) {
      alert("Vui lòng nhập đầy đủ Tên, Ngày và Khung giờ!");
      return;
    }

    // Tách chuỗi thời gian (VD: "8:00 - 12:00")
    const timeParts = timeStr.split("-").map((t) => t.trim());
    if (timeParts.length !== 2) {
      alert(
        "Định dạng giờ không hợp lệ. Vui lòng nhập theo mẫu '09:00 - 12:00'.",
      );
      return;
    }

    // TẠO HÀM CHUẨN HÓA THỜI GIAN
    // Hàm này sẽ tự động thêm số 0 ở đầu nếu giờ/phút chỉ có 1 chữ số
    const formatTime = (time) => {
      let [h, m] = time.split(":");
      if (!h) h = "00";
      if (!m) m = "00";

      // Dùng padStart(2, '0') để đảm bảo luôn có 2 ký tự (VD: "8" -> "08")
      h = h.padStart(2, "0");
      m = m.padStart(2, "0");
      return `${h}:${m}:00`;
    };

    // Áp dụng chuẩn hóa: Kết quả sẽ luôn là định dạng YYYY-MM-DDTHH:mm:ss
    const startDateTimeStr = `${dateStr}T${formatTime(timeParts[0])}`;
    const endDateTimeStr = `${dateStr}T${formatTime(timeParts[1])}`;

    // --- BẮT ĐẦU KIỂM TRA NGOẠI LỆ THỜI GIAN ---
    const startDateTime = new Date(startDateTimeStr);
    const endDateTime = new Date(endDateTimeStr);
    const now = new Date();

    if (startDateTime < now) {
      alert("Lỗi: Thời gian bắt đầu chiến dịch không được nằm trong quá khứ!");
      return;
    }

    if (startDateTime >= endDateTime) {
      alert("Lỗi: Thời gian kết thúc phải diễn ra sau thời gian bắt đầu!");
      return;
    }
    // --- KẾT THÚC KIỂM TRA ---

    const payload = {
      name: name,
      startTime: startDateTimeStr, // Chuỗi này giờ đây đã đảm bảo chuẩn ISO-8601
      endTime: endDateTimeStr,
      items: selectedProducts.map((p) => ({
        productId: p.productId,
        flashSalePrice: p.flashSalePrice,
        allocatedQuantity: p.allocatedQuantity,
      })),
    };

    try {
      // KIỂM TRA TRẠNG THÁI ĐỂ QUYẾT ĐỊNH URL VÀ METHOD
      const isUpdate = currentEditCampaignId !== null;
      const url = isUpdate
        ? `/flash-sales/admin/update/${currentEditCampaignId}`
        : "/flash-sales/admin/create";
      const method = isUpdate ? "PUT" : "POST";

      await ApiUtils.fetchAPI(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      alert(
        isUpdate
          ? "Cập nhật chiến dịch thành công!"
          : "Tạo chiến dịch Flash Sale thành công!",
      );
      toggleModal(createModal, false);

      // Tải lại dữ liệu sau khi sửa/tạo
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert("Lỗi lưu chiến dịch: " + error.message);
    }
  }
  // ĐƯỢC GỌI TỪ NÚT "QUẢN LÝ CHIẾN DỊCH NÀY" TRÊN HERO BANNER
  window.manageCampaign = async function (campaignId) {
    // 1. Lấy thông tin cơ bản của chiến dịch từ dữ liệu đã lưu
    let campaignInfo = windowDashboardData.schedules.find(
      (s) => s.id === campaignId,
    );
    if (
      !campaignInfo &&
      windowDashboardData.activeCampaign?.id === campaignId
    ) {
      campaignInfo = windowDashboardData.activeCampaign;
    }
    if (!campaignInfo) return;

    // Đánh dấu là đang ở chế độ Cập nhật
    currentEditCampaignId = campaignId;

    // 2. Điền thông tin vào form
    inputCampaignName.value = campaignInfo.name || "";
    inputCampaignTime.value = campaignInfo.timeRange || "";

    // Vì bảng điều khiển đang xem là ngày hôm nay, ta gán luôn ngày hôm nay
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    inputCampaignDate.value = `${yyyy}-${mm}-${dd}`;

    // Đổi tiêu đề và nút bấm sang chế độ Cập nhật
    const modalTitle = createModal.querySelector("h2");
    if (modalTitle) modalTitle.textContent = "Cập nhật chiến dịch Flash Sale";
    if (btnSubmitCampaign) {
      btnSubmitCampaign.innerHTML = `<span class="material-symbols-outlined text-[16px]">save</span> Cập nhật chiến dịch`;
    }

    // 3. Gọi API lấy danh sách sản phẩm và đẩy vào Popup chọn sản phẩm
    try {
      const products = await ApiUtils.fetchAPI(
        `/flash-sales/admin/schedules/${campaignId}/products`,
      );

      tempSelectedItems.clear();
      selectedProducts = [];

      products.forEach((p) => {
        const item = {
          productId: p.productId,
          productName: p.name,
          thumbnail: p.thumbnail,
          originalPrice: p.originalPrice,
          flashSalePrice: p.flashSalePrice,
          allocatedQuantity: p.stock, // Lấy số slot đã cài đặt
          stock: p.stock, // Cố định hiển thị bằng slot
        };
        tempSelectedItems.set(p.productId, item);
        selectedProducts.push(item);
      });

      renderSelectedProducts();
      updateSelectedCountUI();

      // 4. Mở Popup
      toggleModal(createModal, true);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm của chiến dịch:", error);
      alert("Lỗi lấy dữ liệu sản phẩm!");
    }
  };
  // ĐƯỢC GỌI TỪ NÚT "XÓA CHIẾN DỊCH" TRÊN HERO BANNER
  window.deleteCampaign = async function (campaignId) {
    // 1. Hiển thị hộp thoại xác nhận
    const isConfirm = confirm(
      "Bạn có chắc chắn muốn xóa chiến dịch này không? Thao tác này không thể hoàn tác.",
    );
    if (!isConfirm) return;

    // 2. Gọi API để xóa
    try {
      await ApiUtils.fetchAPI(`/flash-sales/admin/delete/${campaignId}`, {
        method: "DELETE",
      });

      alert("Đã xóa chiến dịch thành công!");

      // 3. Tải lại toàn bộ dữ liệu Dashboard để cập nhật giao diện
      loadDashboardData();
    } catch (error) {
      console.error("Lỗi xóa chiến dịch:", error);
      alert("Lỗi khi xóa chiến dịch: " + error.message);
    }
  };
});
