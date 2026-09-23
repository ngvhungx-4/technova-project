document.addEventListener("DOMContentLoaded", () => {
  // 1. Cấu hình các hằng số hạng thành viên
  const TIERS = {
    BASIC: { min: 0, next: 1000, nextName: "SILVER" },
    SILVER: { min: 1000, next: 3000, nextName: "GOLD" },
    GOLD: { min: 3000, next: 7000, nextName: "ELITE" },
    ELITE: { min: 7000, next: 7000, nextName: "MAX" },
  };

  // Sử dụng hàm kiểm tra đăng nhập có sẵn từ common.js
  if (!AuthUtils.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // --- HÀM KHỞI TẠO ---
  async function initPointsPage() {
    await fetchUserData();
    fetchVouchers();
    fetchTransactionHistory();
  }

  // --- 1. LẤY DỮ LIỆU NGƯỜI DÙNG & TÍNH TOÁN HẠNG ---
  async function fetchUserData() {
    try {
      // ĐÃ SỬA: Dùng ApiUtils.fetchAPI để tự động lo việc gắn Token
      const user = await ApiUtils.fetchAPI("/users/profile");

      // Mặc định an toàn
      const currentPoints = user.currentPoints || 0;
      const cyclePoints = user.cyclePoints || 0;
      const tierName = user.membershipTier || "BASIC";

      // Cập nhật Hero Section
      document.getElementById("tier-name").innerText = `${tierName} MEMBER`;
      document.getElementById("current-points").innerText =
        formatNumber(currentPoints);
      document.getElementById("available-points-voucher").innerText =
        `Điểm khả dụng: ${formatNumber(currentPoints)} PTS`;

      // Cập nhật thanh tiến trình (Progress Bar)
      updateProgressBar(tierName, cyclePoints);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu người dùng:", error);
    }
  }

  // --- 2. XỬ LÝ THANH TIẾN TRÌNH ---
  function updateProgressBar(tierName, cyclePoints) {
    const tierInfo = TIERS[tierName];

    let progressPercent = 0;
    let pointsNeeded = 0;

    if (tierName === "ELITE") {
      progressPercent = 100;
      document.getElementById("progress-text").innerHTML =
        `Bạn đã đạt cấp độ cao nhất!`;
      document.getElementById("next-tier-label").innerText = `ELITE MAX`;
    } else {
      pointsNeeded = tierInfo.next - cyclePoints;
      progressPercent = (cyclePoints / 7000) * 100;

      document.getElementById("progress-text").innerHTML =
        `Bạn cần thêm <strong class="font-body-lg text-primary font-semibold">${formatNumber(pointsNeeded)} điểm</strong> để nâng hạng ${tierInfo.nextName}.`;
      document.getElementById("next-tier-label").innerText =
        `${tierInfo.nextName} (${formatNumber(tierInfo.next)} pts)`;
    }

    document.getElementById("current-tier-label").innerText =
      `${tierName} (Hiện tại)`;
    document.getElementById("progress-bar").style.width = `${progressPercent}%`;

    highlightSteps(cyclePoints);
  }

  function highlightSteps(points) {
    const activeClass =
      "border-t-2 border-ember-red pt-1 font-semibold text-ember-red";
    const passedClass =
      "border-t-2 border-carbon-ink pt-1 font-semibold text-primary";

    if (points >= 0)
      document.getElementById("step-basic").className =
        points >= 1000 ? passedClass : activeClass;
    if (points >= 1000)
      document.getElementById("step-silver").className =
        points >= 3000 ? passedClass : activeClass;
    if (points >= 3000)
      document.getElementById("step-gold").className =
        points >= 7000 ? passedClass : activeClass;
    if (points >= 7000)
      document.getElementById("step-elite").className = activeClass;
  }

  // --- 3. LẤY & RENDER VOUCHER ---
  async function fetchVouchers() {
    try {
      // SỬA URL: Gọi đúng endpoint lấy voucher đổi điểm
      const vouchers = await ApiUtils.fetchAPI("/vouchers/public/redeemable");
      renderVouchers(vouchers);
    } catch (error) {
      console.error("Lỗi lấy vouchers:", error);
      document.getElementById("voucher-list").innerHTML =
        `<p class="text-secondary">Không thể tải danh sách Voucher lúc này.</p>`;
    }
  }

function renderVouchers(vouchers) {
    const container = document.getElementById("voucher-list");
    container.innerHTML = ""; 

    // Không cần hàm filter (lọc) bằng JS nữa vì Backend đã lo việc này
    if (!vouchers || vouchers.length === 0) {
      container.innerHTML = `<p class="col-span-4 text-center text-secondary py-10">Chưa có phần thưởng đổi điểm nào khả dụng lúc này.</p>`;
      return;
    }

    // Lặp qua toàn bộ mảng dữ liệu đã chuẩn hóa từ Backend
    vouchers.forEach((voucher) => {
      const costPoints = voucher.exchangePoints;

      const html = `
        <div class="group bg-paper-white border border-carbon-ink/20 relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-carbon-ink shadow-sm hover:shadow-lg">
            <div class="p-4 border-b border-mist/80 bg-fog flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                    <span class="font-body-lg text-[11px] uppercase tracking-wider text-secondary">MÃ: ĐỔI ĐIỂM ĐỂ XEM</span>
                </div>
            </div>
            <div class="p-lg">
                <div class="w-7 h-0.5 bg-carbon-ink mb-3"></div>
                <h3 class="font-body-lg text-2xl font-normal text-primary mb-2">Giảm ${formatNumber(voucher.discountValue)}${voucher.discountType === "PERCENTAGE" ? "%" : "đ"}</h3>
                <p class="font-body-sm text-body-sm text-secondary leading-snug">
                    Đơn tối thiểu: ${formatNumber(voucher.minOrderAmount || 0)}đ
                </p>
            </div>
            <div class="relative py-2 px-lg flex items-center">
                <div class="w-full border-t border-dashed border-mist"></div>
            </div>
            <div class="p-lg pt-0 flex justify-between items-center mt-2">
                <div>
                    <span class="text-[10px] font-technical-mono text-secondary uppercase block">COST</span>
                    <p class="font-body-lg text-technical-mono font-bold text-carbon-ink">${formatNumber(costPoints)} PTS</p>
                </div>
                <button onclick="redeemVoucher(${voucher.id}, ${costPoints})" class="font-label-caps text-label-caps uppercase bg-carbon-ink text-paper-white px-4 py-2 hover:bg-black transition-colors duration-150">
                    Đổi ngay
                </button>
            </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", html);
    });
  }

  // --- 4. LẤY & RENDER LỊCH SỬ GIAO DỊCH (ĐIỂM) ---
  async function fetchTransactionHistory() {
    try {
      // ĐÃ SỬA: Dùng ApiUtils.fetchAPI
      const history = await ApiUtils.fetchAPI("/users/points/history");

      if (history && history.length > 0) {
        renderTransactions(history);
      } else {
        showEmptyHistory();
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
      showEmptyHistory();
    }
  }

  function showEmptyHistory() {
    document.getElementById("transaction-list").innerHTML =
      `<p class="px-xl py-5 text-secondary">Chưa có lịch sử giao dịch.</p>`;
    document.getElementById("transaction-footer-info").innerText = "0 BẢN GHI";
    document.getElementById("total-transactions").innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Tổng giao dịch: 0
        `;
  }

  function renderTransactions(transactions) {
    const container = document.getElementById("transaction-list");
    container.innerHTML = "";

    document.getElementById("total-transactions").innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Tổng giao dịch: ${transactions.length < 10 ? "0" + transactions.length : transactions.length}
        `;

    transactions.forEach((tx) => {
      const dateObj = new Date(tx.createdAt);
      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];
      const isPositive = tx.points >= 0;

      const html = `
                <div class="grid grid-cols-12 items-center px-lg md:px-xl py-5 hover:bg-fog/50 transition-colors duration-150 group">
                    <div class="col-span-2">
                        <span class="font-body-lg text-[14px] text-primary font-medium block">${date}</span>
                        <span class="text-[12px] text-secondary  font-body-lg">${time}</span>
                    </div>
                    <!-- Thay đổi thành col-span-3 -->
                    <div class="col-span-3 flex flex-col gap-1">
                        <span class="font-body-lg text-[14px] text-primary tracking-wider">${tx.orderCode || "HỆ THỐNG"}</span>
                    </div>
                    <!-- Thay đổi thành col-span-5 -->
                    <div class="col-span-5 pr-4">
                        <div class="font-body-lg text-primary text-[14px] md:text-base font-normal flex items-center gap-2">
                            <span>${tx.reason}</span>
                        </div>
                    </div>
                    <!-- Xóa pr-4 để nhãn dán sát cạnh phải -->
                    <div class="col-span-2 text-right">
                        <div class="inline-flex items-baseline gap-1 ${isPositive ? "bg-ember-red text-paper-white" : "bg-white border border-mist text-secondary"} font-body-lg font-bold px-2.5 py-1 text-xs shadow-sm">
                            <span>${isPositive ? "+" : ""}${formatNumber(tx.points)}</span>
                            <span class="text-[9px] font-normal tracking-widest ${isPositive ? "opacity-90" : "text-secondary"}">PTS</span>
                        </div>
                    </div>
                </div>
            `;
      container.insertAdjacentHTML("beforeend", html);
    });

    document.getElementById("transaction-footer-info").innerText =
      `HIỂN THỊ ${transactions.length} BẢN GHI`;
  }

  // --- HÀM TIỆN ÍCH ---
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  window.redeemVoucher = async function (voucherId, cost) {
    // 1. Xác nhận người dùng muốn đổi điểm
    if (
      !confirm(
        `Bạn có chắc chắn muốn dùng ${formatNumber(cost)} điểm để đổi voucher này không?`,
      )
    ) {
      return;
    }

    try {
      // 2. Gọi API Backend để trừ điểm và nhận mã cá nhân hóa
      const data = await ApiUtils.fetchAPI(
        `/vouchers/redeem/${voucherId}?cost=${cost}`,
        {
          method: "POST",
        },
      );

      // 3. Thông báo thành công và hiển thị mã
      alert(
        `Chúc mừng! Đổi điểm thành công.\nMã giảm giá cá nhân của bạn là: ${data.voucherCode}\n(Hệ thống đã lưu mã này vào tài khoản của bạn)`,
      );

      // 4. Tải lại trang để cập nhật số dư điểm và bảng lịch sử giao dịch
      window.location.reload();
    } catch (error) {
      alert("Đổi điểm thất bại: " + error.message);
    }
  };

  // Chạy script
  initPointsPage();
});
