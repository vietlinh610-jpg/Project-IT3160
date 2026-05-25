const metroLineColors = {
  'Сокольническая линия': '#EF161E', // Sokolnicheskaya (Tuyến số 1, Đỏ)
  'Замоскворецкая линия': '#2DBE2C', // Zamoskvoretskaya (Tuyến số 2, Xanh lá)
  'Арбатско-Покровская линия': '#0078BF', // Arbatsko-Pokrovskaya (Tuyến số 3, Xanh dương)
  'Филёвская линия': '#00BFFF', // Filyovskaya (Tuyến số 4, Xanh dương nhạt)
  'Кольцевая линия': '#894E35', // Koltsevaya (Tuyến số 5, Nâu)
  'Калужско-Рижская линия': '#F58220', // Kaluzhsko-Rizhskaya (Tuyến số 6, Cam)
  'Таганско-Краснопресненская линия': '#800080', // Tagansko-Krasnopresnenskaya (Tuyến số 7, Tím)
  'Калининская линия': '#FFD803', // Kalininskaya (Tuyến số 8, Vàng)
  'Солнцевская линия': '#FFB300', // Solntsevskaya (Tuyến số 8A, Vàng kim)
  'Серпуховско-Тимирязевская линия': '#999999', // Serpukhovsko-Timiryazevskaya (Tuyến số 9, Xám)
  'Люблинско-Дмитровская линия': '#99CC33', // Lyublinsko-Dmitrovskaya (Tuyến số 10, Xanh lá mạ)
  'Большая кольцевая линия': '#82C0C0', // Bolshaya Koltsevaya (Tuyến số 11, Xanh ngọc)
  'Бутовская линия': '#A1B3D4', // Butovskaya (Tuyến số 12, Xanh xám nhạt)
  'Московское центральное кольцо': '#F19C9F', // MCC (Tuyến số 14, Hồng/Đỏ nhạt)
  'Некрасовская линия': '#DE64A1', // Nekrasovskaya (Tuyến số 15, Hồng)
  'Троицкая линия': '#00A550' // Troitskaya (Tuyến số 16, Xanh lục bảo)
};

// Hàm vẽ mạng lưới tàu điện ngầm Moscow lên bản đồ
function drawMoscowMetroNetwork() {
  if (typeof nodes === 'undefined' || typeof adj_list_with_weights === 'undefined') {
    console.error("Dữ liệu Moscow Metro chưa được tải!");
    return;
  }

  const drawnEdges = new Set();
  
  // 1. Vẽ các đường ray tàu (Tracks) và các đoạn đi bộ chuyển tuyến (Transfers)
  adj_list_with_weights.forEach(source => {
    const u = source.node_id;
    const nodeU = nodes.find(n => n.node_id === u);
    if (!nodeU) return;

    source.neighbors.forEach(neighbor => {
      const v = neighbor.node_neighbor;
      const nodeV = nodes.find(n => n.node_id === v);
      if (!nodeV) return;

      // Tránh vẽ lặp lại cạnh vô hướng
      const edgeKey = u < v ? `${u}_${v}` : `${v}_${u}`;
      if (drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);

      let color = '#888888';
      let isTransfer = (nodeU.line !== nodeV.line);
      let dashArray = isTransfer ? '5, 5' : null;
      let weight = isTransfer ? 2.5 : 4.5;
      let opacity = isTransfer ? 0.6 : 0.85;

      if (!isTransfer) {
        color = metroLineColors[nodeU.line] || '#3388ff';
      }

      L.polyline([[nodeU.lat, nodeU.lon], [nodeV.lat, nodeV.lon]], {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray,
        interactive: false
      }).addTo(map);
    });
  });

  // 2. Vẽ các nhà ga (Stations) làm các Circle Marker tương tác
  nodes.forEach(node => {
    // Chỉ vẽ các ga thực tế từ dữ liệu gốc (added === 0) để tránh vẽ các điểm tạm thời
    if (node.added !== 0) return;

    const color = metroLineColors[node.line] || '#3388ff';

    const marker = L.circleMarker([node.lat, node.lon], {
      radius: 6,
      color: color,
      fillColor: '#FFFFFF',
      fillOpacity: 1,
      weight: 2.5,
      pane: 'markerPane'
    }).addTo(map);

    const popupContent = `
      <div style="font-family: 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.4; padding: 4px;">
        <strong style="color: ${color}; font-size: 14px; display: block; margin-bottom: 4px;">${node.name}</strong>
        <span style="color: #666; font-size: 11px;">Tuyến: ${node.line}</span>
        <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <button class="btn btn-primary btn-xs" style="margin-bottom:0; padding: 6px 10px; font-size:11px;" onclick="processMapSelection(${node.lat}, ${node.lon})">Chọn điểm đi/đến</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      className: 'compact-point-popup synced-leaflet-popup',
      closeButton: false
    });

    // Tooltip hiện tên ga khi di chuột qua
    marker.bindTooltip(node.name, {
      permanent: false,
      direction: 'top',
      opacity: 0.9,
      className: 'station-tooltip'
    });

    // Các vi ứng hiệu ứng hover (micro-animations)
    marker.on('mouseover', function () {
      this.setStyle({
        radius: 8,
        weight: 3.5,
        fillColor: color
      });
    });

    marker.on('mouseout', function () {
      this.setStyle({
        radius: 6,
        weight: 2.5,
        fillColor: '#FFFFFF'
      });
    });
  });
}
