import React, { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Play, Square, Loader, ChevronLeft, ChevronRight, Calendar, Search, RefreshCcw, Filter, Radio, Wifi, WifiOff } from "lucide-react";
import { get, post } from "../services/api";

const EventList = ({ onEventSelect }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [runningEvents, setRunningEvents] = useState(new Set());
  const [broadcastEvents, setBroadcastEvents] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    field: "Last_Updated",
    direction: "desc",
  });
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scraperStatus, setScraperStatus] = useState({
    isRunning: false,
    successCount: 0,
    failedCount: 0,
  });
  const [statusMessage, setStatusMessage] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  // Truncate text function
  const truncateText = (text, maxLength = 20) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const toggleScraper = async () => {
    try {
      setStatusMessage({ type: "info", text: "Updating scraper status..." });
      const endpoint = scraperStatus.isRunning ? "stop" : "start";
      const res = await post(`/api/scraper/${endpoint}`, { action: endpoint });

      if (!res.ok) throw new Error("Failed to toggle scraper");

      setScraperStatus((prev) => ({
        ...prev,
        isRunning: !prev.isRunning,
      }));
      
      setStatusMessage({ 
        type: "success", 
        text: `Scraper ${scraperStatus.isRunning ? "stopped" : "started"} successfully` 
      });
      
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage({ type: "error", text: error.message });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const eventToggle = async (Event_ID) => {
    try {
      const isCurrentlyRunning = runningEvents.has(Event_ID);
      const action = isCurrentlyRunning ? "stop" : "start";

      const response = await post(`/api/events/${Event_ID}/${action}`);

      if (!response.ok)
        throw new Error(`Failed to ${action} event: ${response.statusText}`);

      setRunningEvents((prev) => {
        const newSet = new Set(prev);
        isCurrentlyRunning ? newSet.delete(Event_ID) : newSet.add(Event_ID);
        return newSet;
      });
    } catch (error) {
      console.error(`Error toggling event:`, error.message);
      setStatusMessage({ type: "error", text: error.message });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const fetchEvents = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const [eventsResponse, statsResponse] = await Promise.all([
        get(`/api/events`),
        get(`/api/stats`),
      ]);

      if (!eventsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const eventsData = await eventsResponse.json();
      const statsData = await statsResponse.json();
console.log(statsData)
      setEvents(eventsData.data);
      // Set active events
      const runData = eventsData.data
        .filter((item) => item.Skip_Scraping === false)
        .map((item) => item.Event_ID);
      setRunningEvents(new Set(runData));
      
      // Set broadcasting events
      const broadcastData = eventsData.data
        .filter((item) => item.isBroadcasting === true || item.Broadcast === true)
        .map((item) => item.Event_ID);
      setBroadcastEvents(new Set(broadcastData));
      
      setScraperStatus(statsData.data.scraperStatus);
      setError(null);
      
      if (showRefreshing) {
        setStatusMessage({ type: "success", text: "Data refreshed successfully" });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      if (showRefreshing) {
        setStatusMessage({ type: "error", text: `Error refreshing data: ${err.message}` });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEvents(true);
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (field) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortEvents = (eventsToSort) => {
    return [...eventsToSort].sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      if (
        sortConfig.field === "Event_DateTime" ||
        sortConfig.field === "Last_Updated"
      ) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const filterEvents = (eventsToFilter) => {
    // First filter by date if specified
    let filtered = eventsToFilter;
    
    if (filterDate) {
      const filterTimestamp = new Date(filterDate).getTime();
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.Event_DateTime);
        return eventDate.toDateString() === new Date(filterTimestamp).toDateString();
      });
    }
    
    // Then filter by search term if specified
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.Event_Name?.toLowerCase().includes(term) ||
        event.Venue?.toLowerCase().includes(term) ||
        event.Event_ID?.toLowerCase().includes(term) ||
        event.mapping_id?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  };

  // Memoized and paginated events
  const sortedAndFilteredEvents = useMemo(() => {
    const filtered = filterEvents(sortEvents(events));

    // Reset to first page when filters change
    if (filtered.length > 0 && Math.ceil(filtered.length / eventsPerPage) < currentPage) {
      setCurrentPage(1);
    }

    // Pagination logic
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    return filtered.slice(indexOfFirstEvent, indexOfLastEvent);
  }, [events, sortConfig, filterDate, searchTerm, currentPage]);

  // Pagination handlers
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const totalPages = Math.ceil(filterEvents(sortEvents(events)).length / eventsPerPage);

  const StatusButton = ({ event }) => {
    const isEventRunning = runningEvents.has(event);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      await eventToggle(event);
      setIsLoading(false);
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-sm ${
          isEventRunning
            ? "bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md"
            : "bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md"
        }`}
      >
        {isLoading ? (
          <Loader className="w-3 h-3 animate-spin" />
        ) : isEventRunning ? (
          <>
            <Square className="w-3 h-3" />
            Stop
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Start
          </>
        )}
      </button>
    );
  };

  // Add a toggle broadcast function
  const toggleBroadcast = async (eventId) => {
    try {
      const isCurrentlyBroadcasting = broadcastEvents.has(eventId);
      const action = isCurrentlyBroadcasting ? "stop" : "start";

      const response = await post(`/api/events/${eventId}/broadcast/${action}`);

      if (!response.ok)
        throw new Error(`Failed to ${action} broadcast: ${response.statusText}`);

      setBroadcastEvents((prev) => {
        const newSet = new Set(prev);
        isCurrentlyBroadcasting ? newSet.delete(eventId) : newSet.add(eventId);
        return newSet;
      });

      // Update the event in the events array
      setEvents(prev => prev.map(event => {
        if (event.Event_ID === eventId) {
          return {
            ...event,
            isBroadcasting: !isCurrentlyBroadcasting
          };
        }
        return event;
      }));
      
      setStatusMessage({ 
        type: "success", 
        text: `Broadcasting for event ${isCurrentlyBroadcasting ? "stopped" : "started"} successfully` 
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(`Error toggling broadcast:`, error.message);
      setStatusMessage({ type: "error", text: error.message });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const BroadcastButton = ({ event }) => {
    const isEventBroadcasting = broadcastEvents.has(event);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      await toggleBroadcast(event);
      setIsLoading(false);
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-sm ${
          isEventBroadcasting
            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
        }`}
        title={isEventBroadcasting ? "Stop Broadcasting" : "Start Broadcasting"}
      >
        {isLoading ? (
          <Loader className="w-3 h-3 animate-spin" />
        ) : isEventBroadcasting ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Broadcasting</span>
            <span className="inline sm:hidden">Broad</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Broadcast</span>
            <span className="inline sm:hidden">Broad</span>
          </>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-600">Loading events...</p>
      </div>
    );
  }

  if (error && !refreshing) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <div className="flex flex-col">
          <h3 className="text-red-800 font-medium mb-2">Error loading events</h3>
          <p className="text-sm text-red-700 mb-4">
            {error}
          </p>
          <button 
            onClick={handleRefresh}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 self-start flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
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

      {/* Header Section - Responsive */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Events Dashboard
          </h1>
          <div className="flex flex-wrap gap-3 items-center mt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active: {runningEvents.size}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Broadcasting: {broadcastEvents.size}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Success: {scraperStatus.successCount}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Failed: {scraperStatus.failedCount}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                scraperStatus.isRunning
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              Scraper: {scraperStatus.isRunning ? "Running" : "Stopped"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Refresh data"
          >
            <RefreshCcw
              className={`w-5 h-5 text-gray-600 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>

          <button
            onClick={toggleScraper}
            className={`px-4 py-2 rounded-lg text-sm text-white shadow-sm hover:shadow transition-all ${
              scraperStatus.isRunning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {scraperStatus.isRunning ? "Stop Scraper" : "Start Scraper"}
          </button>
        </div>
      </div>

      {/* Events Table - Responsive */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No events found</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        ) : filterEvents(sortEvents(events)).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">No events match your filters</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2"
                >
                  Clear Search
                </button>
              )}
              {filterDate && (
                <button
                  onClick={() => setFilterDate("")}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2"
                >
                  Clear Date Filter
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { label: "Event Name", field: "Event_Name" },
                      { label: "Date", field: "Event_DateTime" },
                      { label: "Seats", field: "Available_Seats" },
                      {
                        label: "Price Increase",
                        field: "priceIncreasePercentage",
                      },
                      { label: "Mapping ID", field: "mapping_id" },
                      { label: "Last Updated", field: "Last_Updated" },
                      { label: "Venue", field: "Venue" },
                      { label: "Type", field: null },
                      { label: "Status", field: null },
                      { label: "Broadcast", field: null },
                      { label: "Actions", field: null },
                    ].map((header) => (
                      <th
                        key={header.label}
                        className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          header.field ? "cursor-pointer hover:bg-gray-100" : ""
                        }`}
                        onClick={
                          header.field
                            ? () => handleSort(header.field)
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          {header.label}
                          {header.field &&
                            sortConfig.field === header.field && (
                              <span className="text-gray-400">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAndFilteredEvents.map((event) => (
                    <tr
                      key={event._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div
                          className="font-medium text-gray-900 tooltip"
                          title={event.Event_Name}
                        >
                          {truncateText(event.Event_Name, 15)}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                        {new Date(event.Event_DateTime).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600">
                            {event.Available_Seats}
                          </span>
                          {event.metadata?.ticketStats?.ticketCountChange !==
                            undefined && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                event.metadata.ticketStats.ticketCountChange > 0
                                  ? "bg-green-100 text-green-800"
                                  : event.metadata.ticketStats
                                      .ticketCountChange < 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {event.metadata.ticketStats.ticketCountChange > 0
                                ? "+"
                                : ""}
                              {event.metadata.ticketStats.ticketCountChange}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.priceIncreasePercentage > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {event.priceIncreasePercentage > 0 ? "+" : ""}
                          {event.priceIncreasePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div
                          className="font-mono text-xs text-gray-500 tooltip"
                          title={event.mapping_id || "No mapping ID"}
                        >
                          {event.mapping_id
                            ? truncateText(event.mapping_id, 8)
                            : "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                        {new Date(event.Last_Updated).toLocaleString()}
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 tooltip"
                        title={event.Venue}
                      >
                        {truncateText(event.Venue, 10)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div className="flex space-x-1">
                          {event.Instant_Download && (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800 tooltip"
                              title="Instant Download"
                            >
                              DL
                            </span>
                          )}
                          {event.Instant_Transfer && (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 tooltip"
                              title="Instant Transfer"
                            >
                              TR
                            </span>
                          )}
                          {event.E_Ticket && (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-800 tooltip"
                              title="E-Ticket"
                            >
                              ET
                            </span>
                          )}
                          {event.Skip_Scraping && (
                            <span
                              className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-800 tooltip"
                              title="Scraping Disabled"
                            >
                              SD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusButton event={event.Event_ID} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <BroadcastButton event={event.Event_ID} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <NavLink to={`/events/${event.Event_ID}`}>
                          <button className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1.5 rounded hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all">
                            View →
                          </button>
                        </NavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * eventsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      currentPage * eventsPerPage,
                      filterEvents(sortEvents(events)).length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {filterEvents(sortEvents(events)).length}
                  </span>{" "}
                  events
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Only show a few pages with ellipsis for better UI */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        // Show first page, last page, current page, and pages around current
                        let pageToShow;

                        if (totalPages <= 5) {
                          // Less than 5 pages, show all
                          pageToShow = i + 1;
                        } else if (currentPage <= 3) {
                          // Near start, show 1-4 plus last
                          if (i < 4) {
                            pageToShow = i + 1;
                          } else {
                            pageToShow = totalPages;
                          }
                        } else if (currentPage >= totalPages - 2) {
                          // Near end
                          if (i === 0) {
                            pageToShow = 1;
                          } else {
                            pageToShow = totalPages - (4 - i);
                          }
                        } else {
                          // Middle case
                          if (i === 0) {
                            pageToShow = 1;
                          } else if (i === 4) {
                            pageToShow = totalPages;
                          } else {
                            pageToShow = currentPage + (i - 2);
                          }
                        }

                        // Add ellipsis
                        if (
                          (i === 1 && pageToShow !== 2) ||
                          (i === 3 && pageToShow !== totalPages - 1)
                        ) {
                          return (
                            <span
                              key={`ellipsis-${i}`}
                              className="px-3 py-1 text-gray-500"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={pageToShow}
                            onClick={() => paginate(pageToShow)}
                            className={`px-3 py-1 rounded ${
                              currentPage === pageToShow
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {pageToShow}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventList;

// Add CSS for tooltips
const style = document.createElement('style');
style.textContent = `
  .tooltip {
    position: relative;
  }
  .tooltip:hover::after {
    content: attr(title);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;
  }
`;
document.head.appendChild(style);
