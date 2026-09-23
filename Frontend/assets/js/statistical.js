let currentFilterQuery = "?filter=month";

document.addEventListener("DOMContentLoaded", function () {
  initFilterLogic();
  reloadAllStats();
});

// Hàm gọi lại tất cả các khối thống kê
function reloadAllStats() {
  renderDashboardStats(currentFilterQuery);
  renderRevenueChart(currentFilterQuery);
  renderCategoryChart(currentFilterQuery);
  loadTopSelling(currentFilterQuery);
  loadInventoryStats();
}

// ==========================================
// 1. TỔNG QUAN KPI (DASHBOARD STATS)
// ==========================================
async function renderDashboardStats(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;
  try {
    const token = AuthUtils.getToken();
    const apiUrl = `${AppConfig.ORDER_API_URL}/orders/admin/statistics/dashboard${queryStr}`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Lỗi API Dashboard");

    const data = await response.json();

    // Cập nhật Tổng đơn hàng
    const totalOrdersEl = document.getElementById("stat-total-orders");
    if (totalOrdersEl)
      totalOrdersEl.innerText = data.totalOrders.toLocaleString("vi-VN");
    updateGrowthUI("stat-total-orders-growth", data.ordersGrowth);

    // Cập nhật Doanh thu thuần
    const netRevenueEl = document.getElementById("stat-net-revenue");
    if (netRevenueEl) {
      let revenue = data.netRevenue;
      if (revenue >= 1000000000)
        netRevenueEl.innerText = (revenue / 1000000000).toFixed(2) + " Tỷ";
      else if (revenue >= 1000000)
        netRevenueEl.innerText = (revenue / 1000000).toFixed(1) + " Tr";
      else netRevenueEl.innerText = UIUtils.formatCurrency(revenue);
    }
    updateGrowthUI("stat-net-revenue-growth", data.revenueGrowth);

    // Cập nhật Tỷ lệ hủy đơn
    const cancelRateEl = document.getElementById("stat-cancel-rate");
    if (cancelRateEl)
      cancelRateEl.innerText = (data.cancellationRate || data.cancelRate) + "%";
    // Tỷ lệ hủy giảm là điều tốt (màu xanh), nên logic của biến updateGrowthUI sẽ được xử lý riêng nếu cần.
    updateGrowthUI("stat-cancel-rate-growth", data.cancelRateGrowth, true); // true = đảo ngược màu (giảm = tốt)

    // Cập nhật Người dùng mới (Gọi từ AuthService)
    const userRes = await fetch(
      `${AppConfig.BASE_URL}/users/admin/statistics/new-users${queryStr}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const userData = await userRes.json();
    document.getElementById("stat-new-users").innerText =
      userData.newUsers.toLocaleString("vi-VN");
    updateGrowthUI("stat-new-users-growth", userData.growth);
  } catch (error) {
    console.error("Lỗi khi tải thông số:", error);
  }
}

/**
 * Hàm cập nhật Huy hiệu tăng trưởng (% Growth)
 * @param {string} elementId - ID của thẻ HTML
 * @param {number} growthValue - Giá trị %
 * @param {boolean} inverseColors - Nếu true, giảm (số âm) sẽ hiển thị màu xanh (tốt), tăng sẽ hiển thị màu đỏ (xấu). Thường dùng cho tỷ lệ hủy đơn.
 */
function updateGrowthUI(elementId, growthValue, inverseColors = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Xác định biểu tượng (lên hay xuống)
  const icon = growthValue >= 0 ? "arrow_upward" : "arrow_downward";
  const prefix = growthValue > 0 ? "+" : "";

  // Xác định màu sắc
  let isGood = growthValue >= 0;
  if (inverseColors) isGood = !isGood; // Đảo ngược logic tốt/xấu

  const bgColor = isGood
    ? "bg-emerald-50 text-emerald-800 border-emerald-200" // Màu Xanh
    : "bg-fog text-ember-red border-ember-red/20"; // Màu Đỏ

  // Cập nhật class và nội dung
  el.className = `inline-flex items-center gap-0.5 px-1.5 py-0.5 border text-[11px] font-body-lg font-semibold rounded-DEFAULT ${bgColor}`;
  el.innerHTML = `<span class="material-symbols-outlined text-[13px]">${icon}</span> ${prefix}${growthValue}%`;
}

// ==========================================
// 2. BIỂU ĐỒ DOANH THU & LỢI NHUẬN (HIỆU ỨNG TRỒI LÊN)
// ==========================================
async function renderRevenueChart(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;
  try {
    const token = AuthUtils.getToken();
    const response = await fetch(`${AppConfig.ORDER_API_URL}/orders/admin/statistics/revenue${queryStr}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Lỗi tải dữ liệu biểu đồ doanh thu");
    const data = await response.json();

    const canvas = document.getElementById("revenueChart");
    if (!canvas) return;
    
    let existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const ctx = canvas.getContext("2d");
    
    // Tạo hiệu ứng đổ bóng Gradient
    let revenueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    revenueGradient.addColorStop(0, "rgba(26, 33, 30, 0.2)"); 
    revenueGradient.addColorStop(1, "rgba(26, 33, 30, 0)");   

    new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(item => item.date),
        datasets: [
          {
            label: "Doanh thu",
            data: data.map(item => item.revenue),
            borderColor: "#1a211e", 
            backgroundColor: revenueGradient,
            borderWidth: 3, 
            tension: 0.4, 
            fill: true, 
            pointRadius: 0, 
            pointHoverRadius: 6, 
            pointHoverBackgroundColor: "#1a211e", 
            pointHoverBorderColor: "#ffffff", 
            pointHoverBorderWidth: 2 
          },
          {
            label: "Lợi nhuận",
            data: data.map(item => item.profit),
            borderColor: "#059669", 
            borderWidth: 2, 
            borderDash: [5, 5], 
            tension: 0.4, 
            fill: false, 
            pointRadius: 0, 
            pointHoverRadius: 6, 
            pointHoverBackgroundColor: "#059669", 
            pointHoverBorderColor: "#ffffff", 
            pointHoverBorderWidth: 2 
          }
        ]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false,
        
        // CẤU HÌNH HIỆU ỨNG ĐỒNG LOẠT TRỒI LÊN TỪ ĐÁY (TRỤC Y)
        animation: {
            duration: 1500, // Thời gian hoàn thành hiệu ứng: 1.5 giây
            easing: 'easeOutQuart', // Nhanh lúc đầu, chậm dần về cuối
            y: {
                from: function(context) {
                    // Ép tất cả các điểm dữ liệu xuất phát từ giá trị 0 của trục Y
                    if (context.type === 'data') {
                        return context.chart.scales.y.getPixelForValue(0);
                    }
                }
            }
        },

        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(26, 33, 30, 0.95)',
                titleFont: { family: 'JetBrains Mono', size: 13 },
                bodyFont: { family: 'Geist', size: 13 },
                padding: 12,
                cornerRadius: 6,
                boxPadding: 6,
                callbacks: {
                    labelColor: function(context) {
                        return {
                            borderColor: context.dataset.borderColor,
                            backgroundColor: context.dataset.borderColor,
                            borderWidth: 0,
                            borderRadius: 2 
                        };
                    },
                    label: function(context) {
                        return `${context.dataset.label}: ${UIUtils.formatCurrency(context.raw)}`;
                    }
                }
            }
        },
        scales: {
          y: { 
              grid: { color: "#eef1f0" }, 
              ticks: { 
                  callback: value => value >= 1000000000 ? (value / 1000000000) + ' Tỷ' : (value >= 1000000 ? (value / 1000000) + ' Tr' : value)
              } 
          },
          x: { grid: { display: false } }
        }
      }
    });
  } catch (error) { 
      console.error(error); 
  }
}

