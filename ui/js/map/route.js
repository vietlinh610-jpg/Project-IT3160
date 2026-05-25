function displayPathfindingError(errorMessage) {
    let popupLocation;
    if (selectedPoints && selectedPoints.length === 2) {
        const node1 = nodes.find(n => n.node_id === selectedPoints[0]);
        const node2 = nodes.find(n => n.node_id === selectedPoints[1]);
        if (node1 && node2) {
            const lat1 = parseFloat(node1.lat);
            const lon1 = parseFloat(node1.lon);
            const lat2 = parseFloat(node2.lat);
            const lon2 = parseFloat(node2.lon);
            if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
                popupLocation = L.latLng((lat1 + lat2) / 2, (lon1 + lon2) / 2);
            }
        }
    }
    if (!popupLocation) {
        popupLocation = map.getCenter();
    }

    const errorPopup = L.popup({
            className: 'error-leaflet-popup synced-leaflet-popup compact-point-popup',
            autoClose: true,
            closeOnClick: true
        })
        .setLatLng(popupLocation)
        .setContent(`<b>Không tìm thấy đường đi</b>`)
        .openOn(map);
    setTimeout(() => {
          errorPopup.remove();
      }, 3000);
}


// Sự kiện Đảo chiều Điểm đầu - cuối

function findAndDrawPath() {
  if (selectedPoints.length < 2) {
      console.warn("Cần chọn đủ 2 điểm để tìm đường.");
      // Có thể hiển thị thông báo cho người dùng ở đây nếu muốn
      return;
  }

  const startNode = selectedPoints[0];
  const endNode = selectedPoints[1];
  const selectedAlgorithm = algorithmSelect ? algorithmSelect.value : "Dijkstra"; // Lấy thuật toán hiện tại

  // Lấy các giá trị hệ số từ UI (nếu có)
  const currentTrafficLevel = document.getElementById("trafficLevel") ? parseInt(document.getElementById("trafficLevel").value) : 1;
  const currentFloodLevel = document.getElementById("floodLevel") ? parseInt(document.getElementById("floodLevel").value) : 1;
  const maxDepthForIDDFS = 100000; // Giá trị mặc định hoặc lấy từ UI nếu có
  const iterationsForAStar = 100000; // Giá trị mặc định hoặc lấy từ UI nếu có


  console.log(`Tìm đường từ ${startNode} đến ${endNode} bằng ${selectedAlgorithm}`);

  // Xóa đường cũ (nếu có) trước khi gửi yêu cầu mới
  map.eachLayer(function (layer) {
      if (layer.options && layer.options.id === 'path-polyline-guest') {
          map.removeLayer(layer);
      }
  });

  fetch("http://127.0.0.1:5000/find_path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          start: startNode,
          end: endNode,
          algorithm: selectedAlgorithm,
          blocked_edges: typeof blockedEdges !== 'undefined' ? blockedEdges : [],
          closed_stations: typeof closedStations !== 'undefined' ? closedStations : [],
          closed_lines: typeof closedLines !== 'undefined' ? closedLines : [],
          traffic_edges: typeof trafficEdges !== 'undefined' ? trafficEdges : [],
          traffic_level: currentTrafficLevel,
          flood_edges: typeof floodEdges !== 'undefined' ? floodEdges : [],
          flood_level: currentFloodLevel,
          one_way_edges: typeof oneWayEdges !== 'undefined' ? oneWayEdges : [],
          max_depth_iddfs: maxDepthForIDDFS, // Gửi cho IDDFS
          iterations: iterationsForAStar     // Gửi cho A*
      }),
  })
  .then((res) => {
      if (!res.ok) {
          return res.json().then(errorData => {
              let err = new Error(errorData.error || `Lỗi ${res.status} từ server.`);
              err.data = errorData; 
              throw err;
          });
      }
      return res.json();
  })
  .then((data) => {
      if (data.path && data.path.length > 0) {
          console.log("Đường đi nhận được:", data.path);
          console.log("Thời gian ước tính (cost_with_factors):", data.cost_with_factors);
          console.log("Quãng đường thực tế (real_distance):", data.real_distance);
          
          drawPath(data.path, data.cost_with_factors, data.real_distance, selectedAlgorithm);
          
          // Tùy chọn: Hiển thị các node đã duyệt (data.explored_nodes)
          // Ví dụ: drawExploredNodes(data.explored_nodes);
      } else {
          displayPathfindingError(data.error || "Không tìm thấy đường đi phù hợp.");
      }
  })
  .catch((err) => {
      console.error("Lỗi trong findAndDrawPath:", err);
      let errorMessage = "Không thể kết nối đến máy chủ hoặc có lỗi không xác định.";
      if (err && err.data && err.data.error) {
          errorMessage = err.data.error;
      } else if (err && err.message) {
          errorMessage = err.message.toLowerCase().includes("failed to fetch") ? 
                        "Không thể kết nối tới máy chủ (app.py chưa chạy hoặc có lỗi mạng)." : 
                        err.message;
      }
      displayPathfindingError(errorMessage);
  });
}

