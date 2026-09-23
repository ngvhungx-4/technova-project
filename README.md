# 🛒 TechNova

**TechNova** là ứng dụng web thương mại điện tử chuyên về thiết bị công nghệ, được xây dựng theo kiến trúc **microservices**. Hệ thống hỗ trợ mua sắm cho cả thành viên lẫn khách vãng lai, tích hợp trợ lý AI tư vấn bán hàng, chương trình khách hàng thân thiết, Flash Sale, thanh toán trực tuyến và bộ công cụ quản trị đầy đủ cho Admin.

## 🏗 Kiến trúc tổng quan

| Thành phần | Vai trò chính |
|---|---|
| **API Gateway** | Cổng vào duy nhất: xác thực JWT, kiểm soát định tuyến và phân quyền |
| **AuthService** | Xác thực, tài khoản, sổ địa chỉ, khách hàng thân thiết, quản trị khách hàng |
| **ProductService** | Danh mục, sản phẩm, tìm kiếm nâng cao, đánh giá, chatbot AI |
| **CartService** | Giỏ hàng lai (đăng nhập / vãng lai), đồng bộ giá và tồn kho |
| **FlashSaleService** | Chiến dịch Flash Sale, quy tắc mua hàng, dashboard |
| **OrderService** | Đặt hàng, voucher, thanh toán, vòng đời đơn, trả hàng, báo cáo |
| **Frontend** | Giao diện người dùng và Admin Panel |

## 🔌 Tích hợp dịch vụ bên thứ ba

| Dịch vụ | Mục đích |
|---|---|
| **Google Gemini** | Chatbot tư vấn bán hàng AI |
| **VietMap Autocomplete API v4** | Gợi ý địa chỉ chuẩn hóa tiếng Việt theo thời gian thực |
| **PayOS** | Cổng thanh toán trực tuyến (chữ ký HMAC-SHA256) |
| **ZaloPay** | Ví điện tử |
| **SMTP (HTML Email)** | Gửi OTP, email cảm ơn và mời đánh giá |

---

## 1. Phân Hệ Cổng Kết Nối & Bảo Mật Hệ Thống (API Gateway)

### Bộ lọc xác thực tập trung (Authentication Filter)
- Kiểm tra và giải mã **JWT Token** (thuật toán **HMAC-SHA256**) từ header `Authorization: Bearer <token>`.
- Từ chối truy cập (**HTTP 401 Unauthorized**) nếu Token bị thiếu, sai định dạng hoặc hết hạn.

### Định tuyến và phân quyền đầu cuối (Route Validator)
- **Bảo vệ tuyệt đối:** Chặn các tuyến quản trị viên (`/admin/**`) và API nội bộ liên-service (`/internal/**`) nếu không có xác thực và thẩm quyền tương ứng.
- **Mở công khai (Open APIs):** Khách vãng lai không cần đăng nhập vẫn có thể:
  - Đăng ký / đăng nhập, xác thực OTP, quên / đặt lại mật khẩu
  - Tư vấn Chatbot AI (`/api/chat`)
  - Tra cứu địa chỉ VietMap
  - Xem giỏ hàng / đơn hàng theo session
  - Xem danh sách sản phẩm, danh mục và chương trình Flash Sale đang hoạt động

### Cơ chế lọc phương thức (Method Filter)
- Cho phép truy cập mở đối với các yêu cầu `GET` cho sản phẩm và danh mục.
- Siết chặt kiểm soát với các thao tác `POST`, `PUT`, `DELETE`.

---

## 2. Phân Hệ Xác Thực, Tài Khoản & Khách Hàng (AuthService)

### 2.1. Xác thực & quản lý bảo mật tài khoản

**Đăng ký tài khoản bảo mật hai bước (OTP qua Email)**
- Kiểm tra định dạng Email, số điện thoại Việt Nam (10 chữ số) và độ dài mật khẩu (tối thiểu 6 ký tự).
- Mã hóa mật khẩu an toàn với **BCrypt**.
- Tự động sinh mã OTP 6 số ngẫu nhiên, hiệu lực **5 phút**, gửi qua Email bằng giao thức SMTP (HTML).
- Tài khoản chỉ được kích hoạt (`isVerified = true`) sau khi xác minh đúng OTP.