// ==========================================
// 3. BIỂU ĐỒ CƠ CẤU DANH MỤC (SVG) CÓ HIỆU ỨNG TƯƠNG TÁC & XUẤT HIỆN
// ==========================================
async function renderCategoryChart(queryStr = "") {
  if (!AuthUtils.isLoggedIn()) return;
  try {
    const response = await fetch(`${AppConfig.ORDER_API_URL}/orders/admin/statistics/categories${queryStr}`, { headers: { Authorization: `Bearer ${AuthUtils.getToken()}` } });
    const data = await response.json();
    
    const validData = data.filter(item => item.totalRevenue > 0);

    const svgContainer = document.getElementById("category-donut-svg");
    const barsContainer = document.getElementById("category-bars-container");
    const totalLabel = document.getElementById("total-revenue-label");
    if (!svgContainer || !barsContainer) return;

    if (validData.length === 0) {
      svgContainer.innerHTML = `<circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f4f3" stroke-width="12"></circle>`;
      barsContainer.innerHTML = '<p class="text-center text-sm text-graphite py-4">Chưa có giao dịch trong thời gian này.</p>';
      if (totalLabel) totalLabel.innerText = "0 ₫";
      return;
    }

    const totalRevenue = validData.reduce((sum, item) => sum + item.totalRevenue, 0);
    if (totalLabel) {
      if (totalRevenue >= 1000000000) totalLabel.innerText = (totalRevenue / 1000000000).toFixed(2) + " Tỷ";
      else if (totalRevenue >= 1000000) totalLabel.innerText = (totalRevenue / 1000000).toFixed(1) + " Tr";
      else totalLabel.innerText = UIUtils.formatCurrency(totalRevenue);
    }

    const colors = [
      { stroke: "#1a211e", bg: "bg-[#1a211e]" },
      { stroke: "#606562", bg: "bg-[#606562]" },
      { stroke: "#94a3b8", bg: "bg-slate-400" },
      { stroke: "#cc2e39", bg: "bg-[#cc2e39]" },
      { stroke: "#cbd5e1", bg: "bg-slate-300" },
      { stroke: "#059669", bg: "bg-emerald-600" } 
    ];

    const CIRCUMFERENCE = 251.3;
    let svgHtml = `<circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f4f3" stroke-width="12"></circle>`;
    let barsHtml = "";
    let offset = 0;

    validData.forEach((item, index) => {
      const percent = (item.totalRevenue / totalRevenue) * 100;
      const strokeLen = (percent / 100) * CIRCUMFERENCE;
      const color = colors[index % colors.length];

      let formatRev = UIUtils.formatCurrency(item.totalRevenue);
      if (item.totalRevenue >= 1000000000) formatRev = (item.totalRevenue / 1000000000).toFixed(2) + " tỷ ₫";
      else if (item.totalRevenue >= 1000000) formatRev = (item.totalRevenue / 1000000).toFixed(1) + " tr ₫";

      // 1. CẬP NHẬT SVG: Thêm transition-all duration-1000. Cài đặt độ dài ban đầu là 0, lưu độ dài thật vào data-target-array
      svgHtml += `<circle class="donut-segment cursor-pointer outline-none transition-all duration-1000 ease-out hover:opacity-70"
                          cx="50" cy="50" fill="transparent" r="40" 
                          stroke="${color.stroke}" 
                          stroke-dasharray="0 ${CIRCUMFERENCE}" 
                          stroke-dashoffset="${-offset}" 
                          stroke-width="12"
                          data-target-array="${strokeLen} ${CIRCUMFERENCE}"
                          data-name="${item.categoryName}"
                          data-percent="${percent.toFixed(1)}"
                          data-revenue="${formatRev}"
                          data-color="${color.stroke}">
                  </circle>`;
      offset += strokeLen;

      // 2. CẬP NHẬT BAR: Đặt style="width: 0%;" ban đầu, lưu chiều rộng thật vào data-target-width
      barsHtml += `
        <div>
            <div class="flex items-center justify-between text-xs mb-1">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-DEFAULT ${color.bg}"></span>
                    <span class="text-carbon-ink font-medium">${item.categoryName}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-body-lg font-bold text-carbon-ink">${percent.toFixed(1)}%</span>
                    <span class="font-body-lg text-graphite text-right">${formatRev}</span>
                </div>
            </div>
            <div class="w-full bg-fog h-1.5 rounded-full overflow-hidden">
                <div class="${color.bg} category-bar h-full transition-all duration-1000 ease-out" style="width: 0%;" data-target-width="${percent}%"></div>
            </div>
        </div>
      `;
    });

    // In mã HTML ra màn hình
    svgContainer.innerHTML = svgHtml;
    barsContainer.innerHTML = barsHtml;

    // 3. KÍCH HOẠT HIỆU ỨNG (ANIMATION)
    // Sau khi DOM nhận mã HTML, chờ 50ms để trình duyệt ghi nhận trạng thái 0, sau đó cập nhật thông số thật để tạo chuyển động
    setTimeout(() => {
        // Hiệu ứng vòng tròn
        const segments = svgContainer.querySelectorAll('.donut-segment');
        segments.forEach(seg => {
            seg.setAttribute('stroke-dasharray', seg.getAttribute('data-target-array'));
        });
        
        // Hiệu ứng thanh ngang
        const bars = barsContainer.querySelectorAll('.category-bar');
        bars.forEach(bar => {
            bar.style.width = bar.getAttribute('data-target-width');
        });
    }, 50);

    // ===============================================
    // PHẦN LOGIC TOOLTIP (GIỮ NGUYÊN HOÀN TOÀN NHƯ CŨ)
    // ===============================================
    let tooltip = document.getElementById("donut-tooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "donut-tooltip";
        tooltip.className = "fixed z-50 hidden bg-[#2a2a2a] text-paper-white px-3.5 py-2.5 rounded-md shadow-xl pointer-events-none transition-opacity duration-150";
        document.body.appendChild(tooltip);
    }

    const segments = svgContainer.querySelectorAll('.donut-segment');
    segments.forEach(segment => {
        segment.addEventListener('mouseenter', (e) => {
            const name = segment.getAttribute('data-name');
            const percent = segment.getAttribute('data-percent');
            const revenue = segment.getAttribute('data-revenue');
            const color = segment.getAttribute('data-color'); 

            tooltip.innerHTML = `
                <div class="absolute w-3 h-3 bg-[#2a2a2a] rotate-45 -left-1 top-4 -z-10 rounded-sm"></div>
                <div class="relative z-10 whitespace-nowrap">
                    <div class="font-bold text-[14px] text-white mb-1.5">${name}</div>
                    <div class="flex items-center gap-1.5 text-[13px] text-gray-200">
                        <span class="inline-block w-3.5 h-3.5 rounded-sm border border-white/60 shrink-0" style="background-color: ${color}"></span>
                        <span>${name}: ${revenue} (${percent}%)</span>
                    </div>
                </div>
            `;
            tooltip.classList.remove('hidden');
            tooltip.classList.add('opacity-100');
        });

        segment.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 18) + 'px';
            tooltip.style.top = (e.clientY - 20) + 'px';
        });

        segment.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('opacity-100');
        });
    });

  } catch (e) { 
      console.error(e); 
  }
}

