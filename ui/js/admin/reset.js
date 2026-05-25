function resetMapWithGuest() {
  selectedPoints = [];
  startPoint = null;
  isDrawing = false;
  isBlockMode = false;
  isTrafficMode = false;
  isFloodMode = false;
  showNodes = false;
  isOneWayEdgeMode = false;
  if (startPointMarker) {
      map.removeLayer(startPointMarker);
      startPointMarker = null;
  }
  if (endPointMarker) {
      map.removeLayer(endPointMarker);
      endPointMarker = null;
  }
  // Đóng tất cả popup đang mở 
  map.closePopup();
  map.eachLayer(function (layer) {
    if (layer.options && layer.options.id === 'path-polyline-guest') {
        map.removeLayer(layer);
    }
});
    // Xóa nội dung ô tìm kiếm
    if (typeof placeSearchInput !== 'undefined' && placeSearchInput) {
      placeSearchInput.value = '';
    }
    // Xóa kết quả tìm kiếm
    if (typeof searchResultsContainer !== 'undefined' && searchResultsContainer) {
      searchResultsContainer.innerHTML = '';
    }
    // Xóa marker tạm thời của việc tìm kiếm
    if (tempSearchMarker) {
      map.removeLayer(tempSearchMarker);
      tempSearchMarker = null;
    }
  redrawBannedLines();
  redrawAllAdminRestrictions();
  const placeObstacleBtn = document.getElementById("placeObstacleBtn");
  placeObstacleBtn.textContent = "Đặt vùng cấm";
  placeObstacleBtn.classList.remove("btn-danger");
  placeObstacleBtn.classList.add("btn-warning");
}

function resetMapWithAdmin() {
  if (!isAdmin) {
    console.warn("Error Reset Admin");
    return;
  }
  selectedPoints = [];
  startPointMarker = null;
  endPointMarker = null;
  startPoint = null;
  isDrawing = false;
  isBlockMode = false;
  isTrafficMode = false;
  isFloodMode = false;
  isOneWayEdgeMode = false;
  bannedLines = [];
  closedStations = [];
  closedLines = [];
  operationHistory = [];
  clearOperationLayers();
  trafficLine = [];
  floodLine = [];
  map.getContainer().style.cursor = '';
  map.closePopup(); // Đóng popup nếu có
  if (temporaryLine) {
    if (map.hasLayer(temporaryLine)) {
      map.removeLayer(temporaryLine);
    }
    temporaryLine = null;
  }
  banPolyline = null;
  // Xóa các vật cản
  obstacleMarkers = [];
  isPlacingObstacle = false;
  blockedEdges = [];
  trafficEdges = [];
  floodEdges = [];
  if (typeof placeSearchInput !== 'undefined' && placeSearchInput) {
    placeSearchInput.value = '';
  }
  // Xóa kết quả tìm kiếm
  if (typeof searchResultsContainer !== 'undefined' && searchResultsContainer) {
    searchResultsContainer.innerHTML = '';
  }
  // Xóa marker tạm thời của việc tìm kiếm
  if (tempSearchMarker) {
    map.removeLayer(tempSearchMarker);
    tempSearchMarker = null;
  }
  // Xóa tất cả các layer trên bản đồ
  map.eachLayer(function (layer) {
    if (!(layer instanceof L.TileLayer)) {
      map.removeLayer(layer);
    }
  });
  loadMoscowBoundary();
  drawMoscowMetroNetwork();
  console.log("\nReset bản đồ thành công!\n");
  console.log("Blocked edges: ", blockedEdges);
  console.log("TrafficEdges: ", trafficEdges);
  console.log("TrafficEdges: ", floodEdges);
  const placeObstacleBtn = document.getElementById("placeObstacleBtn");
  placeObstacleBtn.textContent = "Đặt vùng cấm";
  placeObstacleBtn.classList.remove("btn-danger");
  placeObstacleBtn.classList.add("btn-warning");
  updateOperationSummary();
}
document
  .getElementById("guestResetButton")
  .addEventListener("click", () => resetMapWithGuest()); // Guest reset - giữ lại đường cấm

document
  .getElementById("adminResetButton")
  .addEventListener("click", () => resetMapWithAdmin());

/*----------------------------------------- Các hàm hỗ trợ -----------------------------------------*/
// Các hàm tiện ích
