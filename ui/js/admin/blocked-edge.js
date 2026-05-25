document.getElementById("banEdgeBtn").addEventListener("click", function () {
  setOperationMode(null);
  isBlockMode = true;
  isDrawing = true;
  isPlacingObstacle = false;
  points = [];
  if (banPolyline) {
    map.removeLayer(banPolyline);
    banPolyline = null;
  }
  placeObstacleBtn.textContent = "Đặt vùng cấm";
  placeObstacleBtn.classList.remove("btn-danger");
  placeObstacleBtn.classList.add("btn-warning");
  map.closePopup(); // Đóng các popup khác nếu có
  // Lấy vị trí trung tâm của bản đồ để hiển thị popup
  const mapCenter = map.getCenter();
  L.popup({
          className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', // Sử dụng các class đã style
          autoClose: true,
          closeOnClick: true
      })
      .setLatLng(mapCenter) // Hiển thị popup ở giữa màn hình bản đồ
      .setContent("<b>Hướng dẫn:</b> Click vào bản đồ để bắt đầu vẽ cấm đường.<br>Nhấn phím <b>ESC</b> để hoàn thành hoặc hủy vẽ.")
      .openOn(map);

  setTimeout(() => {
      map.closePopup(); // Đóng popup cụ thể này hoặc tất cả
  }, 5000); // Đóng sau 5 giây
  console.log("Bật chế độ cấm đường");
});

document.getElementById("restoreBanBtn")?.addEventListener("click", function () {
  if (bannedLines.length === 0) {
    console.warn("Không còn đường cấm nào để khôi phục.");
    return;
  }
  // Bỏ đường cấm cuối cùng
  bannedLines.pop();

  // Xóa tất cả các đường cấm đang có trên bản đồ
  map.eachLayer(function (layer) {
    if (
      (layer instanceof L.Polyline &&
        layer.options.dashArray === "10,10" &&
        (layer.options.color === "#f44336" || layer.options.color === "red")) ||
      (layer instanceof L.CircleMarker && layer.options.adminLayerType === "blocked-edge-point")
    ) {
      map.removeLayer(layer);
    }
  });

  // V? l?i t?t c? c?c ???ng c?m c?n l?i
  bannedLines.forEach((linePoints) => {
    linePoints.forEach((point) => {
      L.circleMarker(point, {
        radius: 5,
        color: "#f44336",
        fillColor: "#f44336",
        fillOpacity: 1,
        adminLayerType: "blocked-edge-point",
      }).addTo(map);
    });

    L.polyline(linePoints, {
      color: "#f44336",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });

  recomputeBlockedEdges();

  console.log("Đã khôi phục lại các đường cấm còn lại.");
});

function redrawBannedLines() {
  bannedLines.forEach((points) => {
    points.forEach((point) => {
      L.circleMarker(point, {
        radius: 5,
        color: "#f44336",
        fillColor: "#f44336",
        fillOpacity: 1,
        adminLayerType: "blocked-edge-point",
      }).addTo(map);
    });

    L.polyline(points, {
      color: "#f44336",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });

  trafficLine.forEach((points) => {
    points.forEach((point) => {
      L.circleMarker(point, {
        radius: 5,
        color: "yellow",
        fillColor: "yellow",
        fillOpacity: 1,
      }).addTo(map);
    });

    L.polyline(points, {
      color: "yellow",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });

  floodLine.forEach((points) => {
    points.forEach((point) => {
      L.circleMarker(point, {
        radius: 5,
        color: "blue",
        fillColor: "blue",
        fillOpacity: 1,
      }).addTo(map);
    });

    L.polyline(points, {
      color: "blue",
      weight: 3,
      dashArray: "10,10",
      opacity: 0.8,
    }).addTo(map);
  });
}


function recomputeBlockedEdges() {
  blockedEdges = [];

  bannedLines.forEach((linePoints) => {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];
      if (p1 && p2) {
        detectBlockedEdgesByCut([p1, p2]);
      }
    }
  });

  obstacleMarkers.forEach((obs) => {
    if (obs && obs.center && obs.radius) {
      detectBlockedEdgesByObstacle(obs.center, obs.radius);
    }
  });
}

function isEdgeBlocked(edge) {
  return blockedEdges.some(
    (blocked) =>
      (blocked[0] === edge[0] && blocked[1] === edge[1]) ||
      (blocked[0] === edge[1] && blocked[1] === edge[0])
  );
}

function handleBlockedEdge(edge) {
  if (!isEdgeBlocked(edge)) {
    blockedEdges.push(edge);
    console.log(`🚫 Cạnh bị cấm: ${edge[0]} - ${edge[1]}`);
    console.log();
  }
}

function detectBlockedEdgesByCut(cutLine) {
  const [p1, p2] = cutLine;
  // console.log("Đang kiểm tra các cạnh bị cắt bởi đường cấm... ", adj_list.length);
  for (let u = 0; u < adj_list_with_weights.length; u++) {
    // console.log(adj_list_with_weights[u].node_id);
    const currentNodeId = adj_list_with_weights[u].node_id;
    const nodeU = nodes.find((n) => n.node_id === currentNodeId);
    if (!nodeU) {
      console.warn(`Không tìm thấy node với id ${currentNodeId}`);
      continue;
    }

    const lat1 = nodeU.lat;
    const lon1 = nodeU.lon;

    for (let v = 0; v < adj_list_with_weights[u].neighbors.length; v++) {
      const nodeV = nodes.find(
        (n) => n.node_id === adj_list_with_weights[u].neighbors[v].node_neighbor
      );
      if (!nodeV) {
        console.warn(`Không tìm thấy node với id ${adj_list_with_weights[u].neighbors[v].node_neighbor}`);
        continue;
      }
      const edgeLine = [
        [nodeU.lat, nodeU.lon],
        [nodeV.lat, nodeV.lon],
      ];
      if (segmentsIntersect(p1, p2, edgeLine[0], edgeLine[1], 0.0001)) {
        if (isBlockMode || (!isTrafficMode && !isFloodMode)) handleBlockedEdge([nodeU.node_id, nodeV.node_id]);
        if (isTrafficMode) handleTrafficEdge([nodeU.node_id, nodeV.node_id]);
        if (isFloodMode) handleFloodEdge([nodeU.node_id, nodeV.node_id])
      }
    }
  }
}