// ==========================================
// 4. BẢNG DỮ LIỆU ĐỘNG (TOP 5, SẮP HẾT, Ứ ĐỌNG)
// ==========================================

// Bảng: Top 5 Sản phẩm Bán chạy nhất
async function loadTopSelling(queryStr = "") {
  const container = document.getElementById("top-selling-body");
  if (!container) return;
  try {
    const res = await fetch(
      `${AppConfig.ORDER_API_URL}/orders/admin/statistics/top-products${queryStr}`,
      { headers: { Authorization: `Bearer ${AuthUtils.getToken()}` } },
    );
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-graphite font-body-lg">Chưa có dữ liệu bán hàng.</div>`;
      return;
    }

    container.innerHTML = data
      .map((p, index) => {
        // Phân định kiểu dáng cho Top 1, Top 2, và phần còn lại
        const rankClass =
          index === 0
            ? "bg-carbon-ink text-paper-white"
            : index === 1
              ? "bg-carbon-ink/80 text-paper-white"
              : "bg-fog text-carbon-ink border border-mist";

        let revText = UIUtils.formatCurrency(p.totalRevenue);
        if (p.totalRevenue >= 1000000000)
          revText = (p.totalRevenue / 1000000000).toFixed(2) + " Tỷ ₫";
        else if (p.totalRevenue >= 1000000)
          revText = (p.totalRevenue / 1000000).toFixed(1) + " Tr ₫";

        return `
        <div class="py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <span class="inline-flex items-center justify-center w-7 h-7 shrink-0 font-body-lg text-xs font-bold rounded-DEFAULT ${rankClass}">#${index + 1}</span>
                <img class="w-10 h-10 object-cover rounded-DEFAULT bg-fog border border-mist shrink-0" src="${p.thumbnail || "https://placehold.co/100"}" alt="product">
                <div class="min-w-0">
                    <h4 class="font-body-lg font-semibold text-carbon-ink text-[14px] truncate" title="${p.productName}">${p.productName}</h4>
                    <span class="font-body-lg text-[12px] text-graphite">Đã bán: ${p.totalQuantity} chiếc</span>
                </div>
            </div>
            <div class="text-right shrink-0">
                <div class="font-body-lg text-xs font-bold text-carbon-ink">${revText}</div>
            </div>
        </div>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
  }
}

// Bảng: Cảnh báo Sắp hết & Tồn kho ứ đọng cao
async function loadInventoryStats() {
  const lowContainer = document.getElementById("low-stock-body");
  const highContainer = document.getElementById("high-stock-body");
  if (!lowContainer || !highContainer) return;

  try {
    const res = await fetch(
      `${AppConfig.ORDER_API_URL}/orders/admin/statistics/inventory`,
      { headers: { Authorization: `Bearer ${AuthUtils.getToken()}` } },
    );
    const data = await res.json();

    // Render danh sách Sắp hết hàng
    if (data.lowStock && data.lowStock.length > 0) {
      lowContainer.innerHTML = data.lowStock
        .map(
          (p) => `
        <div class="py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img class="w-10 h-10 object-cover rounded-DEFAULT bg-fog border border-mist shrink-0" src="${p.thumbnail || "https://placehold.co/100"}">
                <div class="min-w-0">
                    <!-- Đã đồng bộ class tiêu đề giống hệt Top 5 -->
                    <h4 class="font-body-lg font-semibold text-carbon-ink text-[14px] truncate" title="${p.name}">${p.name}</h4>
                    <!-- Đã đồng bộ class phụ đề giống hệt Top 5, thêm màu đỏ cảnh báo -->
                    <span class="font-body-lg text-[12px] text-ember-red font-semibold">Tồn kho: ${p.stock} chiếc</span>
                </div>
            </div>
            
        </div>`,
        )
        .join("");
    } else {
      lowContainer.innerHTML = `<div class="p-4 text-center text-graphite font-body-lg">Kho hàng đang đầy đủ.</div>`;
    }

    // Render danh sách Tồn kho nhiều (Ứ đọng)
    if (data.highStock && data.highStock.length > 0) {
      highContainer.innerHTML = data.highStock
        .map(
          (p) => `
        <div class="py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img class="w-10 h-10 object-cover rounded-DEFAULT bg-fog border border-mist shrink-0" src="${p.thumbnail || "https://placehold.co/100"}">
                <div class="min-w-0">
                    <!-- Đã đồng bộ class tiêu đề giống hệt Top 5 -->
                    <h4 class="font-body-lg font-semibold text-carbon-ink text-[14px] truncate" title="${p.name}">${p.name}</h4>
                    <!-- Đã đồng bộ class phụ đề giống hệt Top 5 -->
                    <span class="font-body-lg text-[12px] text-graphite">Tồn kho: ${p.stock} chiếc</span>
                </div>
            </div>
        </div>`,
        )
        .join("");
    } else {
      highContainer.innerHTML = `<div class="p-4 text-center text-graphite font-body-lg">Không có hàng tồn ứ đọng.</div>`;
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// 5. CÔNG CỤ BỘ LỌC THỜI GIAN (CHỌN & NHẬP 1 NGÀY)
// ==========================================
function initFilterLogic() {
  const buttons = document.querySelectorAll(".filter-btn");
  const dateInput = document.getElementById("filter-date");

  // Chặn không cho chọn hoặc nhập ngày tương lai
  const todayString = new Date().toISOString().split("T")[0];
  if (dateInput) {
    dateInput.setAttribute("max", todayString);
  }

  // 1. Lắng nghe sự kiện click trên các nút lọc mặc định (Hôm nay, Tuần này...)
  if(buttons.length) {
      buttons.forEach(btn => {
        btn.addEventListener("click", function () {
          // Khôi phục giao diện các nút
          buttons.forEach(b => {
            b.classList.remove("bg-carbon-ink", "text-paper-white", "shadow-sm");
            b.classList.add("bg-transparent", "text-graphite");
          });
          
          this.classList.remove("bg-transparent", "text-graphite");
          this.classList.add("bg-carbon-ink", "text-paper-white", "shadow-sm");
          
          // Reset ô nhập ngày (xóa dữ liệu nếu đang có)
          if (dateInput) {
            dateInput.value = "";
            dateInput.classList.remove("border-carbon-ink");
          }
    
          // Cập nhật Query và tải lại thống kê
          const filter = this.getAttribute("data-filter");
          currentFilterQuery = `?filter=${filter}`;
          reloadAllStats();
        });
      });
  }

  // 2. Lắng nghe sự kiện người dùng GÕ (nhập) hoặc CHỌN ngày từ lịch
  if (dateInput) {
    // Sự kiện 'change' tự động bắt được khi người dùng gõ đủ ngày hợp lệ hoặc chọn từ lịch
    dateInput.addEventListener("change", function () {
      const selectedDate = this.value; 
      
      // Nếu người dùng xóa trắng ô nhập liệu thì dừng lại
      if (!selectedDate) return;

      // Hủy kích hoạt màu nền của các nút (Hôm nay, Tuần này...)
      buttons.forEach(b => {
        b.classList.remove("bg-carbon-ink", "text-paper-white", "shadow-sm");
        b.classList.add("bg-transparent", "text-graphite");
      });
      
      // Bật viền đen cho ô input để báo hiệu đang sử dụng bộ lọc này
      this.classList.add("border-carbon-ink");

      // Gửi tham số ngày lên API
      currentFilterQuery = `?date=${selectedDate}`;
      reloadAllStats();
    });
  }
}