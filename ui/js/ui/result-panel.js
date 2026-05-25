document.getElementById("swapPointsBtn").addEventListener("click", function() {
  if (selectedPoints.length !== 2) {
    if (typeof showStatusBar === 'function') {
      showStatusBar("⚠️ Cần chọn đủ Điểm đầu và Điểm cuối để đảo chiều.", "mode-traffic");
      setTimeout(hideStatusBar, 3000);
    }
    return;
  }

  // 1. Đảo giá trị node_id
  const tempId = selectedPoints[0];
  selectedPoints[0] = selectedPoints[1];
  selectedPoints[1] = tempId;

  // 2. Đảo tọa độ hiển thị trên bản đồ
  const tempLatLng = startPointMarker.getLatLng();
  startPointMarker.setLatLng(endPointMarker.getLatLng());
  endPointMarker.setLatLng(tempLatLng);

  // Đảo điểm gốc và đường nối trên bản đồ
  if (startOriginMarker && endOriginMarker) {
      const tempOriginLatLng = startOriginMarker.getLatLng();
      startOriginMarker.setLatLng(endOriginMarker.getLatLng());
      endOriginMarker.setLatLng(tempOriginLatLng);
  }
  if (startConnectionLine && endConnectionLine) {
      const tempLineLatLngs = startConnectionLine.getLatLngs();
      startConnectionLine.setLatLngs(endConnectionLine.getLatLngs());
      endConnectionLine.setLatLngs(tempLineLatLngs);
  }

  // 3. Tự động chạy lại thuật toán
  getAlgorithm(); 
});

// Sự kiện nút Tắt bảng kết quả
document.getElementById("closeResultBtn").addEventListener("click", function() {
  document.getElementById("routeResultPanel").classList.add("hidden");
});
