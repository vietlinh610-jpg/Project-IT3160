// Các biến toàn cục
let reset = false; // Biến reset, dùng để reset lại bản đồ
let isBlockMode = false; // Biến trạng thái vẽ đường cấm
let isDrawing = false; // Biến đang trong quá trình vẽ đường cấm
let algorithm = "Dijkstra"; // Biến trạng thái thuật toán tìm đường
let selectedPoints = []; // Danh sách các điểm được chọn
let blockedEdges = []; // Danh sách cạnh bị cấm
let startPoint = null; //
let temporaryLine = null; // Đường nối từ điểm cuối đến con trỏ chuột trong chế độ vẽ đường cấm
let points = []; // Điểm
let banPolyline = null; // Đường cấm tạm thời
let bannedLines = []; // Biến toàn cục để xác định chế độ đặt vật cản
let isPlacingObstacle = false; // Trạng thái đang đặt vật cản
let obstacleMarkers = []; // Các điểm đặt vật cản
let isAdmin = false; // Biến toàn cục để xác định chế độ Admin hay Guest
let showNodes = false; // Xem tất cả các node và edge
let showEdges = false;

let startPointMarker = null; // Để lưu marker/popup của điểm bắt đầu
let endPointMarker = null;   // Để lưu marker/popup của điểm kết thúc
// Xử lý tắc đường
let trafficLevel; // Biến toàn cục để xác định mức độ tắc đường
let trafficMarkers = []; // Biến toàn cục để lưu các marker tắc đường
let trafficPolyline = null; // Biến toàn cục để lưu polyline tắc đường
let isTrafficMode = false; // Biến toàn cục để xác định chế độ tắc đường
let trafficLine = [];
let trafficEdges = []; // Biến toàn cục để lưu các cạnh tắc đường

let floodLevel; // Biến toàn cục để xác định mức độ ngập
let floodMarkers = []; // Biến toàn cục để lưu các marker ngập
let floodPolyline = null; // Biến toàn cục để lưu polyline ngập
let isFloodMode = false; // Biến toàn cục để xác định chế độ ngập
let floodLine = [];
let floodEdges = []; // Biến toàn cục để lưu các cạnh ngập


let moscowBoundaryLatLngs = null;
let moscowGeoJsonFeature = null;
let isOneWayEdgeMode = false; // Thay cho isOneWayMode cũ, quản lý chế độ chọn cạnh
let oneWayEdges = [];         // Danh sách các cạnh một chiều [[sourceId, destId], ...]
let oneWayArrowDecorators = {}; // Lưu các layer mũi tên, key dạng "sourceId-destId"
let operationMode = null;
let closedStations = [];
let closedLines = [];
let operationHistory = [];
let operationLayers = [];

const ONE_WAY_ARROW_COLOR = 'purple'; // Màu cho mũi tên và đường một chiều
const ONE_WAY_CLICK_THRESHOLD_METERS = 20; // Ngưỡng khoảng cách (mét) để chọn cạnh khi click
let currentDebugDisplayLayers = [];
let guestPathPolyline = null;
