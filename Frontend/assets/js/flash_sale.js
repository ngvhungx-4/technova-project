const FlashSaleLogic = {
  timerInterval: null,
  allItems: [],
  currentPage: 0,
  pageSize: 8,

  // CÁC BIẾN MỚI ĐỂ QUẢN LÝ TRẠNG THÁI KHUNG GIỜ
  schedules: [],
  currentScheduleId: null,
  currentStatus: "ACTIVE",

  async init() {
    try {
      // 1. Tải danh sách khung giờ hôm nay
      this.schedules = await ApiUtils.fetchAPI("/flash-sales/public/today");

      // 2. Tìm khung giờ đang diễn ra để chọn mặc định
      const activeSchedule = this.schedules.find((s) => s.status === "ACTIVE");
      if (activeSchedule) {
        this.currentScheduleId = activeSchedule.id;
        this.currentStatus = "ACTIVE";
      } else if (this.schedules.length > 0) {
        // Nếu không có ca nào đang diễn ra, chọn tạm ca đầu tiên
        this.currentScheduleId = this.schedules[0].id;
        this.currentStatus = this.schedules[0].status;
      }

      this.renderTimeFilters();

      // 3. Tải sản phẩm cho khung giờ được chọn
      if (this.currentScheduleId) {
        if (this.currentStatus === "ACTIVE") {
          // Lấy thông tin đầy đủ kèm đếm ngược cho ca Active
          const activeSale = await ApiUtils.fetchAPI(
            "/flash-sales/public/active",
          );
          if (activeSale && activeSale.items) {
            this.updateHero(activeSale);
            this.startCountdown(activeSale.endTime);
            this.allItems = activeSale.items;
            this.renderProducts(0);
          }
        } else {
          // Tải sản phẩm cho các ca không Active
          this.selectSchedule(this.currentScheduleId, this.currentStatus);
        }
      } else {
        this.renderNoSaleMessage("Hiện không có chương trình Flash Sale nào.");
      }
    } catch (error) {
      console.error("Lỗi khi tải Flash Sale:", error);
      this.renderNoSaleMessage("Đã xảy ra lỗi khi tải dữ liệu.");
    }
  },

  // HÀM MỚI: Xử lý khi người dùng bấm vào một khung giờ
  async selectSchedule(scheduleId, status) {
    this.currentScheduleId = scheduleId;
    this.currentStatus = status;

    // Vẽ lại các nút để hiển thị nút đang được chọn
    this.renderTimeFilters();

    try {
      // Gọi API lấy sản phẩm của khung giờ đó
      const response = await ApiUtils.fetchAPI(
        `/flash-sales/public/schedules/${scheduleId}/products`,
      );

      if (!response || response.length === 0) {
        this.allItems = [];
        this.renderProducts(0);
        return;
      }

      // Đồng bộ dữ liệu trả về với cấu trúc mảng allItems hiện tại
      this.allItems = response.map((item) => ({
        productId: item.productId,
        productName: item.name,
        thumbnail: item.thumbnail,
        originalPrice: item.originalPrice,
        flashSalePrice: item.flashSalePrice,
        allocatedQuantity: item.stock,
        soldQuantity: item.sold,
      }));

      // Reset về trang 1 và hiển thị sản phẩm
      this.renderProducts(0);

      // Đổi trạng thái bộ đếm giờ
      const timerElement = document.getElementById("countdown-timer");
      if (timerElement) {
        if (status === "UPCOMING") timerElement.textContent = "SẮP DIỄN RA";
        else if (status === "ENDED") timerElement.textContent = "ĐÃ KẾT THÚC";
      }
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm của khung giờ:", error);
    }
  },

  // CẬP NHẬT: Vẽ lại giao diện nút khung giờ và gắn onclick
  renderTimeFilters() {
    const filterContainer = document.getElementById("flash-sale-filters");
    if (!filterContainer) return;

    if (!Array.isArray(this.schedules) || this.schedules.length === 0) {
      filterContainer.innerHTML = "";
      return;
    }

    let filtersHtml = "";

    this.schedules.forEach((slot) => {
      // Kiểm tra xem tab này có đang được chọn hay không
      const isSelected = slot.id === this.currentScheduleId;

      // Khai báo sự kiện bấm cho nút
      const onClickAttr = `onclick="FlashSaleLogic.selectSchedule(${slot.id}, '${slot.status}')"`;

      if (slot.status === "ACTIVE") {
        // Nút ACTIVE: Đỏ nếu được chọn, nhạt nếu không được chọn
        const btnClass = isSelected
          ? "bg-ember-red text-paper-white font-label-caps text-label-sm px-md py-sm rounded-full border border-ember-red shadow-sm"
          : "bg-tertiary-fixed text-on-secondary-container font-label-caps text-label-sm px-md py-sm rounded-full border border-transparent hover:border-mist transition-colors cursor-pointer";

        filtersHtml += `<button ${onClickAttr} class="${btnClass}">${slot.timeRange} (ĐANG DIỄN RA)</button>`;
      } else {
        // Các nút khác: Xám đậm nếu được chọn, xám nhạt nếu không được chọn
        const btnClass = isSelected
          ? "bg-secondary text-paper-white font-label-caps text-label-sm px-md py-sm rounded-full border shadow-sm cursor-default"
          : "bg-fog text-on-secondary-container font-label-caps text-label-sm px-md py-sm rounded-full border border-transparent hover:border-mist transition-colors cursor-pointer";

        filtersHtml += `<button ${onClickAttr} class="${btnClass}">${slot.timeRange}</button>`;
      }
    });

    filterContainer.innerHTML = filtersHtml;
  },

  // CẬP NHẬT: Thêm logic khóa nút mua hàng
  renderProducts(pageNo) {
    const grid = document.getElementById("flash-sale-product-grid");
    if (!grid) return;

    if (!this.allItems || this.allItems.length === 0) {
      grid.innerHTML =
        '<p class="col-span-full text-center py-lg font-body-lg text-graphite">Chưa có sản phẩm nào trong chương trình này.</p>';
      return;
    }

    const totalItems = this.allItems.length;
    const totalPages = Math.ceil(totalItems / this.pageSize);
    if (pageNo < 0) pageNo = 0;
    if (pageNo >= totalPages) pageNo = totalPages - 1;
    this.currentPage = pageNo;

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalItems);
    const pageItems = this.allItems.slice(startIndex, endIndex);

    grid.innerHTML = "";

    pageItems.forEach((item) => {
      const productName = item.productName || "Sản phẩm Flash Sale";
      const originalPrice = item.originalPrice || 0;
      const flashSalePrice = item.flashSalePrice || 0;
      const imageUrl =
        item.thumbnail || "https://placehold.co/400x400?text=No+Image";

      const discountPercent =
        originalPrice > 0
          ? Math.round(((originalPrice - flashSalePrice) / originalPrice) * 100)
          : 0;
      const soldQty = item.soldQuantity || 0;
      const totalQty = item.allocatedQuantity || 1;
      const soldPercent = Math.min(100, Math.round((soldQty / totalQty) * 100));

      // KIỂM TRA TRẠNG THÁI VÀ SỐ LƯỢNG:
      const isSoldOut = soldQty >= totalQty; // Kiểm tra xem đã hết suất chưa
      let actionButtonHtml = "";

      if (this.currentStatus !== "ACTIVE") {
        // 1. Trạng thái SẮP DIỄN RA hoặc ĐÃ KẾT THÚC
        actionButtonHtml = `<button disabled class="w-full bg-fog text-graphite font-label-caps text-label-caps py-sm rounded cursor-not-allowed uppercase">CHỈ XEM TRƯỚC</button>`;
      } else if (isSoldOut) {
        // 2. Trạng thái ĐANG DIỄN RA nhưng ĐÃ BÁN HẾT SUẤT
        // Sử dụng flex-col để chia 2 dòng cho dễ đọc trên giao diện thẻ sản phẩm
        actionButtonHtml = `
          <button disabled class="w-full bg-surface-container-high border border-mist text-graphite py-sm rounded cursor-not-allowed flex flex-col items-center justify-center gap-1 leading-none">
            <span class="font-label-caps text-[12px] uppercase">Đã hết suất Flash Sale</span>
            <span class="font-body-sm text-[11px] text-secondary">Giá hiện tại: ${UIUtils.formatCurrency(originalPrice)}</span>
          </button>`;
      } else {
        // 3. Trạng thái ĐANG DIỄN RA và CÒN HÀNG
        actionButtonHtml = `<button onclick="buyNowFlashSale(event, ${item.productId})" class="w-full border border-carbon-ink text-carbon-ink font-label-caps text-label-caps py-sm rounded hover:bg-ember-red hover:border-ember-red hover:text-paper-white transition-colors uppercase">MUA NGAY</button>`;
      }
      const cardHtml = `
      <article class="bg-paper-white border border-mist rounded-lg overflow-hidden flex flex-col group relative hover:border-ember-red transition-colors duration-300">
          <div class="absolute top-sm left-sm bg-ember-red text-paper-white font-label-caps text-label-sm px-sm py-xs z-10 rounded-full">-${discountPercent}%</div>
          <div onclick="window.location.href='product_detail.html?id=${item.productId}'" class="aspect-square bg-white border-b border-mist flex items-center justify-center p-lg relative overflow-hidden cursor-pointer">
              <img alt="${productName}" class="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500 mix-blend-multiply" src="${imageUrl}" />
          </div>
          <div class="p-md flex flex-col flex-grow">
              <h3 onclick="window.location.href='product_detail.html?id=${item.productId}'" class="font-body-sm text-[16px] leading-tight text-primary font-semibold mt-xs line-clamp-2 cursor-pointer hover:text-ember-red transition-colors">${productName}</h3>
              <div class="flex items-baseline gap-sm mb-md mt-auto">
                  <span class="font-body-lg text-body-lg font-bold text-ember-red">${UIUtils.formatCurrency(flashSalePrice)}</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant line-through">${UIUtils.formatCurrency(originalPrice)}</span>
              </div>
              <div class="w-full bg-fog h-xs mb-sm rounded-full overflow-hidden">
                  <div class="bg-ember-red h-full transition-all duration-1000" style="width: ${soldPercent}%"></div>
              </div>
              <div class="font-label-caps text-label-sm text-graphite mb-md text-right">ĐÃ BÁN ${soldQty}</div>
              
              <!-- NÚT MUA HOẶC XEM TRƯỚC SẼ HIỆN Ở ĐÂY -->
              ${actionButtonHtml}
          </div>
      </article>`;

      grid.insertAdjacentHTML("beforeend", cardHtml);
    });

    this.renderPagination(totalPages, this.currentPage);
  },

  // Các hàm cũ (updateHero, startCountdown, renderPagination, createPageButton, changePage, renderNoSaleMessage) giữ nguyên...
  updateHero(sale) {
    /* Giữ nguyên như cũ */
    const titleElement = document.getElementById("flash-sale-title");
    if (titleElement && sale.name) {
      titleElement.innerHTML = `FLASH SALE<br /><span class="text-ember-red">—</span><br /><span class="font-label-caps text-headline-lg font-bold">${sale.name}</span>`;
    }
  },
  startCountdown(endTimeStr) {
    /* Giữ nguyên như cũ */
    const timerElement = document.getElementById("countdown-timer");
    if (!timerElement) return;
    if (this.timerInterval) clearInterval(this.timerInterval);
    const endTime = new Date(endTimeStr).getTime();
    this.timerInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime - now;
      if (distance < 0) {
        clearInterval(this.timerInterval);
        timerElement.textContent = "00:00:00";
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      const hours =
        Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) +
        Math.floor(distance / (1000 * 60 * 60 * 24)) * 24;
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      timerElement.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, 1000);
  },
  renderPagination(totalPages, pageNo) {
    /* Giữ nguyên như cũ */
    const paginationEl = document.getElementById("pagination");
    if (!paginationEl) return;
    paginationEl.innerHTML = "";
    if (totalPages <= 1) return;
    paginationEl.appendChild(
      this.createPageButton(
        "chevron_left",
        pageNo > 0,
        () => this.changePage(pageNo - 1),
        true,
      ),
    );
    let startPage = Math.max(0, pageNo - 2);
    let endPage = Math.min(totalPages - 1, pageNo + 2);
    if (endPage - startPage < 4) {
      if (startPage === 0) endPage = Math.min(totalPages - 1, startPage + 4);
      else if (endPage === totalPages - 1) startPage = Math.max(0, endPage - 4);
    }
    for (let i = startPage; i <= endPage; i++) {
      paginationEl.appendChild(
        this.createPageButton(
          i + 1,
          true,
          () => this.changePage(i),
          false,
          i === pageNo,
        ),
      );
    }
    paginationEl.appendChild(
      this.createPageButton(
        "chevron_right",
        pageNo < totalPages - 1,
        () => this.changePage(pageNo + 1),
        true,
      ),
    );
  },
  createPageButton(text, isEnabled, onClick, isIcon = false, isActive = false) {
    /* Giữ nguyên như cũ */
    const btn = document.createElement("button");
    let className =
      "flex items-center justify-center w-8 h-8 transition-colors ";
    if (isActive)
      className += "text-primary font-bold border-b-2 border-primary";
    else
      className += isEnabled
        ? "text-on-surface-variant hover:text-primary cursor-pointer"
        : "text-mist cursor-not-allowed";
    btn.className = className;
    btn.disabled = !isEnabled;
    if (isIcon)
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">${text}</span>`;
    else btn.innerText = text;
    if (isEnabled) btn.addEventListener("click", onClick);
    return btn;
  },
  changePage(newPage) {
    /* Giữ nguyên như cũ */
    if (newPage !== this.currentPage) {
      const filterSection = document.getElementById("flash-sale-filters");
      if (filterSection)
        window.scrollTo({
          top: filterSection.offsetTop - 100,
          behavior: "smooth",
        });
      this.renderProducts(newPage);
    }
  },
  renderNoSaleMessage(message) {
    /* Giữ nguyên như cũ */
    const grid = document.getElementById("flash-sale-product-grid");
    if (grid)
      grid.innerHTML = `<p class="col-span-full text-center py-xxl font-label-caps text-[16px] text-graphite">${message}</p>`;
    const timerElement = document.getElementById("countdown-timer");
    if (timerElement) timerElement.textContent = "00:00:00";
  },
};