**Đăng nhập & cấp phát JWT**
- Kiểm tra trạng thái xác thực và trạng thái hoạt động của tài khoản (chặn đăng nhập nếu tài khoản bị Admin khóa).
- Cấp JWT với thời hạn **24 giờ**, chứa: `user_id`, `email`, `full_name`, `role_name`.

**Khôi phục mật khẩu (Forgot / Reset Password)**
- Gửi mã OTP 6 số vào email người dùng, hiệu lực **15 phút**.
- Xác thực OTP và cập nhật mật khẩu mới.

### 2.2. Hồ sơ cá nhân & sổ địa chỉ

- **Quản lý Profile:** Xem và cập nhật thông tin cá nhân (họ tên, số điện thoại, giới tính, ngày sinh).
- **Quản lý Avatar:** Tải ảnh đại diện lên máy chủ nội bộ; tự động phát hiện và xóa ảnh cũ khi cập nhật ảnh mới.
- **Đổi mật khẩu:** Kiểm tra mật khẩu hiện tại, đối soát mật khẩu mới và xác nhận mật khẩu.

**Sổ địa chỉ nhận hàng đa năng**
- Thêm, sửa, xem chi tiết và xóa địa chỉ giao hàng.
- Thiết lập một địa chỉ làm mặc định (tự động điều chỉnh trạng thái mặc định của các địa chỉ khác).
- **Ràng buộc nghiệp vụ:** Không cho phép xóa địa chỉ nếu chỉ còn 1 địa chỉ duy nhất.
- Tự động chỉ định địa chỉ mới nhất làm mặc định khi xóa địa chỉ mặc định cũ.

**Gợi ý địa chỉ thông minh (VietMap API Integration)**
- Tích hợp VietMap Autocomplete API v4, gợi ý địa chỉ chuẩn hóa tiếng Việt theo thời gian thực khi người dùng nhập số nhà / tên đường.

### 2.3. Hệ thống khách hàng thân thiết (Loyalty & Membership Tier)

Có **4 hạng thành viên**: `BASIC`, `SILVER`, `GOLD`, `ELITE`.

| Hạng | Điểm xét hạng (chu kỳ 12 tháng) | Thưởng nhân điểm |
|---|---|---|
| BASIC | Mặc định | — |
| SILVER | từ 1.000 điểm | +5% |
| GOLD | từ 3.000 điểm | +10% |
| ELITE | từ 7.000 điểm | +20% |

**Cơ chế tích điểm & thăng hạng tự động**
- **Điểm tiêu dùng (`currentPoints`):** Dùng để tích lũy và đổi Voucher (không bao giờ âm).
- **Điểm xét hạng (`cyclePoints`):** Điểm tích lũy trong chu kỳ 12 tháng để xét thăng hạng.
- Khi đổi điểm lấy mã giảm giá, điểm tiêu dùng bị trừ nhưng **điểm xét hạng được bảo toàn nguyên vẹn**.

**Tự động làm mới chu kỳ hạng (Scheduled Task)**
- Cronjob quét mỗi ngày lúc **00:00**: đánh giá lại thứ hạng dựa trên điểm 12 tháng gần nhất, reset điểm chu kỳ về 0 và mở chu kỳ xét hạng mới.

**Lịch sử giao dịch điểm**
- Ghi nhận minh bạch mọi biến động điểm cộng / trừ kèm lý do và mã đơn hàng liên quan.

### 2.4. Quản trị khách hàng (dành cho Admin)

- Danh sách khách hàng có phân trang, tìm kiếm đa tiêu chí (Tên, Email, Số điện thoại).
- Khóa / mở khóa tài khoản tức thì (`toggleUserStatus`).
- Xem chi tiết, chỉnh sửa thông tin khách hàng, cập nhật avatar trực tiếp.
- Tạo tài khoản khách hàng thủ công từ giao diện quản trị (tự động kích hoạt, không cần OTP).
- Cộng / trừ điểm thưởng thủ công kèm lý do giao dịch.
- Thống kê người dùng mới và tỷ lệ tăng trưởng theo mốc thời gian (hôm nay, tuần, tháng, năm) cùng biểu đồ phân bổ thứ hạng thành viên.

---

## 3. Phân Hệ Sản Phẩm, Danh Mục & Trợ Lý Trí Tuệ Nhân Tạo (ProductService)

### 3.1. Quản lý danh mục (Category Tree)

