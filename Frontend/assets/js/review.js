// ==========================================
// LOGIC ĐÁNH GIÁ SẢN PHẨM & KIỂM TRA TRẠNG THÁI
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  setRating(5); // Thiết lập 5 sao mặc định ban đầu
  initGuestReview(); // Kích hoạt quy trình đọc URL để lấy thông tin đơn hàng
});

// Hàm thay đổi trạng thái màu sắc của các ngôi sao khi được nhấp vào
function setRating(stars) {
  document.getElementById("review-rating").value = stars;
  const starElements = document.querySelectorAll("#star-rating button span");

  starElements.forEach((el, index) => {
    if (index < stars) {
      el.className = "material-symbols-outlined material-symbols-fill !text-3xl text-carbon-ink";
    } else {
      el.className = "material-symbols-outlined !text-3xl text-graphite/40";
    }
  });
}

// Đọc URL, tải thông tin đơn hàng và kiểm tra trạng thái đánh giá
async function initGuestReview() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const orderId = urlParams.get("orderId");

  if (!token || !orderId) {
    alert("Đường dẫn đánh giá không hợp lệ hoặc đã thiếu tham số!");
    return;
  }

  window.guestToken = token;
  window.currentOrderId = orderId;

  try {
    const response = await fetch(`${AppConfig.ORDER_API_URL}/orders/${orderId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
    });

    if (!response.ok) throw new Error("Không tải được đơn hàng");

    const order = await response.json();

    if(order.receiverName) {
        document.getElementById("guest-name").value = order.receiverName;
    }

    if (order.items && order.items.length > 0) {
      window.currentOrderItems = order.items;
      
      // KIỂM TRA TRẠNG THÁI ĐÃ ĐÁNH GIÁ CHO TỪNG SẢN PHẨM TRONG ĐƠN
      // Bằng cách gọi API lấy reviews của ProductService
      await Promise.all(window.currentOrderItems.map(async (item) => {
          try {
              const revRes = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${item.productId}/reviews`);
              if (revRes.ok) {
                  const reviews = await revRes.json();
                  // Kiểm tra xem có review nào chứa orderId của đơn hàng hiện tại không
                  const alreadyReviewed = reviews.some(r => r.orderId.toString() === window.currentOrderId.toString());
                  item.isReviewed = alreadyReviewed;
              } else {
                  item.isReviewed = false;
              }
          } catch (e) {
              item.isReviewed = false;
          }
      }));
      
      // Mặc định ưu tiên chọn sản phẩm chưa đánh giá đầu tiên
      const firstUnreviewed = window.currentOrderItems.find(item => !item.isReviewed);
      window.currentProductId = firstUnreviewed ? firstUnreviewed.productId : window.currentOrderItems[0].productId;
      
      renderProductList();
      changeGuestProduct(window.currentProductId);
    }
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Phiên đánh giá đã hết hạn hoặc đơn hàng không tồn tại!");
  }
}

