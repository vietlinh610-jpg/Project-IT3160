/* Xử lý chọn chế độ Guest - Admin */
roleToggle.addEventListener("change", function () {
  const isChecked = this.checked;
  const newRole = isChecked ? "Admin" : "Guest";
  console.log("Bạn đang ở chế độ", newRole);

  if (isDrawing && !isChecked) {
      map.closePopup(); // Đóng các popup khác nếu có
      const mapCenter = map.getCenter(); // Lấy vị trí giữa bản đồ để hiển thị popup
      let taskDescription = "thực hiện một thao tác vẽ"; // Mô tả chung
      // Cụ thể hóa mô tả tác vụ nếu có thể
      if (isBlockMode) taskDescription = "vẽ đường cấm";
      // isPlacingObstacle không dùng isDrawing, nên không cần kiểm tra ở đây nếu chỉ dựa vào isDrawing
      L.popup({
              className: 'warning-leaflet-popup synced-leaflet-popup compact-point-popup', // Sử dụng các class đã style
              autoClose: true,
              closeOnClick: true
          })
          .setLatLng(mapCenter)
          .setContent(`<b>Cảnh báo:</b> Bạn đang trong quá trình ${taskDescription}.<br>Vui lòng hoàn thành (nhấn ESC) hoặc hủy bỏ trước khi chuyển sang chế độ Guest.`)
          .openOn(map);
      this.checked = true;
      return;
  }

  isAdmin = isChecked;

  // Toggle hiển thị control
  guestControls.classList.toggle("hide", isChecked);
  adminControls.classList.toggle("show", isChecked);

  if (appHeader) { // Kiểm tra xem appHeader có tồn tại không
    if (isAdmin) {
      appHeader.style.display = 'none'; // Ẩn thanh tìm kiếm khi là Admin
      // Xóa kết quả tìm kiếm và marker tạm thời nếu chuyển sang Admin
      if (searchResultsContainer) searchResultsContainer.innerHTML = '';
      if (tempSearchMarker) {
          map.removeLayer(tempSearchMarker);
          tempSearchMarker = null;
      }
      if(placeSearchInput) placeSearchInput.value = '';

    } else {
      appHeader.style.display = 'flex'; // Hiện lại thanh tìm kiếm khi là Guest
                                        // (hoặc 'block' tùy theo cách bạn muốn nó hiển thị)
    }
  }

  if (isAdmin) {
    resetMapWithGuest(); // Reset bản đồ khi sang Admin
  } else {
    // Reset trạng thái vẽ, giữ lại các đường cấm
    isBlockMode = false;
    isDrawing = false;
    isPlacingObstacle = false;
    isTrafficMode = false;
    isFloodMode = false;
    isOneWayEdgeMode = false;
    selectedPoints = [];
    startPoint = null;
    map.closePopup();
  }
});
