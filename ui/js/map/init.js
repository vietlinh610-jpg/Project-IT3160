async function loadMoscowBoundary() {
    try {
        const response = await fetch('data/moscow_boundary.geojson'); 
        if (!response.ok) {
            throw new Error(`Lỗi HTTP! Status: ${response.status}`);
        }
        const geojsonData = await response.json();

        if (geojsonData.features && geojsonData.features.length > 0) {
            const feature = geojsonData.features[0];
            moscowGeoJsonFeature = feature;

            if (feature.geometry) {
                let rawCoords;
                if (feature.geometry.type === 'Polygon') {
                    rawCoords = feature.geometry.coordinates[0]; 
                } else if (feature.geometry.type === 'MultiPolygon') {
                    rawCoords = feature.geometry.coordinates[0][0];
                    console.warn("Ranh giới Moscow là MultiPolygon. Hiện tại đang sử dụng đa giác đầu tiên. Hãy kiểm tra xem có phù hợp không.");
                } else {
                    console.error('Dữ liệu GeoJSON không phải là Polygon hoặc MultiPolygon.');
                    return;
                }
                moscowBoundaryLatLngs = rawCoords.map(coord => L.latLng(coord[1], coord[0]));
                console.log('Ranh giới Moscow Metro đã được tải và xử lý thành công.');
                L.polygon(moscowBoundaryLatLngs, {
                    color: 'purple',         // màu viền là tím
                    weight: 2,               // độ dày viền
                    fillOpacity: 0.04,        // độ trong suốt nền 
                    dashArray: '5, 5'        
                })
                .addTo(map);
            } else {
                console.error('Feature trong GeoJSON không có thông tin geometry.');
            }
        } else {
            console.error('File GeoJSON không hợp lệ hoặc không chứa features.');
        }
    } catch (error) {
        console.error('Không thể tải hoặc xử lý file ranh giới Moscow Metro:', error);
    }
}
// Khởi tạo bản đồ
const map = L.map("map").setView([55.7558, 37.6173], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

// Danh sách mã màu chính thức cho các tuyến tàu điện ngầm Moscow
