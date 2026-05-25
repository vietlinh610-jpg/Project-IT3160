function getNodeById(nodeId) {
  return nodes.find((node) => node.node_id === nodeId);
}

function getClosestNode(lat, lng) {
  let closestNode = null;
  let minDist = Infinity;
  nodes.forEach((node) => {
    if (node.added !== 0) return;
    const distance = getDistance(lat, lng, node.lat, node.lon);
    if (distance < minDist) {
      minDist = distance;
      closestNode = node;
    }
  });
  return closestNode;
}

function setOperationMode(mode) {
  operationMode = mode;
  isBlockMode = false;
  isTrafficMode = false;
  isFloodMode = false;
  isPlacingObstacle = false;
  isOneWayEdgeMode = false;
  isDrawing = false;
  points = [];
  map.getContainer().style.cursor = mode ? "crosshair" : "";
}

function showOperationPopup(message) {
  map.closePopup();
  L.popup({
    className: "info-leaflet-popup synced-leaflet-popup compact-point-popup",
    autoClose: true,
    closeOnClick: true,
  })
    .setLatLng(map.getCenter())
    .setContent(message)
    .openOn(map);
}

function updateOperationSummary() {
  const summary = document.getElementById("operationSummary");
  if (!summary) return;
  summary.textContent = `Ga đóng: ${closedStations.length} | Đoạn đóng: ${bannedLines.length} | Vùng cấm: ${obstacleMarkers.length} | Tuyến đóng: ${closedLines.length}`;
}

function addOperationLayer(layer) {
  operationLayers.push(layer);
  return layer;
}

function clearOperationLayers() {
  operationLayers.forEach((layer) => {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
  operationLayers = [];
}

function redrawClosedStations() {
  closedStations.forEach((stationId) => {
    const node = getNodeById(stationId);
    if (!node) return;
    addOperationLayer(
      L.circleMarker([node.lat, node.lon], {
        radius: 9,
        color: "#b71c1c",
        fillColor: "#f44336",
        fillOpacity: 0.85,
        weight: 3,
        pane: "markerPane",
      })
        .addTo(map)
        .bindTooltip(`Đóng ga: ${node.name || node.node_id}`, { direction: "top" })
    );
  });
}

function redrawClosedLines() {
  closedLines.forEach((lineName) => {
    const drawnEdges = new Set();
    adj_list_with_weights.forEach((source) => {
      const nodeU = getNodeById(source.node_id);
      if (!nodeU || nodeU.line !== lineName) return;
      source.neighbors.forEach((neighbor) => {
        const nodeV = getNodeById(neighbor.node_neighbor);
        if (!nodeV || nodeV.line !== lineName) return;
        const edgeKey = nodeU.node_id < nodeV.node_id ? `${nodeU.node_id}_${nodeV.node_id}` : `${nodeV.node_id}_${nodeU.node_id}`;
        if (drawnEdges.has(edgeKey)) return;
        drawnEdges.add(edgeKey);
        addOperationLayer(
          L.polyline([[nodeU.lat, nodeU.lon], [nodeV.lat, nodeV.lon]], {
            color: "#ff6d00",
            weight: 8,
            opacity: 0.5,
            dashArray: "6, 8",
            interactive: false,
          }).addTo(map)
        );
      });
    });
  });
}

function redrawOperations() {
  clearOperationLayers();
  redrawClosedLines();
  redrawClosedStations();
  updateOperationSummary();
}

function closeStationByNode(node) {
  if (!node) return;
  // Tìm tất cả các node có cùng tên ga để đóng toàn bộ ga vật lý
  const relatedNodes = nodes.filter(n => n.name === node.name);
  const newlyClosedIds = [];
  
  relatedNodes.forEach(n => {
    if (!closedStations.includes(n.node_id)) {
      closedStations.push(n.node_id);
      newlyClosedIds.push(n.node_id);
    }
  });

  if (newlyClosedIds.length > 0) {
    operationHistory.push({ type: "station_group", ids: newlyClosedIds, stationName: node.name });
    redrawOperations();
    showOperationPopup(`<b>Đã đóng toàn bộ ga:</b> ${node.name}`);
  }
}

function handleCloseStationClick(lat, lng) {
  const node = getClosestNode(lat, lng);
  if (!node) return;
  closeStationByNode(node);
  setOperationMode(null);
}

function closeSelectedLine() {
  const select = document.getElementById("closeLineSelect");
  if (!select || !select.value || closedLines.includes(select.value)) return;
  closedLines.push(select.value);
  operationHistory.push({ type: "line", name: select.value });
  redrawOperations();
  showOperationPopup(`<b>Đã đóng tuyến:</b> ${select.options[select.selectedIndex].text}`);
}

function restoreLastOperation() {
  const last = operationHistory.pop();
  if (!last) return;

  if (last.type === "station") {
    closedStations = closedStations.filter((id) => id !== last.id);
  } else if (last.type === "station_group") {
    closedStations = closedStations.filter((id) => !last.ids.includes(id));
  } else if (last.type === "line") {
    closedLines = closedLines.filter((name) => name !== last.name);
  } else if (last.type === "segment") {
    bannedLines.pop();
    recomputeBlockedEdges();
  } else if (last.type === "obstacle") {
    obstacleMarkers.pop();
    recomputeBlockedEdges();
  }

  redrawAllAdminRestrictions();
}

function restoreAllOperations() {
  closedStations = [];
  closedLines = [];
  operationHistory = [];
  bannedLines = [];
  obstacleMarkers = [];
  blockedEdges = [];
  recomputeBlockedEdges();
  redrawAllAdminRestrictions();
}

function redrawAllAdminRestrictions() {
  clearOperationLayers();
  map.eachLayer(function (layer) {
    if (
      (layer instanceof L.Polyline && layer.options.dashArray === "10,10" && (layer.options.color === "#f44336" || layer.options.color === "red")) ||
      (layer instanceof L.CircleMarker && (layer.options.adminLayerType === "blocked-edge-point" || layer.options.adminLayerType === "obstacle-point")) ||
      (layer instanceof L.Circle && layer.options.adminLayerType === "obstacle-radius")
    ) {
      map.removeLayer(layer);
    }
  });
  redrawBannedLines();
  obstacleMarkers.forEach((obs) => {
    drawObstacle(obs.center, obs.radius);
  });
  redrawOperations();
}

function populateLineSelect() {
  const select = document.getElementById("closeLineSelect");
  if (!select) return;
  const lines = [...new Set(nodes.map((node) => node.line).filter(Boolean))].sort();
  select.innerHTML = lines.map((line) => `<option value="${line}">${line}</option>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  populateLineSelect();
  updateOperationSummary();

  document.getElementById("closeStationBtn")?.addEventListener("click", () => {
    setOperationMode("station");
    showOperationPopup("<b>Đóng ga:</b> Click vào ga cần tạm ngừng khai thác.");
  });

  document.getElementById("closeLineBtn")?.addEventListener("click", closeSelectedLine);
  document.getElementById("restoreLastOperationBtn")?.addEventListener("click", restoreLastOperation);
  document.getElementById("restoreAllOperationsBtn")?.addEventListener("click", restoreAllOperations);
});
