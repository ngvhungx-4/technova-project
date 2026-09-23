/**
 * TechNova Chatbot Widget
 * Giao diện: Peak Design Minimal Monochrome (Mã Mới)
 * Logic: API Connection (Mã Cũ)
 */

const CHAT_SESSION_KEY = "chat_history";
let isChatHistoryLoaded = false;

// ==========================================
// 1. TỰ ĐỘNG KHỞI TẠO GIAO DIỆN CHATBOT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const shouldLoadChatbot = document.body.getAttribute("data-use-chatbot") === "true";

  if (shouldLoadChatbot && !document.getElementById("chat-window")) {
    injectChatbotUI();
  }
});

function injectChatbotUI() {
  const chatbotHTML = `
    <!-- CSS để ẩn thanh cuộn -->
    <style>
      /* Ẩn thanh cuộn trên Chrome, Safari và Opera */
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      /* Ẩn thanh cuộn trên IE, Edge và Firefox */
      .no-scrollbar {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
      }
    </style>

    <!-- Nút kích hoạt Chatbot -->
    <button id="chat-toggle-btn" onclick="toggleChat()" 
      class="fixed bottom-6 right-6 w-12 h-12 bg-[#1a211e] text-white flex items-center justify-center rounded-full border border-[#1a211e] hover:bg-black transition-colors z-50 focus:outline-none"
      aria-label="Mở cửa sổ chat">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
    </button>

    <!-- Khung cửa sổ Chatbot -->
    <div id="chat-window" style="height: 520px" 
      class="fixed bottom-6 right-6 w-80 sm:w-96 bg-white border border-[#e0e0e0] rounded flex flex-col hidden z-50 overflow-hidden font-sans">
        
        <!-- Header -->
        <div class="bg-[#1a211e] text-white px-4 py-3 flex justify-between items-center shrink-0">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <h3 class="text-xs font-bold uppercase tracking-[0.057em]">NovaBot</h3>
            </div>
            <button onclick="toggleChat()" class="text-white hover:text-gray-300 transition-colors focus:outline-none" aria-label="Đóng chat">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Danh sách tin nhắn (Đã thêm class no-scrollbar) -->
        <div id="chat-messages" class="no-scrollbar flex-1 p-4 overflow-y-auto space-y-4 bg-white text-sm min-h-0">
            <div class="flex flex-col items-start mb-2">
                <div class="bg-[#eef1f0] text-[#1a211e] border border-[#e0e0e0] p-3 rounded max-w-[85%] break-words leading-relaxed text-[13px]">
                    Chào bạn! Tôi là NovaBot. Bạn đang tìm kiếm sản phẩm nào hôm nay?
                </div>
            </div>
        </div>

        <!-- Khu vực nhập tin nhắn -->
        <div class="p-3 bg-white border-t border-[#e0e0e0] flex gap-2 shrink-0 items-center">
            <input type="text" id="chat-input" placeholder="Nhập câu hỏi của bạn..." 
              class="flex-1 px-3 py-2 text-[13px] bg-[#eef1f0] text-[#1a211e] placeholder-[#606562] border border-[#cccfcd] rounded focus:outline-none focus:border-[#1a211e] transition-colors" 
              onkeypress="handleKeyPress(event)" />
            <button id="chat-send-btn" onclick="sendMessage()" 
              class="bg-[#1a211e] text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.057em] hover:bg-black transition-colors shrink-0 flex items-center justify-center min-w-[60px] h-[36px]">
                <span id="chat-send-text">Gửi</span>
            </button>
        </div>
    </div>
  `;

  const container = document.createElement("div");
  container.id = "chatbot-injected-container";
  container.innerHTML = chatbotHTML;
  document.body.appendChild(container);
}

// ==========================================
// 2. CÁC HÀM XỬ LÝ SỰ KIỆN VÀ GIAO DIỆN
// ==========================================

function toggleChat() {
  const chatWindow = document.getElementById("chat-window");
  const toggleBtn = document.getElementById("chat-toggle-btn");
  const chatInput = document.getElementById("chat-input");

  if (!chatWindow || !chatInput) {
    console.warn("Giao diện Chatbot chưa hoàn tất tải!");
    return;
  }

  if (chatWindow.classList.contains("hidden")) {
    chatWindow.classList.remove("hidden");
    toggleBtn.style.display = "none";
    setTimeout(() => chatInput.focus(), 100);

    if (!isChatHistoryLoaded) {
      loadSessionHistory();
      isChatHistoryLoaded = true;
    } else {
      scrollToBottom();
    }
  } else {
    chatWindow.classList.add("hidden");
    toggleBtn.style.display = "flex";
  }
}

function loadSessionHistory() {
  const history = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || "[]");
  if (history.length > 0) {
    history.forEach((msg) => {
      if (msg.sender === "user") {
        appendMessage("user", msg.text);
      } else {
        const msgId = appendMessage("bot", msg.text);
        if (msg.products && msg.products.length > 0) {
          updateMessage(msgId, msg.text, msg.products);
        }
      }
    });
    scrollToBottom();
  }
}

function saveToSession(sender, text, products = []) {
  const history = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || "[]");
  history.push({ sender, text, products });
  sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(history));
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

function scrollToBottom() {
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, function (tag) {
    const charsToReplace = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return charsToReplace[tag] || tag;
  });
}