document.addEventListener("DOMContentLoaded", () => {
  FlashSaleLogic.init();
});

// ==========================================
// HÀM MUA NGAY TRỰC TIẾP TỪ FLASH SALE
// ==========================================
async function buyNowFlashSale(event, productId) {
  // Ngăn chặn sự kiện click lan ra ngoài thẻ card
  if (event) event.stopPropagation();

  // Đổi trạng thái nút thành đang tải để người dùng biết hệ thống đang xử lý
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px] align-middle">progress_activity</span> Đang xử lý...`;

  try {
    // Gọi API thêm sản phẩm vào giỏ hàng
    const payload = {
      productId: parseInt(productId),
      quantity: 1,
      selectedColor: null,
    };

    const cartRes = await ApiUtils.fetchAPI("/cart/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Chỉ chọn duy nhất sản phẩm này để thanh toán
    const addedItem = cartRes.items.find(
      (i) => i.productId === payload.productId,
    );

    if (addedItem) {
      // Bỏ chọn tất cả
      await ApiUtils.fetchAPI("/cart/select-all?isSelected=false", {
        method: "PUT",
      });

      // BƯỚC SỬA LỖI: Truyền thêm quantity=1 vào API để ép số lượng về đúng 1 chiếc (tránh bị cộng dồn)
      await ApiUtils.fetchAPI(
        `/cart/item/${addedItem.id}?quantity=1&isSelected=true`,
        { method: "PUT" },
      );
    }

    // Chuyển thẳng đến trang thanh toán
    window.location.href = "checkout.html";
  } catch (error) {
    console.error("Lỗi khi mua ngay từ Flash Sale:", error);
    alert(
      error.message ||
        "Không thể thực hiện mua hàng lúc này. Vui lòng thử lại!",
    );

    // Khôi phục nút bấm nếu bị lỗi
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