- **Cấu trúc đa cấp (Cha – Con):** Xây dựng cây danh mục phân tầng không giới hạn cấp độ.
- **Cấu hình hiển thị động (Display Config):** Lưu bộ lọc đặc thù của từng ngành hàng dạng JSON; danh mục con kế thừa cấu hình từ danh mục cha.
- **Quản trị danh mục:** Thêm mới, chỉnh sửa, gắn cờ "Nổi bật" (Featured), tải ảnh danh mục, xóa danh mục (kiểm tra tính hợp lệ của danh mục cha).

### 3.2. Quản lý sản phẩm & bộ lọc tìm kiếm chuyên sâu

**Thông tin sản phẩm phong phú**
- SKU, tên, giá nhập (`costPrice`), giá niêm yết (`basePrice`), giá khuyến mãi (`salePrice`).
- Số lượng kho và trạng thái kho: *Còn hàng*, *Hết hàng*, *Đặt trước*.
- Thông số kỹ thuật dạng JSON (`specs`).
- Thư viện ảnh phụ (`product_images`) và phân loại màu sắc (`product_colors`, kèm ảnh theo màu).

**Công cụ tìm kiếm nâng cao (Multi-faceted Search)**
- Tìm theo từ khóa tên sản phẩm hoặc thương hiệu.
- Lọc theo khoảng giá (`minPrice` – `maxPrice`).
- Lọc theo cây danh mục (tự động bao gồm mọi sản phẩm thuộc các danh mục con).
- **Specs Alias Engine:** Tự động chuẩn hóa và ánh xạ các từ khóa kỹ thuật (đồng nghĩa của RTX 4060, Intel Core Ultra, Apple Silicon M1–M5, RAM DDR4/DDR5, Snapdragon, màn hình OLED/Hz...) để lọc chính xác trong dữ liệu JSON.

**Bộ sưu tập sản phẩm**
- Tự động tổng hợp: Sản phẩm nổi bật (Featured), Sản phẩm bán chạy nhất (Top Selling) và Sản phẩm tương tự cùng danh mục (Related Products).

### 3.3. Trợ lý ảo tư vấn bán hàng AI (Chatbot Gemini Integration)

Quy trình xử lý **3 giai đoạn (3-Phase AI Architecture)**:

1. **Phân tích ý định (Intent Parsing):** Gửi tin nhắn người dùng lên Google Gemini để phân loại hành vi (`SEARCH` hoặc `CHAT`), đồng thời bóc tách ngân sách tối đa / tối thiểu, thương hiệu và thông số phần cứng mong muốn thành chuỗi JSON.
2. **Truy vấn cơ sở dữ liệu:** Nếu là `SEARCH`, hệ thống đưa các tham số đã bóc tách vào bộ lọc nội bộ để lấy các sản phẩm tương thích nhất.
3. **Phản hồi tự nhiên:** Gemini tổng hợp kết quả, đóng vai nhân viên tư vấn TechNova thân thiện và phản hồi kèm thẻ giao diện sản phẩm trực quan.

### 3.4. Đánh giá & phản hồi sản phẩm (Product Reviews)

- Gửi đánh giá từ **1 đến 5 sao** kèm bình luận.
- **Đánh giá kép (đã đăng nhập & khách vãng lai):** Khách vãng lai đánh giá thông qua `ReviewToken` an toàn, cấp riêng cho từng đơn hàng sau khi giao thành công.
- **Chống trùng lặp:** Mỗi khách hàng chỉ được đánh giá 1 lần cho một sản phẩm trong mỗi đơn hàng.
- Tự động đồng bộ tên và avatar của khách hàng vào các đánh giá cũ khi khách thay đổi hồ sơ.

---

## 4. Phân Hệ Giỏ Hàng (CartService)

### Giỏ hàng lai (Hybrid Cart Architecture)
- **Người dùng đã đăng nhập:** quản lý theo `userId`.
- **Khách vãng lai:** quản lý độc lập theo `sessionId`.

### Cập nhật giá theo thời gian thực
- Mỗi lần mở giỏ hàng, hệ thống gọi sang ProductService để cập nhật giá bán, tồn kho mới nhất và liên kết hình ảnh theo màu sắc đã chọn.

### Tích hợp tự động giá Flash Sale
- Nếu sản phẩm thuộc ca Flash Sale còn hiệu lực (mua số lượng 1 và đã đăng nhập), hệ thống tự động áp dụng giá Flash Sale trực tiếp vào giỏ.