function formatAIText(text) {
  if (!text) return "";
  let safeText = escapeHTML(text);
  // Định dạng in đậm theo thiết kế mới
  return safeText
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#1a211e]">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function createTypingIndicatorHtml() {
  return `
    <div class="flex items-center gap-1 py-1 px-1">
      <span class="w-1.5 h-1.5 bg-[#606562] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span class="w-1.5 h-1.5 bg-[#606562] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span class="w-1.5 h-1.5 bg-[#606562] rounded-full animate-bounce"></span>
    </div>
  `;
}

function generateProductCardsHtml(products) {
  if (!products || products.length === 0) return "";

  const cardsHtml = products
    .map((p) => {
      const imgUrl = p.thumbnail || p.imageUrl || "https://via.placeholder.com/150";
      const safeName = escapeHTML(p.name);
      
      // Sử dụng logic format tiền tệ
      const formattedPrice = typeof UIUtils !== 'undefined' 
        ? UIUtils.formatCurrency(p.salePrice) 
        : `${p.salePrice?.toLocaleString("vi-VN") || 0} đ`;

      // Giữ nguyên thiết kế Card
      return `
        <a href="product_detail.html?id=${p.id}" 
           class="block min-w-[145px] max-w-[155px] flex-shrink-0 bg-white border border-[#e0e0e0] rounded-lg p-2.5 hover:border-[#1a211e] transition-colors cursor-pointer text-left no-underline group">
            <div class="w-full h-28 overflow-hidden rounded mb-2 bg-[#eef1f0] flex items-center justify-center">
                <img src="${imgUrl}" alt="${safeName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            </div>
            <h4 class="text-xs font-medium text-[#1a211e] line-clamp-2 mb-1" title="${safeName}">${safeName}</h4>
            <p class="text-xs font-semibold text-[#1a211e]">${formattedPrice}</p>
        </a>
      `;
    })
    .join("");

  // Trả về HTML chỉ chứa danh sách thẻ sản phẩm, đã loại bỏ 2 mũi tên trái/phải
  return `
    <div class="relative group flex items-center mt-3 w-full">
        <div class="flex gap-2 overflow-x-auto scroll-smooth w-full py-1 px-0.5" style="scrollbar-width: none;">
            ${cardsHtml}
        </div>
    </div>
  `;
}

// ==========================================
// 3. LOGIC KẾT NỐI API (Đã sửa lỗi 405)
// ==========================================

async function sendMessage() {
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const sendText = document.getElementById("chat-send-text");
  const message = inputEl.value.trim();

  if (!message) return;

  // Khóa nút gửi và ô nhập liệu (Hiệu ứng UI mới)
  inputEl.disabled = true;
  sendBtn.disabled = true;
  inputEl.classList.add("opacity-60", "cursor-not-allowed");
  sendBtn.classList.add("opacity-60", "cursor-not-allowed");
  sendText.innerHTML = `
    <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
  `;

  // Thêm tin nhắn của User
  appendMessage("user", message);
  saveToSession("user", message);
  inputEl.value = "";

  // Thêm hiệu ứng gõ chữ của Bot (UI mới)
  const typingId = appendMessage("bot", createTypingIndicatorHtml());

  // Lấy thông tin User bằng Logic cũ an toàn
  const currentUserName = typeof AuthUtils !== 'undefined' ? AuthUtils.getUserInfo(AppConfig.KEYS.FULL_NAME) || "" : "";

  try {
    // Gọi API bằng đường dẫn chính xác (Logic cũ)
    const response = await fetch(`${AppConfig.PRODUCT_API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, userName: currentUserName }),
    });

    if (response.ok) {
      const data = await response.json();
      const formattedReply = formatAIText(data.reply);
      updateMessage(typingId, formattedReply, data.products);
      saveToSession("bot", formattedReply, data.products);
    } else {
      updateMessage(typingId, "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé.");
    }
  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    updateMessage(typingId, "Không thể kết nối đến máy chủ.");
  } finally {
    // Mở khóa UI
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.classList.remove("opacity-60", "cursor-not-allowed");
    sendBtn.classList.remove("opacity-60", "cursor-not-allowed");
    sendText.textContent = "Gửi";
    setTimeout(() => inputEl.focus(), 100);
  }
}

function appendMessage(sender, contentHtml) {
  const chatMessages = document.getElementById("chat-messages");
  const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const isUser = sender === "user";

  // Màu sắc bóng chat theo thiết kế mới
  const bubbleClasses = isUser
    ? "bg-[#1a211e] text-white rounded self-end"
    : "bg-[#eef1f0] text-[#1a211e] border border-[#e0e0e0] rounded self-start";

  const html = `
    <div id="${msgId}" class="flex flex-col ${isUser ? "items-end" : "items-start"} mb-3">
        <div class="message-content ${bubbleClasses} p-2.5 max-w-[85%] break-words leading-relaxed text-[13px]">
            ${contentHtml}
        </div>
    </div>
  `;

  chatMessages.insertAdjacentHTML("beforeend", html);
  scrollToBottom();
  return msgId;
}

function updateMessage(id, newText, products = []) {
  const msgEl = document.getElementById(id);
  if (msgEl) {
    const contentDiv = msgEl.querySelector(".message-content");
    if (contentDiv) {
      contentDiv.innerHTML = newText;
      if (products && products.length > 0) {
        const cardsHtml = generateProductCardsHtml(products);
        msgEl.insertAdjacentHTML("beforeend", `<div class="w-full max-w-[95%] mt-2">${cardsHtml}</div>`);
      }
    }
    setTimeout(scrollToBottom, 50);
  }
}