// Render giao diện danh sách thẻ Sản Phẩm
function renderProductList() {
    const container = document.getElementById("product-selector-container");
    const asidePanel = document.getElementById("aside-product-list");
    const reviewSection = document.getElementById("review-section");
    
    if (!container || !window.currentOrderItems) return;
  
    if (window.currentOrderItems.length <= 1) {
        asidePanel.classList.add("hidden");
        reviewSection.classList.remove("lg:col-span-8");
        reviewSection.classList.add("lg:col-span-12");
        return;
    }
  
    asidePanel.classList.remove("hidden");
    reviewSection.classList.remove("lg:col-span-12");
    reviewSection.classList.add("lg:col-span-8");
  
    container.innerHTML = window.currentOrderItems.map((item) => {
      const isActive = item.productId.toString() === window.currentProductId.toString();
      const imageUrl = item.productThumbnail || "https://placehold.co/400x300?text=No+Image";
      
      // Giao diện text thay đổi dựa vào việc đã đánh giá hay chưa
      const statusHtml = item.isReviewed 
            ? `<span class="font-label-sm text-[12px] text-[#16a34a] font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">check_circle</span> Đã đánh giá</span>`
            : `<span class="font-label-sm text-[12px] text-graphite group-hover:text-carbon-ink underline underline-offset-2">Chọn viết đánh giá</span>`;

      if (isActive) {
        return `
          <div class="relative bg-paper-white border-2 border-carbon-ink rounded-xl p-md transition-all cursor-pointer">
              <div class="absolute -top-3 right-4 bg-carbon-ink text-paper-white px-sm py-[2px] rounded-DEFAULT font-technical-mono text-[11px] tracking-wider">
                  ĐANG XEM
              </div>
              <div class="flex gap-md">
                  <div class="w-20 h-20 bg-fog rounded-DEFAULT flex-shrink-0 flex items-center justify-center p-xs border border-mist overflow-hidden">
                      <img class="w-full h-full object-contain" src="${imageUrl}">
                  </div>
                  <div class="flex flex-col justify-center flex-grow">
                      <h3 class="font-body-lg text-body-lg font-bold text-carbon-ink leading-tight">${item.productName}</h3>
                      <div class="mt-sm pt-xs border-t border-mist/60 flex items-center justify-end">
                          ${statusHtml}
                      </div>
                  </div>
              </div>
          </div>
        `;
      } else {
        return `
          <div onclick="changeGuestProduct('${item.productId}')" class="group bg-paper-white hover:bg-fog/50 border border-mist rounded-xl p-md transition-all cursor-pointer">
              <div class="flex gap-md">
                  <div class="w-20 h-20 bg-fog rounded-DEFAULT flex-shrink-0 flex items-center justify-center p-xs border border-mist overflow-hidden">
                      <img class="w-full h-full object-contain" src="${imageUrl}">
                  </div>
                  <div class="flex flex-col justify-between flex-grow">
                      <div>
                          <h3 class="font-body-lg text-body-lg font-semibold text-carbon-ink leading-tight group-hover:text-primary">${item.productName}</h3>
                      </div>
                      <div class="flex items-center justify-end mt-sm pt-xs border-t border-mist/60">
                          ${statusHtml}
                      </div>
                  </div>
              </div>
          </div>
        `;
      }
    }).join("");
}

// Đổi sản phẩm hiển thị khi khách chọn trong danh sách
function changeGuestProduct(productId) {
  if (!window.currentOrderItems) return;

  const product = window.currentOrderItems.find((p) => p.productId.toString() === productId.toString());

  if (product) {
    window.currentProductId = product.productId;
    
    renderProductList();

    // Đổi ảnh và tên trên header Form
    document.getElementById("product-name-display").innerText = product.productName;
    document.getElementById("product-image-display").src = product.productThumbnail || "https://placehold.co/400x300?text=No+Image";

    // Tải lại bảng thống kê đánh giá
    loadProductReviews(window.currentProductId);

    // KKIỂM TRA VÀ ẨN/HIỆN FORM ĐÁNH GIÁ
    const reviewForm = document.getElementById("review-form");
    const reviewedMessage = document.getElementById("already-reviewed-message");

    if (product.isReviewed) {
        // Nếu đã đánh giá: Ẩn form, hiện thông báo cảm ơn
        reviewForm.classList.add("hidden");
        reviewedMessage.classList.remove("hidden");
    } else {
        // Nếu chưa đánh giá: Hiện form, ẩn thông báo, làm mới nội dung
        reviewForm.classList.remove("hidden");
        reviewedMessage.classList.add("hidden");
        document.getElementById("review-comment").value = "";
        setRating(5);
    }
  }
}