function drawPath(pathNodeIds, costWithFactors, realDistance, algorithmUsed) {
  const algSelect = document.getElementById("algorithmSelect");
  const togPaths = document.getElementById("togglePaths");
  const rToggle = document.getElementById("roleToggle");
  const gResetBtn = document.getElementById("guestResetButton");

  // Khóa UI
  if(algSelect) algSelect.disabled = true;
  if(togPaths) togPaths.disabled = true;
  if(rToggle) rToggle.disabled = true;
  if(gResetBtn) gResetBtn.disabled = true;

  // Xóa nhóm đường đi cũ và tạo lại group mới
  if (typeof guestPathGroup !== 'undefined' && guestPathGroup) {
      guestPathGroup.clearLayers();
      map.removeLayer(guestPathGroup);
  }
  guestPathGroup = L.featureGroup().addTo(map);

  // Lọc lấy danh sách dữ liệu ga (node objects)
  const pathNodes = pathNodeIds.map(id => nodes.find(n => n.node_id === id)).filter(n => n !== undefined);
  if (pathNodes.length < 2) return;

  // Chuẩn bị dữ liệu hiển thị Bảng kết quả
  let formattedCost = "Không có", formattedDistance = "Không có";
  if (costWithFactors !== undefined && costWithFactors !== null && costWithFactors !== Infinity) {
      if (costWithFactors >= 3600) formattedCost = `${Math.floor(costWithFactors / 3600)} giờ ${Math.floor((costWithFactors % 3600) / 60)} phút`;
      else if (costWithFactors >= 60) formattedCost = `${Math.floor(costWithFactors / 60)} phút ${Math.round(costWithFactors % 60)} giây`;
      else if (costWithFactors >= 0) formattedCost = `${costWithFactors.toFixed(0)} giây`;
  }
  if (realDistance !== undefined && realDistance !== null && realDistance !== Infinity) {
      if (realDistance >= 1000) formattedDistance = (realDistance / 1000).toFixed(2) + " km";
      else if (realDistance >= 0) formattedDistance = realDistance.toFixed(0) + " m";
  }

  const algNameEl = document.getElementById("resultAlgorithmName");
  if (algNameEl) algNameEl.innerHTML = `<i class="fas fa-route"></i> ${algorithmUsed}`;
  const timeEl = document.getElementById("resultTime");
  if (timeEl) timeEl.innerText = formattedCost;
  const distEl = document.getElementById("resultDistance");
  if (distEl) distEl.innerText = formattedDistance;

  // Hiệu ứng Animation vẽ từng đoạn
  let currentIndex = 0; 
  const animationSpeed = 50; 
  let segmentsDrawn = 0;

  function animatePathDrawing() {
      if (currentIndex < pathNodes.length - 1) {
          const n1 = pathNodes[currentIndex];
          const n2 = pathNodes[currentIndex + 1];
          const isTransfer = n1.line !== n2.line; // Phát hiện chuyển tuyến

          const p1 = [n1.lat, n1.lon];
          const p2 = [n2.lat, n2.lon];
          let segmentOptions = {};

          if (isTransfer) {
              // Đi bộ chuyển trạm: Nét đứt màu xám đậm
              segmentOptions = { color: "#666", weight: 5, dashArray: "5, 5", opacity: 0.9 };
              
              // Tạo Icon Người đi bộ ở ngay điểm giữa
              const midpoint = [(n1.lat + n2.lat) / 2, (n1.lon + n2.lon) / 2];
              const transferIcon = L.divIcon({
                  className: 'transfer-icon-marker',
                  html: '<i class="fas fa-walking"></i>',
                  iconSize: [22, 22],
                  iconAnchor: [11, 11]
              });
              L.marker(midpoint, { icon: transferIcon }).addTo(guestPathGroup)
                .bindPopup(`<b>🚶 Chuyển tuyến</b><br>Từ: ${n1.line}<br>Sang: ${n2.line}`, { className: 'compact-point-popup' });
          } else {
              // Đi trên tàu: Màu Xanh lam (#007bff) rõ ràng, nổi bật
              segmentOptions = { color: "#007bff", weight: 7, opacity: 0.95, className: 'premium-path-segment' };
          }

          L.polyline([p1, p2], segmentOptions).addTo(guestPathGroup);

          segmentsDrawn++;
          if (segmentsDrawn % 6 === 0) { // Camera lướt theo mỗi 6 trạm
              map.panTo(L.latLng(p2), { animate: true, duration: 0.2});
          }

          currentIndex++;
          setTimeout(animatePathDrawing, animationSpeed);
      } else {
          // Hoàn tất animation
          if(algSelect) algSelect.disabled = false;
          if(togPaths) togPaths.disabled = false;
          if(rToggle) rToggle.disabled = false;
          if(gResetBtn) gResetBtn.disabled = false;
          
          setTimeout(() => {
              const rp = document.getElementById("routeResultPanel");
              if (rp) rp.classList.remove("hidden");
              if (guestPathGroup && guestPathGroup.getLayers().length > 0) {
                  map.fitBounds(guestPathGroup.getBounds().pad(0.1));
              }
          }, 300);
      }
  }

  animatePathDrawing();
}