### Thao tác giỏ hàng linh hoạt
- Thêm sản phẩm theo màu sắc.
- Điều chỉnh số lượng (tự động khống chế không vượt quá tồn kho thực).
- Xóa sản phẩm.
- Chọn / bỏ chọn từng món (`isSelected`) và chọn tất cả để chuẩn bị thanh toán.

### Dọn dẹp giỏ hàng vãng lai tự động (Cart Cleanup Job)
- Chạy ngầm lúc **02:00** hàng ngày, xóa các giỏ hàng khách vãng lai không hoạt động quá **7 ngày** để tối ưu dung lượng cơ sở dữ liệu.

---

## 5. Phân Hệ Giờ Vàng Săn Deal (FlashSaleService)

### Quản lý chiến dịch & khung giờ
- Thiết lập chiến dịch Flash Sale theo tên, ngày bắt đầu và ngày kết thúc.
- **Kiểm tra chống xung đột:** Nghiêm cấm trùng lặp khung giờ giữa các chiến dịch đang kích hoạt.
- **Trạng thái chiến dịch:** `UPCOMING` (Sắp diễn ra), `ACTIVE` (Đang diễn ra), `ENDED` (Đã kết thúc).

### Quy tắc mua hàng nghiêm ngặt (Strict Flash Sale Rules)
- Bắt buộc người dùng **phải đăng nhập**.
- Khống chế số lượng mở bán giới hạn (`allocatedQuantity` so với `soldQuantity`).
- **Quy tắc vàng:** Mỗi người dùng chỉ được mua **tối đa 1 sản phẩm** trong suốt đợt sale (lịch sử mua lưu ở bảng `flash_sale_purchases`).

### Hoàn trả lượt mua (Rollback on Cancel)
- Khi khách hủy đơn hàng Flash Sale, hệ thống tự động hủy bản ghi mua hàng và hoàn lại 1 slot vào kho Flash Sale.

### Dashboard Flash Sale cho Admin
- Theo dõi ca đang diễn ra, thời gian đếm ngược còn lại, số lượng sản phẩm tham gia và doanh thu tạm tính trong ca.

---

## 6. Phân Hệ Đơn Hàng, Thanh Toán & Hậu Mãi (OrderService)

### 6.1. Đặt hàng & tính toán khuyến mãi

- **Hỗ trợ đa đối tượng:** Đặt hàng cho thành viên hoặc khách vãng lai mua nhanh qua form thông tin nhận hàng.
- **Mã đơn hàng độc nhất:** Định dạng `TN` + `yyMMdd` + 4 ký tự ngẫu nhiên (ví dụ: `TN260924A8K9`).

**Quản lý Voucher chuyên sâu**
- Giảm theo phần trăm (%) hoặc số tiền cố định (VNĐ), kèm giới hạn giảm tối đa và giá trị đơn hàng tối thiểu.
- Giới hạn tổng số lượt sử dụng toàn hệ thống.
- Giới hạn áp dụng cho Email định danh hoặc nhóm hạng thành viên (`BASIC`, `SILVER`, `GOLD`, `ELITE`).

**Đổi điểm lấy Voucher cá nhân**
- Khách dùng điểm thưởng tích lũy để đổi Voucher. Hệ thống trừ điểm qua AuthService và sinh mã giảm giá độc quyền dạng `REDEEM-XXXXXX`, gắn chặt với Email khách hàng và chỉ dùng **1 lần duy nhất**.

### 6.2. Phương thức thanh toán & đặt cọc linh hoạt (COD Deposit Policy)

**Phương thức hỗ trợ:** Tiền mặt khi nhận hàng (COD), Chuyển khoản ngân hàng (Bank Transfer), Ví điện tử ZaloPay, Cổng PayOS.

**Chính sách đặt cọc tự động cho đơn COD giá trị cao**

| Giá trị đơn hàng | Mức cọc trước |
|---|---|
| Từ 1.000.000₫ đến 10.000.000₫ | 10% |
| Trên 10.000.000₫ đến 30.000.000₫ | 20% |
| Trên 30.000.000₫ | 30% |

**Tích hợp cổng thanh toán PayOS**
- Sinh liên kết thanh toán (Checkout URL) chứa chữ ký điện tử mã hóa **HMAC-SHA256**.
- Xử lý Webhook Return / Cancel:

| Tình huống | Kết quả |
|---|---|
| Thanh toán tiền cọc thành công (đơn COD) | Đơn chuyển sang `DEPOSIT_PAID` |
| Thanh toán toàn bộ thành công (Bank Transfer) | Đơn chuyển sang `CONFIRMED`, thanh toán chuyển sang `PAID` |
| Hủy thanh toán | Đơn thành `CANCELLED`, thanh toán thành `FAILED`, hoàn trả ngay số lượng tồn kho |

### 6.3. Vòng đời đơn hàng & đồng bộ liên-service

**Ràng buộc chuyển trạng thái nghiêm ngặt**
- Không cho phép nhảy cóc bước (ví dụ: không thể từ `PENDING` lên thẳng `SHIPPING`).
- Không cho phép quay ngược trạng thái khi đơn đã hoàn tất hoặc đã thanh toán.

**Đồng bộ kho tự động**
- Trừ kho khi đơn được duyệt (`CONFIRMED` hoặc `DEPOSIT_PAID`).
- Hoàn kho khi đơn bị hủy (`CANCELLED`).

**Tự động hóa khi giao hàng thành công (`DELIVERED`)**
- Tăng số lượng đã bán thực tế (`sold`) ở danh mục sản phẩm.
- **Tự động tích điểm thành viên:** Mỗi **10.000₫** chi tiêu được cộng **1 điểm** cơ sở (chưa tính thưởng theo thứ hạng).
- Tự động sinh `ReviewToken` có thời hạn **7 ngày** và gửi Email cảm ơn kèm đường link mời đánh giá sản phẩm.

### 6.4. Quy trình yêu cầu trả hàng / hoàn tiền (Return & Refund)

- **Điều kiện mở yêu cầu:**
  - Đơn hàng ở trạng thái `DELIVERED`.
  - Trong vòng **7 ngày** kể từ lúc giao hàng.
  - Mỗi sản phẩm chỉ được tạo yêu cầu đổi trả **1 lần duy nhất**.
- **Minh chứng:** Khách có thể tải lên nhiều hình ảnh chụp lỗi thực tế của sản phẩm.
- **Xử lý phía Admin:** Duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) yêu cầu; xác nhận hoàn tiền cọc (`confirmRefund`).

### 6.5. Báo cáo & thống kê tài chính chuyên sâu

- **Tổng quan đơn hàng:** Tổng đơn, doanh thu thuần, tỷ lệ hủy đơn, kèm phần trăm tăng trưởng so với kỳ trước.
- **Biểu đồ doanh thu & lợi nhuận:** Theo giờ (hôm nay), theo ngày (tuần / tháng) và theo 12 tháng (trong năm).
- **Doanh thu theo danh mục sản phẩm:** Sắp xếp theo doanh thu và lượng bán.
- **Báo cáo kho hàng:** Top sản phẩm sắp hết hàng (Low Stock) và top sản phẩm tồn kho cao (High Stock).
- **Top 5 sản phẩm bán chạy nhất** của hệ thống.

---

## 7. Các Chức Năng Nổi Bật Trên Giao Diện Người Dùng (Frontend UI/UX)

| Nhóm giao diện | Các tính năng chi tiết |
|---|---|
| **Trang chủ (Home)** | Banner Hero tương tác Bento-Grid, banner giới thiệu đặc quyền hội viên, đếm ngược ca Flash Sale, hiển thị danh mục và sản phẩm nổi bật |
| **So sánh cấu hình (Compare)** | Bảng ma trận so sánh trực quan thông số phần cứng (CPU, GPU, RAM, ổ cứng, tần số quét màn hình, pin...), popup tìm kiếm để thêm / bớt sản phẩm cần đối đầu |
| **Giỏ hàng & Đặt hàng (Cart & Checkout)** | Đổi địa chỉ nhận hàng nhanh từ sổ địa chỉ, popup chọn Voucher khả dụng, tùy chọn phương thức thanh toán linh hoạt, tự động hiển thị mức tiền đặt cọc cần thanh toán trước |
| **Khung giờ Flash Sale** | Bộ đếm thời gian thực (Countdown Timer), thanh tiến độ số lượng đã bán / còn lại, nút chuyển nhanh giữa các khung giờ trong ngày (Đang diễn ra, Sắp tới, Đã kết thúc) |
| **Quản trị viên (Admin Panel)** | Bảng điều khiển KPI Bento, bảng biểu phân trang dữ liệu, bộ lọc nâng cao, các modal quản lý danh mục (tải ảnh), khách hàng (cộng / trừ điểm) và tạo khung giờ Flash Sale |
