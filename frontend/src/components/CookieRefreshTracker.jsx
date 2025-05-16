import { useState, useEffect } from "react";
import { get, post } from "../services/api";
import { 
  RefreshCcw, AlertCircle, Clock, Check, X, 
  Calendar, ChevronLeft, ChevronRight, Info,
  Cookie, ExternalLink, Activity, TrendingUp
} from "lucide-react";

const CookieRefreshTracker = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRefresh, setSelectedRefresh] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStats = async () => {
    try {
      const response = await get("/api/cookies/stats");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data.data); // Updated to match the API response structure
    } catch (err) {
      console.error("Error fetching cookie refresh stats:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to fetch cookie refresh stats: ${err.message}`
      });
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await get(`/api/cookies/history?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Update to match the actual API response structure
      if (data.success && data.data) {
        setHistory(data.data.refreshes || []);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setHistory([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching cookie refresh history:", err);
      setHistory([]);
      setStatusMessage({
        type: "error",
        text: `Failed to fetch cookie refresh history: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRefreshDetails = async (refreshId) => {
    if (!refreshId) return;
    
    try {
      const response = await get(`/api/cookies/${refreshId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSelectedRefresh(data);
      setShowDetails(true);
    } catch (err) {
      console.error("Error fetching refresh details:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to fetch refresh details: ${err.message}`
      });
    }
  };

  const triggerRefresh = async () => {
    try {
      setRefreshing(true);
      setStatusMessage({
        type: "info",
        text: "Triggering cookie refresh..."
      });

      const response = await post("/api/cookies/trigger", {});
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStatusMessage({
        type: "success",
        text: "Cookie refresh triggered successfully"
      });

      // Refresh data after a short delay
      setTimeout(() => {
        fetchStats();
        fetchHistory();
      }, 2000);
    } catch (err) {
      console.error("Error triggering cookie refresh:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to trigger cookie refresh: ${err.message}`
      });
    } finally {
      setRefreshing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHistory();

    // Refresh data every 60 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchHistory();
    }, 60000);

    return () => clearInterval(interval);
  }, [page]);

  // Format date with relative time if recent
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleString();
      }
    } catch (e) {
      return "Invalid date";
    }
  };

  // Format duration in a human-readable way
  const formatDuration = (ms) => {
    if (!ms) return "N/A";
    
    try {
      if (ms < 1000) {
        return `${ms}ms`;
      } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
      } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
      }
    } catch (e) {
      return "N/A";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success": return "text-green-600";
      case "failed": return "text-red-600";
      case "in_progress": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "success": return "bg-green-100";
      case "failed": return "bg-red-100";
      case "in_progress": return "bg-blue-100";
      default: return "bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success": return <Check className="w-4 h-4" />;
      case "failed": return <X className="w-4 h-4" />;
      case "in_progress": return <RefreshCcw className="w-4 h-4 animate-spin" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const filteredHistory = () => {
    if (statusFilter === "all") return history;
    return history.filter(item => item.status === statusFilter);
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <RefreshCcw className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-600">Loading cookie stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div 
          className={`p-4 rounded-lg shadow-md flex justify-between items-center ${
            statusMessage.type === "error" 
              ? "bg-red-50 text-red-700" 
              : statusMessage.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
          }`}
        >
          <p>{statusMessage.text}</p>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              stats?.inProgressCount > 0 
                ? "bg-blue-500 animate-pulse" 
                : (stats?.successCount / stats?.total) > 0.9 
                  ? "bg-green-500" 
                  : (stats?.successCount / stats?.total) > 0.7 
                    ? "bg-yellow-500" 
                    : "bg-red-500"
            }`}></div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">System Status</h2>
              <p className="text-sm text-gray-500">
                {stats?.inProgressCount > 0 
                  ? `${stats.inProgressCount} refresh${stats.inProgressCount !== 1 ? 'es' : ''} in progress` 
                  : (stats?.successCount / stats?.total) > 0.9 
                    ? "All systems operational" 
                    : (stats?.successCount / stats?.total) > 0.7 
                      ? "Minor issues detected" 
                      : "Critical issues detected"}
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            <button 
              onClick={() => {
                fetchStats();
                fetchHistory();
              }}
              className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700 flex items-center gap-1.5 hover:bg-gray-200"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Dashboard */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Cookie className="w-6 h-6" /> Cookie Health Monitor
            </h2>
            <p className="opacity-80 mt-1">Track and manage cookie refresh operations</p>
          </div>
          
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className={`mt-4 md:mt-0 px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
              refreshing 
                ? "bg-white/30 cursor-not-allowed" 
                : "bg-white/20 hover:bg-white/30 transition"
            }`}
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Force Refresh Now
          </button>
        </div>

        {/* Key Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
          {/* Stat 1: Total Cookies */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Cookies</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.total || 0}</h3>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Cookie className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-blue-500">{stats?.averageCookies || "0"}</span> cookies per refresh
            </p>
          </div>

          {/* Stat 2: Success Rate */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.successRate || "0%"}</h3>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-2 bg-green-500 rounded-full" 
                style={{ width: stats?.successRate || "0%" }}
              ></div>
            </div>
          </div>

          {/* Stat 3: Refresh Duration */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats?.averageDuration || "0s"}</h3>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-purple-500">
                {stats?.inProgressCount || 0} refreshes
              </span> in progress
            </p>
          </div>

          {/* Stat 4: Next Refresh */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Next Refresh</p>
                <h3 className="text-xl font-bold text-gray-800 mt-1">
                  {stats?.nextScheduledRefresh ? formatDate(stats.nextScheduledRefresh) : "N/A"}
                </h3>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            {stats?.latestRefresh && (
              <p className="mt-2 text-sm text-gray-500">
                Last: {formatDate(stats.latestRefresh.startTime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Success Rate Gauge */}
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-3">Success Rate</p>
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Background circle */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                
                {/* Progress circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="10"
                  strokeDasharray={`${parseFloat(stats?.successRate || "0") * 283} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{stats?.successRate || "0%"}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between w-full">
              <div className="text-center">
                <div className="text-sm font-medium text-green-500">{stats?.successCount || 0}</div>
                <div className="text-xs text-gray-500">Success</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-red-500">{stats?.failedCount || 0}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-blue-500">{stats?.inProgressCount || 0}</div>
                <div className="text-xs text-gray-500">In Progress</div>
              </div>
            </div>
          </div>

          {/* Cookie Generation Trend */}
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
            <p className="text-sm text-gray-500 mb-2">Cookie Generation Trend</p>
            
            <div className="flex-1 flex items-end gap-1">
              {history.slice(0, 10).reverse().map((refresh, index) => (
                <div 
                  key={index} 
                  className="flex-1 flex flex-col items-center"
                >
                  <div 
                    className={`w-full ${
                      refresh.status === "success" ? "bg-green-400" : 
                      refresh.status === "failed" ? "bg-red-400" : "bg-blue-400"
                    }`}
                    style={{ 
                      height: `${refresh.cookieCount ? Math.min(100, refresh.cookieCount) : 5}px`,
                      minHeight: "5px"
                    }}
                    title={`${refresh.cookieCount || 0} cookies`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{index + 1}</span>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 mt-2 text-center">Last 10 refreshes (newest first)</p>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Performance Metrics</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Average Duration</span>
                  <span className="text-xs font-medium">{stats?.averageDuration || "0s"}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-purple-500" 
                    style={{ width: "70%" }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Average Cookies</span>
                  <span className="text-xs font-medium">{stats?.averageCookies || "0"}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-blue-500" 
                    style={{ width: "85%" }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Failure Rate</span>
                  <span className="text-xs font-medium">{
                    stats?.failedCount && stats?.total 
                      ? `${((stats.failedCount / stats.total) * 100).toFixed(1)}%` 
                      : "0%"
                  }</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-red-500" 
                    style={{ 
                      width: stats?.failedCount && stats?.total 
                        ? `${(stats.failedCount / stats.total) * 100}%` 
                        : "0%" 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Refresh Details */}
      {stats?.latestRefresh && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Latest Refresh Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBgColor(stats.latestRefresh.status)} ${getStatusColor(stats.latestRefresh.status)}`}>
                  {getStatusIcon(stats.latestRefresh.status)}
                  <span className="ml-1">{stats.latestRefresh.status}</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">ID: {stats.latestRefresh.refreshId}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-xl font-bold text-gray-800">
                {formatDuration(stats.latestRefresh.duration)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Started {formatDate(stats.latestRefresh.startTime)}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Cookies Generated</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.latestRefresh.cookieCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Using proxy: {stats.latestRefresh.proxy || "None"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Refreshes Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h3 className="text-lg font-semibold text-gray-800">Recent Refreshes</h3>
            
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="statusFilter" className="text-sm text-gray-600">Status:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md py-1 px-2"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>
            
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-1 rounded ${
                      page === 1 
                        ? "text-gray-400 cursor-not-allowed" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`p-1 rounded ${
                      page === totalPages 
                        ? "text-gray-400 cursor-not-allowed" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredHistory().length === 0 ? (
          <div className="text-center py-12 px-6">
            <Cookie className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No refresh history</h3>
            <p className="text-gray-500">
              {statusFilter !== "all" 
                ? `No ${statusFilter} refreshes found` 
                : "Cookie refresh history will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cookies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory().map((refresh) => (
                  <tr 
                    key={refresh._id} 
                    className={`hover:bg-gray-50 transition-colors ${refresh.status === 'failed' ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBgColor(refresh.status)} ${getStatusColor(refresh.status)}`}>
                        {getStatusIcon(refresh.status)}
                        <span className="ml-1">{refresh.status}</span>
                      </span>
                      {refresh.errorMessage && (
                        <div className="mt-1 text-xs text-red-600 max-w-xs truncate" title={refresh.errorMessage}>
                          {refresh.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(refresh.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDuration(refresh.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {refresh.cookieCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchRefreshDetails(refresh._id)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refresh Details Modal */}
      {showDetails && selectedRefresh && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Refresh Details
              </h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {/* Modal content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Refresh Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className={`ml-2 ${getStatusColor(selectedRefresh.status)}`}>
                        {selectedRefresh.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Started:</span>
                      <span className="ml-2">{new Date(selectedRefresh.startTime).toLocaleString()}</span>
                    </div>
                    {selectedRefresh.completionTime && (
                      <div>
                        <span className="text-sm text-gray-500">Completed:</span>
                        <span className="ml-2">{new Date(selectedRefresh.completionTime).toLocaleString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-500">Duration:</span>
                      <span className="ml-2">{formatDuration(selectedRefresh.duration)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Cookies Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Cookies Generated:</span>
                      <span className="ml-2 font-medium">{selectedRefresh.cookieCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Retry Count:</span>
                      <span className="ml-2">{selectedRefresh.retryCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Proxy Used:</span>
                      <span className="ml-2">{selectedRefresh.proxy || "None"}</span>
                    </div>
                    {selectedRefresh.nextScheduledRefresh && (
                      <div>
                        <span className="text-sm text-gray-500">Next Refresh:</span>
                        <span className="ml-2">{new Date(selectedRefresh.nextScheduledRefresh).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedRefresh.error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Error Information
                  </h4>
                  <p className="text-red-700 text-sm whitespace-pre-wrap">
                    {selectedRefresh.error}
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieRefreshTracker; 