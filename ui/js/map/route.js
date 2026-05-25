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
  // Xóa đường đi cũ của guest nếu có
  algorithmSelect.disabled = true; // Khóa
  togglePaths.disabled = true;
  roleToggle.disabled = true;
  guestResetButton.disabled = true;
  if (guestPathPolyline && map.hasLayer(guestPathPolyline)) {
      map.removeLayer(guestPathPolyline);
      guestPathPolyline = null;
  }
  // Cũng có thể bạn dùng ID để xóa, đảm bảo nó được xóa:
  map.eachLayer(function (layer) {
      if (layer.options && layer.options.id === 'path-polyline-guest') {
          map.removeLayer(layer);
      }
  });


  if (!pathNodeIds || pathNodeIds.length < 2) {
      console.warn("drawPath: Đường đi không hợp lệ hoặc không đủ điểm để vẽ.");
      return;
  }

  const latlngs = pathNodeIds.map((id) => {
      const node = nodes.find((n) => n.node_id === id);
      if (!node) {
          console.warn(`drawPath: Không tìm thấy thông tin cho node ID: ${id}`);
          return null;
      }
      return [node.lat, node.lon];
  }).filter(p => p !== null && typeof p[0] === 'number' && typeof p[1] === 'number');

  if (latlngs.length < 2) {
      console.warn("drawPath: Không đủ điểm hợp lệ (sau khi lọc) để vẽ đường đi.");
      return;
  }

  // Tạo đối tượng polyline, ban đầu chỉ với điểm đầu tiên để bắt đầu animation
  guestPathPolyline = L.polyline([latlngs[0]], { // Khởi tạo với điểm đầu tiên
      color: "#FF007F", // Màu Neon Hot Pink cho đường đi
      weight: 6,        // Độ dày của đường
      opacity: 0.85,
      id: 'path-polyline-guest', // ID để có thể xóa sau này
      className: 'path-guest-route' // Class CSS (nếu có)
  }).addTo(map);



  // --- BẮT ĐẦU CHUẨN BỊ DỮ LIỆU CHO BẢNG KẾT QUẢ ---
  let formattedCost = "Không có";
  if (costWithFactors !== undefined && costWithFactors !== null && costWithFactors !== Infinity) {
      if (costWithFactors >= 3600) {
          formattedCost = `${Math.floor(costWithFactors / 3600)} giờ ${Math.floor((costWithFactors % 3600) / 60)} phút`;
      } else if (costWithFactors >= 60) {
          formattedCost = `${Math.floor(costWithFactors / 60)} phút ${Math.round(costWithFactors % 60)} giây`;
      } else if (costWithFactors > 0) {
          formattedCost = `${costWithFactors.toFixed(0)} giây`;
      } else if (costWithFactors === 0) {
          formattedCost = `Không đáng kể`;
      }
  }

  let formattedDistance = "Không có";
  if (realDistance !== undefined && realDistance !== null && realDistance !== Infinity) {
      if (realDistance >= 1000) {
          formattedDistance = (realDistance / 1000).toFixed(2) + " km";
      } else if (realDistance >= 0) {
          formattedDistance = realDistance.toFixed(0) + " m";
      }
  }

  // Gán dữ liệu vào HTML của Bảng Kết Quả
  const algNameEl = document.getElementById("resultAlgorithmName");
  if (algNameEl) algNameEl.innerHTML = `<i class="fas fa-route"></i> ${algorithmUsed}`;
  
  const timeEl = document.getElementById("resultTime");
  if (timeEl) timeEl.innerText = formattedCost;
  
  const distEl = document.getElementById("resultDistance");
  if (distEl) distEl.innerText = formattedDistance;
  // --- KẾT THÚC CHUẨN BỊ DỮ LIỆU ---

  // Animation
  let currentIndex = 1; 
  const animationSpeed = 80; 
  const totalSegments = latlngs.length -1;
  let segmentsDrawn = 0;

  function animatePathDrawing() {
      if (currentIndex < latlngs.length && guestPathPolyline && map.hasLayer(guestPathPolyline)) {
          guestPathPolyline.addLatLng(L.latLng(latlngs[currentIndex]));
          segmentsDrawn++;
          
          if (segmentsDrawn % 20 === 0 || segmentsDrawn === totalSegments) { // Cập nhật view sau mỗi 5 đoạn hoặc khi kết thúc
            map.panTo(L.latLng(latlngs[currentIndex]), { animate: true, duration: 0.3});
          }

          currentIndex++;
          setTimeout(animatePathDrawing, animationSpeed);
      } else if (guestPathPolyline && map.hasLayer(guestPathPolyline)) {
        algorithmSelect.disabled = false; // Khóa
        togglePaths.disabled = false;
        roleToggle.disabled = false;
        guestResetButton.disabled = false;
        setTimeout(() => {
            if (guestPathPolyline && map.hasLayer(guestPathPolyline) && latlngs.length > 0) {
                // Xác định điểm giữa của đường đi
                const latLngObjects = latlngs.map(p => L.latLng(p));

                const middleLatLng = getLatLngAtHalfDistance(latLngObjects);

                console.log(middleLatLng);

                // Mở bảng kết quả thay vì popup
                document.getElementById("routeResultPanel").classList.remove("hidden");

                map.fitBounds(guestPathPolyline.getBounds().pad(0.3));
            }
        }, 500);
      }
  }

  if (latlngs.length >= 1 && guestPathPolyline) { 
      animatePathDrawing();
  } else if (latlngs.length === 1 && guestPathPolyline) {
      algorithmSelect.disabled = false;
      togglePaths.disabled = false;
      roleToggle.disabled = false;
      guestResetButton.disabled = false;
      setTimeout(() => {
          if (guestPathPolyline && map.hasLayer(guestPathPolyline)) {
              document.getElementById("routeResultPanel").classList.remove("hidden");
               map.setView(L.latLng(latlngs[0]), 17); // Zoom vào điểm đó
          }
      }, 500);
  }
}
