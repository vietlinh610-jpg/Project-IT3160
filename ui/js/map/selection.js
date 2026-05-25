async function updateMarkerPopupWithGeocoding(marker, lat, lon, title) {
  if (!marker) return;

  if (!marker.customData) {
      marker.customData = {
          initialName: "(Đang tải...)",
          fullName: null,
          initialNameFetched: false,
          detailFetched: false,
          isFetchingInitial: false,
          isFetchingDetail: false
      };
  }
  const cData = marker.customData;

  // Tạo nội dung popup HTML
  const generatePopupHtml = () => {
      let nameToDisplay = cData.initialName;
      if (cData.detailFetched && cData.fullName) {
          nameToDisplay = cData.fullName;
      }

      let html = `<b>${title}</b><br><div>Tên: ${nameToDisplay}</div>`;
      if (cData.initialNameFetched && !cData.detailFetched && !cData.isFetchingDetail && !cData.initialName.startsWith("(Lỗi")) {
          html += `<div><a href="#" class="expand-details-link" style="color: var(--primary); text-decoration: underline;">Xem chi tiết</a></div>`;
      } else if (cData.isFetchingDetail) {
          html += `<div><i>Đang tải chi tiết...</i></div>`;
      }
      return html;
  };

  // Gắn listener sau khi popup được render (DOM ready)
  const attachClickListenerToDetailLink = () => {
      setTimeout(() => {
          const popupElement = marker.getPopup()?.getElement();
          if (!popupElement) return;

          const detailLink = popupElement.querySelector('.expand-details-link');
          if (detailLink && !detailLink.getAttribute('data-click-listener')) {
              detailLink.setAttribute('data-click-listener', 'true');
              detailLink.addEventListener('click', (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  fetchFullNameAndRefreshPopup();
              });
          }
      }, 50); 
  };

  const fetchFullNameAndRefreshPopup = async () => {
      if (cData.detailFetched || cData.isFetchingDetail) return;
      cData.isFetchingDetail = true;

      marker.setPopupContent(generatePopupHtml());
      marker.openPopup();
      attachClickListenerToDetailLink();

      try {
          const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en,ru`
          );
          if (!response.ok) throw new Error(`Lỗi API (chi tiết): ${response.status}`);
          const data = await response.json();
          const rawName = data.display_name || "(Không có tên chi tiết)";
          const parts = rawName.split(',').map(p => p.trim());
          if (parts.length > 2) {
            parts.splice(-2, 2);
          }
          cData.fullName = parts.join(', ');
      } catch (err) {
          console.error("Lỗi tải tên chi tiết:", err);
          cData.fullName = "";
      } finally {
          cData.isFetchingDetail = false;
          cData.detailFetched = true;
          marker.setPopupContent(generatePopupHtml());
          marker.openPopup();
          attachClickListenerToDetailLink();
      }
  };

  // Tải tên ban đầu nếu chưa có
  if (!cData.initialNameFetched && !cData.isFetchingInitial) {
      cData.isFetchingInitial = true;
      marker.setPopupContent(generatePopupHtml());
      marker.openPopup();
      attachClickListenerToDetailLink();

      try {
          const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1&accept-language=en,ru`
          );
          if (!response.ok) throw new Error(`Lỗi API (ban đầu): ${response.status}`);
          const data = await response.json();

          if (data && data.display_name) {
              const addr = data.address || {};
              let nameParts = [];

              if (addr.road) nameParts.push(addr.road);
              if (addr.amenity) nameParts.push(addr.amenity);
              if (addr.neighbourhood) nameParts.push(addr.neighbourhood);
              else if (addr.suburb) nameParts.push(addr.suburb);
              else if (addr.village) nameParts.push(addr.village);
              if (nameParts.length === 0 && addr.quarter) nameParts.push(addr.quarter);
              if (nameParts.length < 2 && addr.city_district && !nameParts.includes(addr.city_district)) {
                  nameParts.push(addr.city_district);
              }

              cData.initialName = nameParts.length > 0
                  ? nameParts.slice(0, 2).join(', ')
                  : data.display_name.split(',').slice(0, 2).join(', ');
          } else {
              cData.initialName = "";
          }
      } catch (err) {
          console.error("Lỗi tải tên ban đầu:", err);
          cData.initialName = "";
      } finally {
          cData.isFetchingInitial = false;
          cData.initialNameFetched = true;
          marker.setPopupContent(generatePopupHtml());
          marker.openPopup();
          attachClickListenerToDetailLink();
      }
  } else {
      marker.setPopupContent(generatePopupHtml());
      marker.openPopup();
      attachClickListenerToDetailLink();
  }
}

