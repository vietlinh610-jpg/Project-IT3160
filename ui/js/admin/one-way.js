function distToSegmentSquared(clickLat, clickLon, lat1, lon1, lat2, lon2) {
    const l2 = (lat1 - lat2) * (lat1 - lat2) + (lon1 - lon2) * (lon1 - lon2);
    if (l2 === 0) { // p1 và p2 trùng nhau
        const distSq = (clickLat - lat1) * (clickLat - lat1) + (clickLon - lon1) * (clickLon - lon1);
        return { distanceSquared: distSq, closestPoint: { lat: lat1, lon: lon1 } };
    }


    let t = ((clickLat - lat1) * (lat2 - lat1) + (clickLon - lon1) * (lon2 - lon1)) / l2;

    let closestLat, closestLon;

    if (t < 0) { // Điểm chiếu nằm ngoài đoạn thẳng, về phía p1
        closestLat = lat1;
        closestLon = lon1;
    } else if (t > 1) { // Điểm chiếu nằm ngoài đoạn thẳng, về phía p2
        closestLat = lat2;
        closestLon = lon2;
    } else { // Điểm chiếu nằm trên đoạn thẳng p1p2
        closestLat = lat1 + t * (lat2 - lat1);
        closestLon = lon1 + t * (lon2 - lon1);
    }

    const dx = clickLat - closestLat;
    const dy = clickLon - closestLon;
    return {
        distanceSquared: dx * dx + dy * dy,
        closestPoint: { lat: closestLat, lon: closestLon }
    };
}

function findClosestEdgeToPoint(clickLatlng) {
    let closestEdge = null;
    let minDistanceSquared = Infinity; // Sẽ làm việc với bình phương khoảng cách để tránh Math.sqrt


    if (!adj_list_with_weights || !nodes) {
        console.error("LỖI: adj_list_with_weights hoặc nodes chưa được tải.");
        return null;
    }
    if (nodes.length === 0 || adj_list_with_weights.length === 0) {
        console.error("LỖI: Dữ liệu nodes hoặc adj_list_with_weights rỗng!");
        return null;
    }
    // Kiểm tra clickLatlng
    if (!clickLatlng || typeof clickLatlng.lat !== 'number' || typeof clickLatlng.lng !== 'number' || isNaN(clickLatlng.lat) || isNaN(clickLatlng.lng)) {
        console.error("LỖI: clickLatlng không hợp lệ:", clickLatlng);
        return null;
    }
    const cLat = clickLatlng.lat;
    const cLon = clickLatlng.lng;


    adj_list_with_weights.forEach((u_node_info, indexU) => {
        const nodeU = nodes.find(n => n.node_id === u_node_info.node_id);
        if (!nodeU) return;

        const uLat = parseFloat(nodeU.lat);
        const uLon = parseFloat(nodeU.lon);
        if (isNaN(uLat) || isNaN(uLon)) {
            console.warn(`Node U ${nodeU.node_id}: Dữ liệu lat/lon gốc hoặc sau parseFloat là NaN. Gốc: lat=${nodeU.lat}, lon=${nodeU.lon}`);
            return;
        }

        if (!u_node_info.neighbors || u_node_info.neighbors.length === 0) return;

        u_node_info.neighbors.forEach((v_neighbor, indexV) => {
            const nodeV = nodes.find(n => n.node_id === v_neighbor.node_neighbor);
            if (!nodeV) return;

            const vLat = parseFloat(nodeV.lat);
            const vLon = parseFloat(nodeV.lon);
            if (isNaN(vLat) || isNaN(vLon)) {
                console.warn(`Node V ${nodeV.node_id}: Dữ liệu lat/lon gốc hoặc sau parseFloat là NaN. Gốc: lat=${nodeV.lat}, lon=${nodeV.lon}`);
                return;
            }

            const segmentInfo = distToSegmentSquared(cLat, cLon, uLat, uLon, vLat, vLon);
            const currentDistSq = segmentInfo.distanceSquared;
            if (currentDistSq < minDistanceSquared) {
                minDistanceSquared = currentDistSq;
                closestEdge = {
                    u: nodeU,
                    v: nodeV,
                };
            }
        });
    });

    console.log("Kết quả findClosestEdgeToPoint (tự tính): Cạnh gần nhất:", closestEdge ? `${closestEdge.u.node_id}-${closestEdge.v.node_id}` : null, "Bình phương khoảng cách nhỏ nhất:", minDistanceSquared === Infinity ? "Infinity" : minDistanceSquared.toFixed(8));

    if (closestEdge) { 

        const clickPointLatLng = L.latLng(cLat, cLon);
        let actualDistanceToEdgeMeters = Infinity;

        if (closestEdge.u && closestEdge.v) { 
            const closestPtOnSeg = distToSegmentSquared(cLat, cLon, parseFloat(closestEdge.u.lat), parseFloat(closestEdge.u.lon), parseFloat(closestEdge.v.lat), parseFloat(closestEdge.v.lon)).closestPoint;
            actualDistanceToEdgeMeters = getDistance(cLat, cLon, closestPtOnSeg.lat, closestPtOnSeg.lon);
            console.log(`Khoảng cách thực tế (tính bằng getDistance) tới cạnh ${closestEdge.u.node_id}-${closestEdge.v.node_id} là: ${actualDistanceToEdgeMeters.toFixed(2)}m`);
        }


        if (actualDistanceToEdgeMeters < ONE_WAY_CLICK_THRESHOLD_METERS) {
            console.log(`Tìm thấy cạnh ${closestEdge.u.node_id}-${closestEdge.v.node_id} trong ngưỡng (${ONE_WAY_CLICK_THRESHOLD_METERS}m).`);
            return closestEdge;
        } else {
            console.log(`Cạnh gần nhất ${closestEdge.u.node_id}-${closestEdge.v.node_id} (${actualDistanceToEdgeMeters.toFixed(2)}m) không nằm trong ngưỡng (${ONE_WAY_CLICK_THRESHOLD_METERS}m).`);
            return null;
        }
    }

    console.log("Không tìm thấy cạnh nào (có thể do không có cạnh hoặc không trong ngưỡng).");
    return null;
}

