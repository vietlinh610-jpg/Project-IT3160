function handleObstaclePlacement(lat, lng) {
  const radius = parseFloat(document.getElementById("obstacleRadius").value);
  const center = [lat, lng];

  drawObstacle(center, radius);
  
  // Lưu dữ liệu vật cản (thay vì lưu layer object)
  obstacleMarkers.push({ center, radius });
  
  // Lưu vào lịch sử thao tác
  operationHistory.push({ type: "obstacle" });
  updateOperationSummary();

  detectBlockedEdgesByObstacle(center, radius);
}

function drawObstacle(clickedPoint, radius) {
  const obstacleMarker = L.circleMarker(clickedPoint, {
    radius: 8,
    color: "#ff0000",
    fillColor: "#ff0000",
    fillOpacity: 0.7,
    adminLayerType: "obstacle-point",
  }).addTo(map);

  const radiusCircle = L.circle(clickedPoint, {
    radius: parseFloat(radius),
    color: "#ff0000",
    fillColor: "#ff0000",
    fillOpacity: 0.1,
    weight: 1,
    adminLayerType: "obstacle-radius",
  }).addTo(map);
  return [obstacleMarker, radiusCircle];
}

function detectBlockedEdgesByObstacle(clickedPoint, radius) {
  adj_list_with_weights.forEach((node) => {
    const u = node.node_id;
    const nodeUObj = nodes.find((n) => n.node_id === u);
    if (!nodeUObj) {
      console.error(`Không tìm thấy id ${u}`);
      return;
    }

    const latU = nodeUObj.lat;
    const lonU = nodeUObj.lon;

    node.neighbors.forEach((neighborInfo) => {
      const v = neighborInfo.node_neighbor; 
      const weight = neighborInfo.weight; 

      const nodeVObj = nodes.find((n) => n.node_id === v);
      if (!nodeVObj) {
        console.error(`KhÃ´ng tÃ¬m tháº¥y node vá»›i id ${v}`);
        return;
      }
      const latV = nodeVObj.lat;
      const lonV = nodeVObj.lon;

      // TÃ­nh Ä‘iá»ƒm giá»¯a cá»§a cáº¡nh
      const edgeMidpoint = [(latU + latV) / 2, (lonU + lonV) / 2];
      const distance = getDistance(
        clickedPoint[0],
        clickedPoint[1],
        edgeMidpoint[0],
        edgeMidpoint[1]
      );
      if (distance <= radius) {
        if (!isEdgeBlocked([u, v])) {
          blockedEdges.push([u, v]);
          console.log(`Cảnh báo: ${u} - ${v}`);
        }
      }
    });
  });

  console.log("Tá»•ng sá»‘ cáº¡nh bá»‹ cháº·n bá»Ÿi váº­t cáº£n:", blockedEdges.length);
}

placeObstacleBtn.addEventListener("click", function () {
  isPlacingObstacle = !isPlacingObstacle;

  placeObstacleBtn.textContent = isPlacingObstacle
    ? "Hủy đặt vùng cấm"
    : "Đặt vùng cấm";
  placeObstacleBtn.classList.toggle("btn-danger", isPlacingObstacle);
  placeObstacleBtn.classList.toggle("btn-warning", !isPlacingObstacle);

  if (isPlacingObstacle) {
    isBlockMode = false;
    isDrawing = false;
    points = [];
    startPoint = null;
    if (temporaryLine) {
      map.removeLayer(temporaryLine);
      temporaryLine = null;
    }
    if (banPolyline) {
      map.removeLayer(banPolyline);
      banPolyline = null;
    }
    map.closePopup(); 
    const mapCenter = map.getCenter();
    L.popup({
            className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', 
            autoClose: true,
            closeOnClick: true
        })
        .setLatLng(mapCenter) 
        .setContent("<b>Đặt vùng cấm: </b> Click để đặt vùng cấm")
        .openOn(map);

    setTimeout(() => {
        map.closePopup(); 
    }, 5000); 
    }
});