function processMapSelection(lat, lng) {
  if (isAdmin) {
      map.closePopup();
      L.popup({ className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', autoClose: true, closeOnClick: true })
        .setLatLng([lat, lng])
        .setContent("<b>Thông báo:</b> Chế độ Admin. Không thể chọn điểm đi/đến. Chuyển về Guest để tìm đường.")
        .openOn(map);
      return;
  }

  const clickedLatLng = L.latLng(lat, lng); 
  let closestNode = null;
  let minDist = Infinity;
  nodes.forEach((node) => {
      const d = getDistance(lat, lng, node.lat, node.lon);
      if (d < minDist) {
          minDist = d;
          closestNode = node;
      }
  });

  if (!closestNode) {
      console.warn("Không tìm thấy node nào gần vị trí đã chọn.");
      map.closePopup();
      L.popup({ className: 'error-leaflet-popup synced-leaflet-popup compact-point-popup' })
        .setLatLng(clickedLatLng)
        .setContent("<b>Lỗi:</b> Không tìm thấy nút giao thông nào gần vị trí này.")
        .openOn(map);
      return;
  }

  if (selectedPoints.length === 0) {
      selectedPoints.push(closestNode.node_id);
      if (startPointMarker) map.removeLayer(startPointMarker);
      startPointMarker = L.circleMarker([closestNode.lat, closestNode.lon], {
          radius: 4, color: "green", fillColor: "green", fillOpacity: 0.7, pane: 'markerPane'
      }).addTo(map)
        .bindPopup(`<b>Điểm bắt đầu</b>`, { className: 'point-popup start-point-popup compact-point-popup', autoClose: false, closeOnClick: false })
        .openPopup();
      updateMarkerPopupWithGeocoding(startPointMarker, clickedLatLng.lat, clickedLatLng.lng, "Điểm bắt đầu");
  } else if (selectedPoints.length === 1) {
      if (selectedPoints[0] === closestNode.node_id) {
          map.closePopup();
          L.popup({ className: 'error-leaflet-popup synced-leaflet-popup compact-point-popup' })
            .setLatLng([closestNode.lat, closestNode.lon])
            .setContent("<b>Lỗi:</b> Điểm cuối không được trùng với điểm đầu.")
            .openOn(map);
          return;
      }
      selectedPoints.push(closestNode.node_id);
      if (endPointMarker) map.removeLayer(endPointMarker);
      endPointMarker = L.circleMarker([closestNode.lat, closestNode.lon], {
          radius: 4, color: "green", fillColor: "green", fillOpacity: 0.7, pane: 'markerPane'
      }).addTo(map)
        .bindPopup(`<b>Điểm kết thúc</b>`, { className: 'point-popup end-point-popup compact-point-popup', autoClose: false, closeOnClick: false })
        .openPopup();
      updateMarkerPopupWithGeocoding(endPointMarker, clickedLatLng.lat, clickedLatLng.lng, "Điểm kết thúc");
  } else {
    const popup = L.popup({
      className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup'
    })
      .setLatLng([closestNode.lat, closestNode.lon])
      .setContent("Đã có Điểm đầu và Điểm cuối.")
      .openOn(map);
    
    setTimeout(() => {
      map.closePopup(popup);
    }, 3000);
  }
}

window.selectSearchedLocation = function(lat, lon) {
  console.log("window.selectSearchedLocation called with lat:", lat, "lng:", lon); 
  
  if (tempSearchMarker) {
      map.closePopup(tempSearchMarker.getPopup()); 
      map.removeLayer(tempSearchMarker);
      tempSearchMarker = null;
  }
  processMapSelection(lat, lon);
}


map.on("click", function (e) {
  const { lat, lng } = e.latlng;
  const clickedLatLng = e.latlng;
  if (!moscowBoundaryLatLngs) {
  } else {
      let isInsideMoscow;
      try {
          isInsideMoscow = isPointInPolygon(clickedLatLng, moscowBoundaryLatLngs);
      } catch (error) {
          console.error("Lỗi khi sử dụng L.PolyUtil.isPointInsidePolygon. Đảm bảo Leaflet đã tải đầy đủ.", error);
          isInsideMoscow = true; 
      }

      if (!isInsideMoscow) {
          map.closePopup(); 
          L.popup({
              className: 'warning-leaflet-popup synced-leaflet-popup compact-point-popup',
              autoClose: true,
              closeOnClick: true
          })
          .setLatLng(clickedLatLng)
          .setContent("<b>Cảnh báo:</b> Vị trí bạn chọn nằm ngoài khu vực tàu điện ngầm Moscow. Vui lòng thao tác trong khu vực được hỗ trợ.")
          .openOn(map);

          setTimeout(() => {
              const currentPopup = map._popup;
              if (currentPopup && currentPopup.getContent().includes("nằm ngoài khu vực tàu điện ngầm Moscow")) {
                  map.closePopup();
              }
          }, 4000); 

          return;
      }
  }

  // Kiểm tra admin modes và các điều kiện khác trước khi gọi processMapSelection
  if (isAdmin && isOneWayEdgeMode) {
      handleOneWayEdgeModeClick(e);
      return;
  }
  if (isAdmin && operationMode === "station") {
      handleCloseStationClick(lat, lng);
      return;
  }
  if (isAdmin && !operationMode && !isBlockMode && !isPlacingObstacle && !isTrafficMode && !isFloodMode) {
      map.closePopup();
      L.popup({ className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', autoClose: true, closeOnClick: true })
        .setLatLng(e.latlng)
        .setContent("<b>Thông báo:</b> Chế độ Admin. Không thể tìm đường. Chuyển về Guest.")
        .openOn(map);
      return;
  }
  if (isBlockMode || isTrafficMode || isFloodMode) {
      handleDrawingMode(lat, lng, isTrafficMode, isFloodMode);
      return;
  }
  if (isPlacingObstacle) {
      handleObstaclePlacement(lat, lng);
      return;
  }

  // Nếu không phải các mode đặc biệt của admin, gọi hàm xử lý chọn điểm
  processMapSelection(lat, lng);
});

// Xử lý di chuyển chuột
map.on("mousemove", function (e) {
  if ((isBlockMode || isTrafficMode || isFloodMode) && isDrawing) {
    if (temporaryLine) {
      map.removeLayer(temporaryLine);
    }
    const lastPoint = points.length > 0 ? points[points.length - 1] : startPoint;
    let color;
    let trafficLevel = document.getElementById("trafficLevel") ? parseInt(document.getElementById("trafficLevel").value) : 1;
    let floodLevel = document.getElementById("floodLevel") ? parseInt(document.getElementById("floodLevel").value) : 1;
    if (!isTrafficMode && !isFloodMode) {
      color = "#f44336"; // Đỏ - cấm đường
    } else if(isTrafficMode){
      switch (trafficLevel) {
        case 1:
          color = "#fdd835"; // Tắc nhẹ - vàng tươi
          break;
        case 2:
          color = "#ffb300"; // Tắc vừa - cam đậm
          break;
        case 3:
          color = "#bf360c"; // Tắc nặng - nâu cam đậm
          break;
      }
    }  else {
      switch (floodLevel) {
        case 1:
          color = "#64b5f6"; // Ngập nhẹ - xanh dương nhạt
          break;
        case 2:
          color = "#2196f3"; // Ngập vừa - xanh dương vừa
          break;
        case 3:
          color = "#0d47a1"; // Ngập nặng - xanh dương đậm nhất
          break;
      }
    }
    if (lastPoint) {
      temporaryLine = L.polyline([lastPoint, [e.latlng.lat, e.latlng.lng]], {
        color: color,
        weight: 3,
        opacity: 0.5,
        dashArray: "5, 10",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }
  }
});

// Xử lý phím ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && isDrawing) {
    let mode = null;
    let lineList = null;
    let tempLine = null;
    let edgesList = null;

    if (isBlockMode) {
      mode = "block";
      lineList = bannedLines;
      tempLine = banPolyline;
      edgesList = blockedEdges;
    } else if (isTrafficMode) {
      mode = "traffic";
      lineList = trafficLine;
      tempLine = trafficPolyline;
      edgesList = trafficEdges;
    } else if (isFloodMode) {
      mode = "flood";
      lineList = floodLine;
      tempLine = floodPolyline;
      edgesList = floodEdges;
    }

    if (mode && points.length > 0) {
      console.log(`Hoàn thành vẽ đường ${mode === "block" ? "cấm" : "tắc"}`);

      // Lưu đường vào danh sách
      lineList.push([...points]);
      if (mode === "block") {
        operationHistory.push({ type: "segment" });
      }

      let color;
      let trafficLevel = document.getElementById("trafficLevel") ? parseInt(document.getElementById("trafficLevel").value) : 1;
      let floodLevel = document.getElementById("floodLevel") ? parseInt(document.getElementById("floodLevel").value) : 1;
      if (mode === "block") {
        color = "#f44336"; // Đỏ - cấm đường
      } else if(mode === "traffic"){
        switch (trafficLevel) {
          case 1:
            color = "#fdd835"; // Tắc nhẹ - vàng tươi
            break;
          case 2:
            color = "#ffb300"; // Tắc vừa - cam đậm
            break;
          case 3:
            color = "#bf360c"; // Tắc nặng - nâu cam đậm
            break;
        }
      }  else {
        switch (floodLevel) {
          case 1:
            color = "#64b5f6"; // Ngập nhẹ - xanh dương nhạt
            break;
          case 2:
            color = "#2196f3"; // Ngập vừa - xanh dương vừa
            break;
          case 3:
            color = "#0d47a1"; // Ngập nặng - xanh dương đậm nhất
            break;
        }
      }

      // Vẽ đường
      L.polyline(points, {
        color: color,
        weight: 3,
        dashArray: "10,10",
        opacity: 0.8,
      }).addTo(map);

      // Xác định các cạnh bị cắt
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (p1 && p2) {
          detectBlockedEdgesByCut([p1, p2]);
        } else {
          console.warn("Điểm không hợp lệ:", p1, p2);
        }
      }

      // Xóa đường tạm
      if (temporaryLine) {
        map.removeLayer(temporaryLine);
        temporaryLine = null;
      }

      if (tempLine) {
        map.removeLayer(tempLine);
        tempLine = null;
      }

      console.log(
        `Tổng số cạnh ${mode === "block" ? "bị cấm" : "tắc đường"}:`,
        edgesList.length
      );
      if (mode === "traffic") {
        console.log("Hệ số tắc đường:", trafficLevel);
      }
      console.log(
        `=== Kết thúc vẽ đường ${mode === "block" ? "cấm" : "tắc"} ===`
      );
      updateOperationSummary();

      // Reset trạng thái
      points = [];
      isBlockMode = false;
      isTrafficMode = false;
      isFloodMode = false;
      isDrawing = false;
      startPoint = null;
    } else if (mode) {
      console.warn(
        `Không có điểm nào để tạo đường ${mode === "block" ? "cấm" : "tắc"}.`
      );
    }
  }
  if (e.key === "Escape") {
    if (isAdmin && isOneWayEdgeMode) {
        isOneWayEdgeMode = false;
        const btn = document.getElementById("toggleOneWayEdgeModeBtn");
        if (btn) {
            btn.textContent = "Đường 1 chiều";
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-warning"); // Nhất quán với class mặc định của nút
        }
        map.getContainer().style.cursor = '';
        map.closePopup(); // Đóng popup nếu đang mở
        console.log("Đã thoát chế độ đặt đường một chiều.");
        return;
    }
  }
});

// Hàm truyền đối số cho backend

function handleDrawingMode(lat, lng, isTraffic = false, isFlood = false) {
  isDrawing = true;
  startPoint = [lat, lng];
  points.push([lat, lng]);

  let color;
  let trafficLevel = document.getElementById("trafficLevel") ? parseInt(document.getElementById("trafficLevel").value) : 1;
  let floodLevel = document.getElementById("floodLevel") ? parseInt(document.getElementById("floodLevel").value) : 1;
  if (!isTraffic && !isFlood) {
    color = "#f44336"; // Đỏ - cấm đường
  } else if(isTraffic){
    switch (trafficLevel) {
      case 1:
        color = "#fdd835"; // Tắc nhẹ - vàng tươi
        break;
      case 2:
        color = "#ffb300"; // Tắc vừa - cam đậm
        break;
      case 3:
        color = "#bf360c"; // Tắc nặng - nâu cam đậm
        break;
    }
  }  else {
    switch (floodLevel) {
      case 1:
        color = "#64b5f6"; // Ngập nhẹ - xanh dương nhạt
        break;
      case 2:
        color = "#2196f3"; // Ngập vừa - xanh dương vừa
        break;
      case 3:
        color = "#0d47a1"; // Ngập nặng - xanh dương đậm nhất
        break;
    }
  }
  const polylineOptions = {
    color: color,
    weight: 3,
    dashArray: "10,10",
    opacity: 0.8,
  };

  const currentPoint = [lat, lng];

  const drawingLayerType = isTraffic ? "traffic-point" : (isFlood ? "flood-point" : "blocked-edge-point");

  // Vẽ chấm tròn tại điểm click
  L.circleMarker(currentPoint, {
    radius: 5,
    color: color,
    fillColor: color,
    fillOpacity: 1,
    adminLayerType: drawingLayerType,
  }).addTo(map);

  // Xóa polyline cũ nếu có
  if (isTraffic && trafficPolyline) {
    map.removeLayer(trafficPolyline);
  } else if (isFlood && floodPolyline){
    map.removeLayer(floodPolyline);
  } else if (banPolyline) {
    map.removeLayer(banPolyline);
  }

  // Tạo polyline mới
  if (isTraffic) {
    trafficPolyline = L.polyline(points, polylineOptions).addTo(map);
  } else if (isFlood){
    floodPolyline = L.polyline(points, polylineOptions).addTo(map);
  } else {
    banPolyline = L.polyline(points, polylineOptions).addTo(map);
  }
}