// Gửi đánh giá lên máy chủ
async function submitGuestReview(btnElement) {
  if (!window.guestToken || !window.currentProductId) {
    alert("Dữ liệu không hợp lệ, vui lòng kiểm tra lại kết nối.");
    return;
  }

  const rating = document.getElementById("review-rating").value;
  const comment = document.getElementById("review-comment").value;
  const guestName = document.getElementById("guest-name").value;

  if (!comment.trim() || !guestName.trim()) {
    alert("Vui lòng nhập đầy đủ họ tên và nội dung đánh giá!");
    return;
  }

  const originalText = btnElement.innerText;
  btnElement.innerText = "ĐANG GỬI...";
  btnElement.disabled = true;

  try {
    const payload = {
      orderId: parseInt(window.currentOrderId),
      rating: parseInt(rating),
      comment: comment,
      reviewerName: guestName,
      reviewerAvatar: "",
    };

    const response = await fetch(
      `${AppConfig.PRODUCT_API_URL}/products/${window.currentProductId}/reviews`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${window.guestToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      // Đánh dấu sản phẩm là đã đánh giá trong bộ nhớ
      const product = window.currentOrderItems.find(p => p.productId.toString() === window.currentProductId.toString());
      if (product) {
          product.isReviewed = true;
      }
      
      // Load lại giao diện (Nó sẽ tự động ẩn form và hiện thông báo)
      changeGuestProduct(window.currentProductId);
      
    } else {
      const errText = await response.text();
      alert("Lỗi: " + errText);
    }
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối đến máy chủ!");
  } finally {
    btnElement.innerText = originalText;
    btnElement.disabled = false;
  }
}

// ==========================================
// THỐNG KÊ PHÂN BỔ ĐÁNH GIÁ (ĐÃ ĐỒNG NHẤT UI)
// ==========================================

async function loadProductReviews(productId) {
  try {
    const response = await fetch(`${AppConfig.PRODUCT_API_URL}/products/${productId}/reviews`);
    if (response.ok) {
      const reviewsData = await response.json();
      renderReviewStats(reviewsData);
    }
  } catch (error) {
    console.error("Lỗi khi tải thống kê đánh giá:", error);
  }
}

function renderReviewStats(reviewsData) {
  const totalReviews = reviewsData.length;
  let sumRating = 0;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviewsData.forEach((rev) => {
    sumRating += rev.rating;
    if (starCounts[rev.rating] !== undefined) starCounts[rev.rating]++;
  });

  const averageRating = totalReviews === 0 ? "0.0" : (sumRating / totalReviews).toFixed(1);

  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= averageRating) {
      starsHtml += `<span class="material-symbols-outlined text-[24px] material-symbols-fill text-carbon-ink">star</span>`;
    } else if (i === Math.ceil(averageRating) && !Number.isInteger(parseFloat(averageRating))) {
      starsHtml += `<span class="material-symbols-outlined text-[24px] material-symbols-fill text-carbon-ink">star_half</span>`;
    } else {
      starsHtml += `<span class="material-symbols-outlined text-[24px] text-graphite/40">star</span>`;
    }
  }

  let progressBarsHtml = "";
  for (let i = 5; i >= 1; i--) {
    const percent = totalReviews === 0 ? 0 : Math.round((starCounts[i] / totalReviews) * 100);
    progressBarsHtml += `
        <div class="flex items-center gap-md text-sm">
            <span class="w-12 whitespace-nowrap font-label-caps text-carbon-ink text-right">
              ${i} sao
            </span>
            <div class="flex-1 h-[6px] bg-mist rounded-full overflow-hidden">
              <div class="h-full bg-carbon-ink transition-all duration-1000" style="width: ${percent}%"></div>
            </div>
            <span class="w-8 text-left font-body-sm text-graphite">${percent}%</span>
        </div>
    `;
  }

  const container = document.getElementById("review-stats-container");
  if (container) {
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md bg-paper-white p-md border border-mist rounded-lg">
            <div class="flex flex-col items-center justify-center p-md bg-fog rounded-lg border border-mist text-center">
                <div class="text-[48px] font-body-lg text-carbon-ink leading-none mb-xs">
                    ${averageRating}<span class="text-[20px] text-graphite font-body-lg">/5</span>
                </div>
                <div class="flex items-center gap-xs mb-xs">
                    ${starsHtml}
                </div>
                <p class="font-body-sm text-graphite font-medium">
                    Dựa trên ${totalReviews} đánh giá thực tế
                </p>
            </div>
            <div class="flex flex-col justify-center gap-sm">
                ${progressBarsHtml}
            </div>
        </div>
    `;
  }
}