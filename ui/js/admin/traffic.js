document.getElementById("trafficBtn").addEventListener("click", function () {
  isTrafficMode = true;
  isDrawing = true;
  points = [];
  trafficLevel = document.getElementById("trafficLevel").value;
  console.log("Mức độ tắc đường:", trafficLevel.value);
  if (trafficPolyline) {
    map.removeLayer(trafficPolyline);
    trafficPolyline = null;
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
      .setContent("<b>Hướng dẫn:</b> Click vào bản đồ để bắt đầu vẽ đường tắc.<br>Nhấn phím <b>ESC</b> để hoàn thành hoặc hủy vẽ.")
      .openOn(map);

  setTimeout(() => {
      map.closePopup(); // Đóng popup cụ thể này hoặc tất cả
  }, 5000); // Đóng sau 5 giây
  console.log("Bật chế độ vẽ vùng tắc");
});

document.getElementById("restoreTacBtn").addEventListener("click", function () {
  if (trafficLine.length === 0) {
    console.warn("Không còn đường tắc nào để khôi phục.");
    return;
  }
  trafficLine.pop();

  map.eachLayer(function (layer) {
    if (
      (layer instanceof L.Polyline &&
        (layer.options.color === "#fdd835"||
        layer.options.color === "#ffb300" ||
        layer.options.color === "#bf360c")
      ) ||
      layer instanceof L.CircleMarker
    ) {
      map.removeLayer(layer);
    }
  });

  trafficLine.forEach((linePoints) => {

    L.polyline(linePoints, {
      color: "#ffb300",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });

  // Cập nhật lại danh sách blockedEdges
  trafficEdges = [];
  trafficLine.forEach((linePoints) => {
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

function isEdgeTraffic(edge) {
  return trafficEdges.some(
    (blocked) =>
      (blocked[0] === edge[0] && blocked[1] === edge[1]) ||
      (blocked[0] === edge[1] && blocked[1] === edge[0])
  );
}

function handleTrafficEdge(edge) {
  if (!isEdgeTraffic(edge)) {
    trafficEdges.push(edge);
    console.log(`💢 Cạnh xảy ra tắc đường: ${edge[0]} - ${edge[1]}`);
    console.log();
  }
}
