document.getElementById("floodBtn").addEventListener("click", function () {
  isFloodMode = true;
  isDrawing = true;
  points = [];
  floodLevel = document.getElementById("floodLevel").value;
  console.log("Mức độ ngập lụt:", floodLevel.value);
  if (floodPolyline) {
    map.removeLayer(floodPolyline);
    floodPolyline = null;
  }
  map.closePopup(); // Đóng các popup khác nếu có
  // Lấy vị trí trung tâm của bản đồ để hiển thị popup
  const mapCenter = map.getCenter();
  L.popup({
          className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', // Sử dụng các class đã style
          autoClose: true,
          closeOnClick: true
      })
      .setLatLng(mapCenter) // Hiển thị popup ở giữa màn hình bản đồ
      .setContent("<b>Hướng dẫn:</b> Click vào bản đồ để bắt đầu vẽ vùng ngập lụt.<br>Nhấn phím <b>ESC</b> để hoàn thành hoặc hủy vẽ.")
      .openOn(map);

  setTimeout(() => {
      map.closePopup(); // Đóng popup cụ thể này hoặc tất cả
  }, 5000); // Đóng sau 5 giây
  console.log("Bật chế độ vẽ ngập lụt");
});

document.getElementById("restoreFloodBtn").addEventListener("click", function () {
  if (floodLine.length === 0) {
    console.warn("Không còn đường ngập lụt nào để khôi phục.");
    return;
  }
  floodLine.pop();

  map.eachLayer(function (layer) {
    if (
      (layer instanceof L.Polyline &&
        (layer.options.color === "#64b5f6"||
        layer.options.color === "#2196f3" ||
        layer.options.color === "#0d47a1")
      ) ||
      layer instanceof L.CircleMarker
    ) {
      map.removeLayer(layer);
    }
  });

  floodLine.forEach((linePoints) => {

    L.polyline(linePoints, {
      color: "#ffb300",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });

  // Cập nhật lại danh sách blockedEdges
  floodEdges = [];
  floodLine.forEach((linePoints) => {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];
      if (p1 && p2) {
        detectBlockedEdgesByCut([p1, p2]);
      }
    }
  });

  console.log("Đã khôi phục lại các đường tắc còn lại.");
});

function isEdgeFlood(edge) {
  return floodEdges.some(
    (blocked) =>
      (blocked[0] === edge[0] && blocked[1] === edge[1]) ||
      (blocked[0] === edge[1] && blocked[1] === edge[0])
  );
}

function handleFloodEdge(edge) {
  if (!isEdgeFlood(edge)) {
    floodEdges.push(edge);
    console.log(`💢 Cạnh xảy ra ngập lụt: ${edge[0]} - ${edge[1]}`);
    console.log();
  }
}
