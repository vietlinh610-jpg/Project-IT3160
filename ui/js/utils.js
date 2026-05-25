function isPointInPolygon(point, polygonVertices) {
  if (!point || !polygonVertices || polygonVertices.length < 3) {
      return false;
  }

  var x = point.lng; // Kinh độ của điểm
  var y = point.lat; // Vĩ độ của điểm

  var inside = false;
  // lặp qua tất cả các cạnh của đa giác
  // j là đỉnh trước, i là đỉnh hiện tại
  for (var i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
      var xi = polygonVertices[i].lng; // Kinh độ của đỉnh i
      var yi = polygonVertices[i].lat; // Vĩ độ của đỉnh i
      var xj = polygonVertices[j].lng; // Kinh độ của đỉnh j (đỉnh trước đó)
      var yj = polygonVertices[j].lat; // Vĩ độ của đỉnh j (đỉnh trước đó)

      var intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) {
          inside = !inside;
      }
  }
  return inside;
}

/**
 * Cập nhật popup của marker với thông tin địa điểm từ Nominatim API.
 * Hiển thị tên ngắn gọn ban đầu, và cho phép người dùng click để xem chi tiết đầy đủ.
 * @param {L.Marker} marker 
 * @param {number} lat 
 * @param {number} lon 
 * @param {string} title 
 */

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function segmentsIntersect(p1, p2, q1, q2, epsilon) {
  function ccw(a, b, c) {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  }

  function pointSegmentDistance(p, a, b) {
    // Tính khoảng cách từ điểm p tới đoạn thẳng a-b
    let l2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]); // a==b
    let t =
      ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    let projection = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    return Math.hypot(p[0] - projection[0], p[1] - projection[1]);
  }

  function segmentsDistance(p1, p2, q1, q2) {
    // Khoảng cách nhỏ nhất giữa 2 đoạn thẳng
    return Math.min(
      pointSegmentDistance(p1, q1, q2),
      pointSegmentDistance(p2, q1, q2),
      pointSegmentDistance(q1, p1, p2),
      pointSegmentDistance(q2, p1, p2)
    );
  }

  let intersect =
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2);

  if (intersect) return true;

  let distance = segmentsDistance(p1, p2, q1, q2);
  return distance <= epsilon;
}


function getLatLngAtHalfDistance(latlngs) {
  if (!Array.isArray(latlngs) || latlngs.length < 2) return null;

  // Đảm bảo định dạng
  latlngs = latlngs.map(p => (p instanceof L.LatLng ? p : L.latLng(p)));

  let totalDistance = 0;
  const distances = [];

  for (let i = 0; i < latlngs.length - 1; i++) {
      const dist = latlngs[i].distanceTo(latlngs[i + 1]);
      distances.push(dist);
      totalDistance += dist;
  }

  const halfDistance = totalDistance / 2;
  let accumulated = 0;

  for (let i = 0; i < distances.length; i++) {
      if (accumulated + distances[i] >= halfDistance) {
          const ratio = (halfDistance - accumulated) / distances[i];
          const lat = latlngs[i].lat + ratio * (latlngs[i + 1].lat - latlngs[i].lat);
          const lng = latlngs[i].lng + ratio * (latlngs[i + 1].lng - latlngs[i].lng);
          return L.latLng(lat, lng);
      }
      accumulated += distances[i];
  }

  return latlngs[Math.floor(latlngs.length / 2)];
}


function distanceToLine(point, lineStart, lineEnd) {
  const x = point[0];
  const y = point[1];
  const x1 = lineStart[0];
  const y1 = lineStart[1];
  const x2 = lineEnd[0];
  const y2 = lineEnd[1];

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq != 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

function isEdgeNearLine(edgeStart, edgeEnd, lineStart, lineEnd, threshold) {
  const d1 = distanceToLine(edgeStart, lineStart, lineEnd);
  const d2 = distanceToLine(edgeEnd, lineStart, lineEnd);
  const d3 = distanceToLine(lineStart, edgeStart, edgeEnd);
  const d4 = distanceToLine(lineEnd, edgeStart, edgeEnd);
  return Math.min(d1, d2, d3, d4) < threshold;
}