function addOneWayArrow(sourceNodeId, destNodeId) {
    const sourceNode = nodes.find(n => n.node_id === sourceNodeId);
    const destNode = nodes.find(n => n.node_id === destNodeId);

    // Tạo một key duy nhất cho cả đường polyline, các marker và decorator của hướng này
    const key = `${sourceNodeId}-${destNodeId}`;

    // Xóa các thành phần cũ nếu có (tránh trùng lặp)
    if (oneWayArrowDecorators[key]) {
        if (oneWayArrowDecorators[key].polyline) {
            map.removeLayer(oneWayArrowDecorators[key].polyline);
        }
        if (oneWayArrowDecorators[key].decorator) {
            map.removeLayer(oneWayArrowDecorators[key].decorator);
        }
        if (oneWayArrowDecorators[key].sourceMarker) {
            map.removeLayer(oneWayArrowDecorators[key].sourceMarker);
        }
        if (oneWayArrowDecorators[key].destMarker) {
            map.removeLayer(oneWayArrowDecorators[key].destMarker);
        }
        delete oneWayArrowDecorators[key]; // Xóa entry cũ
    }

    if (sourceNode && destNode) {
        // Đảm bảo tọa độ là số (quan trọng!)
        const sLat = parseFloat(sourceNode.lat);
        const sLon = parseFloat(sourceNode.lon);
        const dLat = parseFloat(destNode.lat);
        const dLon = parseFloat(destNode.lon);

        if (isNaN(sLat) || isNaN(sLon) || isNaN(dLat) || isNaN(dLon)) {
            console.error(`Tọa độ không hợp lệ cho node ${sourceNodeId} hoặc ${destNodeId}. Không thể vẽ đường một chiều.`);
            return;
        }

        const latlngs = [[sLat, sLon], [dLat, dLon]];
        
        // 1. Vẽ Markers cho Node Đầu và Cuối
        const sourceMarker = L.circleMarker([sLat, sLon], {
            radius: 4, // Kích thước marker
            fillColor: ONE_WAY_ARROW_COLOR,
            color: "#fff", // Màu viền marker
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        const destMarker = L.circleMarker([dLat, dLon], {
            radius: 4,
            fillColor: ONE_WAY_ARROW_COLOR,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        // 2. Polyline cơ sở to hơn
        const polyline = L.polyline(latlngs, {
            color: ONE_WAY_ARROW_COLOR,
            weight: 3, // Độ dày của đường to hơn
            opacity: 0.7
        }).addTo(map);

        // 3. Nhiều mũi tên hơn
        const arrowDecorator = L.polylineDecorator(latlngs, {
            patterns: [
                {
                    offset: 20,       // Bắt đầu vẽ mũi tên đầu tiên sau 20px từ điểm bắt đầu
                    repeat: '20px',  // Lặp lại mũi tên mỗi 80px
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 15,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            color: ONE_WAY_ARROW_COLOR,
                            weight: 2, // Giữ nguyên độ dày của mũi tên hoặc điều chỉnh nếu muốn
                            opacity: 1,
                            fillOpacity: 1
                        }
                    })
                }
            ]
        }).addTo(map);
        
        // Lưu tất cả các layer liên quan để có thể xóa chúng sau này
        oneWayArrowDecorators[key] = {
            polyline: polyline,
            decorator: arrowDecorator,
            sourceMarker: sourceMarker,
            destMarker: destMarker
        };
    } else {
        console.warn(`Không tìm thấy sourceNode (ID: ${sourceNodeId}) hoặc destNode (ID: ${destNodeId}) để vẽ đường một chiều.`);
    }
}


function removeOneWayArrow(nodeId1, nodeId2) {
    // Xóa cho hướng nodeId1 -> nodeId2
    const key1 = `${nodeId1}-${nodeId2}`;
    if (oneWayArrowDecorators[key1]) {
        if (oneWayArrowDecorators[key1].polyline) map.removeLayer(oneWayArrowDecorators[key1].polyline);
        if (oneWayArrowDecorators[key1].decorator) map.removeLayer(oneWayArrowDecorators[key1].decorator);
        if (oneWayArrowDecorators[key1].sourceMarker) map.removeLayer(oneWayArrowDecorators[key1].sourceMarker);
        if (oneWayArrowDecorators[key1].destMarker) map.removeLayer(oneWayArrowDecorators[key1].destMarker);
        delete oneWayArrowDecorators[key1];
    }

    // Xóa cho hướng nodeId2 -> nodeId1 (nếu có)
    const key2 = `${nodeId2}-${nodeId1}`;
    if (oneWayArrowDecorators[key2]) {
        if (oneWayArrowDecorators[key2].polyline) map.removeLayer(oneWayArrowDecorators[key2].polyline);
        if (oneWayArrowDecorators[key2].decorator) map.removeLayer(oneWayArrowDecorators[key2].decorator);
        if (oneWayArrowDecorators[key2].sourceMarker) map.removeLayer(oneWayArrowDecorators[key2].sourceMarker);
        if (oneWayArrowDecorators[key2].destMarker) map.removeLayer(oneWayArrowDecorators[key2].destMarker);
        delete oneWayArrowDecorators[key2];
    }
}

function redrawAllOneWayArrows() {
    // Xóa tất cả các đối tượng trang trí (bao gồm polyline, decorator, markers) cũ trên bản đồ
    for (const key in oneWayArrowDecorators) {
        if (oneWayArrowDecorators.hasOwnProperty(key)) {
            const layers = oneWayArrowDecorators[key];
            if (layers.polyline) map.removeLayer(layers.polyline);
            if (layers.decorator) map.removeLayer(layers.decorator);
            if (layers.sourceMarker) map.removeLayer(layers.sourceMarker);
            if (layers.destMarker) map.removeLayer(layers.destMarker);
        }
    }
    oneWayArrowDecorators = {}; // Reset object lưu trữ

    // Vẽ lại mũi tên (và các thành phần khác) dựa trên oneWayEdges hiện tại
    oneWayEdges.forEach(edge => {
        if (edge && edge.length === 2) { // Thêm kiểm tra cho edge
            addOneWayArrow(edge[0], edge[1]);
        } else {
            console.warn("Edge không hợp lệ trong oneWayEdges:", edge);
        }
    });
}

// Đảm bảo các hàm này có thể truy cập toàn cục nếu gọi từ HTML trong popup
window.setOneWayDirection = function(sourceNodeId, destNodeId, edgeNodeUId, edgeNodeVId) {
    // 1. Xóa mọi thiết lập một chiều cũ cho cạnh vật lý này (cả 2 chiều)
    oneWayEdges = oneWayEdges.filter(edge =>
        !((edge[0] === edgeNodeUId && edge[1] === edgeNodeVId) || (edge[0] === edgeNodeVId && edge[1] === edgeNodeUId))
    );
    removeOneWayArrow(edgeNodeUId, edgeNodeVId); // Hàm này xóa cả 2 chiều có thể của mũi tên cũ

    // 2. Thêm hướng mới đã chọn
    oneWayEdges.push([sourceNodeId, destNodeId]);
    console.log(`Đã đặt đường một chiều: ${sourceNodeId} -> ${destNodeId}`);
    addOneWayArrow(sourceNodeId, destNodeId); // Vẽ mũi tên cho hướng mới

    map.closePopup(); // Đóng popup
}

window.clearOneWaySetting = function(nodeId1, nodeId2) {
    oneWayEdges = oneWayEdges.filter(edge =>
        !((edge[0] === nodeId1 && edge[1] === nodeId2) || (edge[0] === nodeId2 && edge[1] === nodeId1))
    );
    removeOneWayArrow(nodeId1, nodeId2); // Hàm này xóa cả 2 chiều

    console.log(`Đã xóa cài đặt đường một chiều cho cạnh ${nodeId1} - ${nodeId2}`);
    map.closePopup();
}

function handleOneWayEdgeModeClick(clickEvent) {
    const clickLatlng = clickEvent.latlng;
    const selectedEdge = findClosestEdgeToPoint(clickLatlng);

    if (selectedEdge) {
        const { u, v } = selectedEdge; // u và v là các object node từ findClosestEdgeToPoint

        // Đảm bảo u và v có node_id hợp lệ
        if (!u || typeof u.node_id === 'undefined' || !v || typeof v.node_id === 'undefined') {
            console.error("Node u hoặc v không hợp lệ từ selectedEdge:", selectedEdge);
            return;
        }

        if (!isPhysicallyTwoWayEdge(u.node_id, v.node_id)) {
            map.closePopup(); // Đóng các popup khác trước khi hiển thị thông báo này

            const popupLocation = clickLatlng; 

            L.popup({
                    className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', // Sử dụng các class đã style
                    autoClose: true, // Cho phép tự đóng khi mở popup khác hoặc click map
                    closeOnClick: true // Đóng khi click map
                })
                .setLatLng(popupLocation)
                .setContent("<b>Thông báo:</b> Đây là đường 1 chiều mặc định. Vui lòng chọn đường 2 chiều khác để chuyển thành đường 1 chiều!")
                .openOn(map);
            return; // Dừng xử lý tiếp
        }
        const isUtoV_userSet = oneWayEdges.some(e => e[0] === u.node_id && e[1] === v.node_id);
        const isVtoU_userSet = oneWayEdges.some(e => e[0] === v.node_id && e[1] === u.node_id);

        let currentDirectionText = "Hiện tại: Đường hai chiều.";
        let nextSourceNodeId, nextDestNodeId;
        let buttonActionText;

        // Quy ước "Hướng 1" là từ u sang v (theo thứ tự selectedEdge trả về)
        // và "Hướng 2" là từ v sang u.
        const Hướng1_Source = u.node_id;
        const Hướng1_Dest = v.node_id;
        const Hướng2_Source = v.node_id;
        const Hướng2_Dest = u.node_id;

        if (isUtoV_userSet) {
            // Hiện tại là Hướng 1 (U -> V), nút sẽ đổi sang Hướng 2 (V -> U)
            currentDirectionText = `Hiện tại: Một chiều`;
            nextSourceNodeId = Hướng2_Source;
            nextDestNodeId = Hướng2_Dest;
            buttonActionText = `Đổi chiều`;
        } else if (isVtoU_userSet) {
            // Hiện tại là Hướng 2 (V -> U), nút sẽ đổi sang Hướng 1 (U -> V)
            currentDirectionText = `Hiện tại: Một chiều`;
            nextSourceNodeId = Hướng1_Source;
            nextDestNodeId = Hướng1_Dest;
            buttonActionText = `Đổi chiều`;
        } else {
            // Chưa đặt, nút sẽ đặt chiều mặc định là Hướng 1 (U -> V)
            currentDirectionText = "Hiện tại: Đường hai chiều."; // Hoặc "Sẵn sàng đặt một chiều."
            nextSourceNodeId = Hướng1_Source;
            nextDestNodeId = Hướng1_Dest;
            buttonActionText = `Đặt một chiều`;
        }

        let popupContent = `
            <div class="custom-leaflet-popup">
                <h5>Điều chỉnh hướng cho đoạn đường</h5>
                <small class="popup-status">${currentDirectionText}</small>
                <hr class="popup-hr">
                <button class="btn btn-primary btn-popup" onclick="setOneWayDirection(${nextSourceNodeId}, ${nextDestNodeId}, ${u.node_id}, ${v.node_id})">
                    ${buttonActionText}
                </button>
        `;

        if (isUtoV_userSet || isVtoU_userSet) {
            popupContent += `
                <button class="btn btn-danger btn-popup" style="margin-top: 8px;" onclick="clearOneWaySetting(${u.node_id}, ${v.node_id})">
                    Xóa một chiều
                </button>`;
        }
        popupContent += `</div>`;

        const uLat = parseFloat(u.lat);
        const uLon = parseFloat(u.lon);
        const vLat = parseFloat(v.lat);
        const vLon = parseFloat(v.lon);

        if (isNaN(uLat) || isNaN(uLon) || isNaN(vLat) || isNaN(vLon)) {
            console.error("Tọa độ của node u hoặc v không hợp lệ để tính điểm giữa cho popup.");
            return;
        }

        const midPoint = L.latLng((uLat + vLat) / 2, (uLon + vLon) / 2);

        L.popup({ className: 'synced-leaflet-popup' })
            .setLatLng(midPoint)
            .setContent(popupContent)
            .openOn(map);

    } else {

    }
}


document.getElementById("toggleOneWayEdgeModeBtn").addEventListener("click", function () {

    isOneWayEdgeMode = !isOneWayEdgeMode;

    // Tắt các chế độ vẽ khác nếu có
    if (isOneWayEdgeMode) {
        isBlockMode = false; 
        isDrawing = false;
        isPlacingObstacle = false;
        isTrafficMode = false;
        isFloodMode = false;

        map.closePopup(); // Đóng các popup khác nếu có
        // Lấy vị trí trung tâm của bản đồ để hiển thị popup
        const mapCenter = map.getCenter();
        L.popup({
                className: 'info-leaflet-popup synced-leaflet-popup compact-point-popup', // Sử dụng các class đã style
                autoClose: true,
                closeOnClick: true
            })
            .setLatLng(mapCenter) // Hiển thị popup ở giữa màn hình bản đồ
            .setContent("<b>Hướng dẫn:</b> Click vào bản đồ để chọn đường.<br>Nhấn phím <b>ESC</b> để hoàn thành hoặc hủy chế độ.")
            .openOn(map);
          
        setTimeout(() => {
            map.closePopup(); // Đóng popup cụ thể này hoặc tất cả
        }, 5000); // Đóng sau 5 giây        this.textContent = "Tắt chế độ Đường 1 chiều";
        this.classList.add("btn-danger");
        this.classList.remove("btn-info");
        map.getContainer().style.cursor = 'pointer'; // Đổi con trỏ chuột
    } else {
        this.textContent = "Đường 1 chiều";
        this.classList.remove("btn-danger");
        this.classList.add("btn-info");
        map.getContainer().style.cursor = ''; // Trả lại con trỏ chuột mặc định
    }
});

// Hàm vẽ lại tất cả các mũi tên (gọi khi cần, ví dụ sau khi reset guest)
function redrawAllOneWayArrows() {
    // Xóa tất cả mũi tên cũ trên bản đồ
    for (const key in oneWayArrowDecorators) {
        if (oneWayArrowDecorators.hasOwnProperty(key) && oneWayArrowDecorators[key]) {
            map.removeLayer(oneWayArrowDecorators[key]);
        }
    }
    oneWayArrowDecorators = {}; // Reset object lưu trữ

    // Vẽ lại mũi tên dựa trên oneWayEdges hiện tại
    oneWayEdges.forEach(edge => {
        addOneWayArrow(edge[0], edge[1]);
    });
}

function isPhysicallyTwoWayEdge(nodeId1, nodeId2) {
    if (!adj_list_with_weights) {
        console.error("adj_list_with_weights chưa được tải để kiểm tra isPhysicallyTwoWayEdge");
        return false; // Hoặc một giá trị mặc định khác tùy logic của bạn
    }

    let uConnectsToV = false;
    let vConnectsToU = false;

    // Kiểm tra nodeId1 -> nodeId2
    const node1Info = adj_list_with_weights.find(item => item.node_id === nodeId1);
    if (node1Info && node1Info.neighbors) {
        if (node1Info.neighbors.some(neighbor => neighbor.node_neighbor === nodeId2)) {
            uConnectsToV = true;
        }
    }

    // Kiểm tra nodeId2 -> nodeId1
    const node2Info = adj_list_with_weights.find(item => item.node_id === nodeId2);
    if (node2Info && node2Info.neighbors) {
        if (node2Info.neighbors.some(neighbor => neighbor.node_neighbor === nodeId1)) {
            vConnectsToU = true;
        }
    }
    // console.log(`Kiểm tra hai chiều <span class="math-inline">\{nodeId1\}\-</span>{nodeId2}: <span class="math-inline">\{nodeId1\}\-\></span>{nodeId2} is ${uConnectsToV}, <span class="math-inline">\{nodeId2\}\-\></span>{nodeId1} is ${vConnectsToU}`);
    return uConnectsToV && vConnectsToU;
}
