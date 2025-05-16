import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../services/api";
import { RefreshCcw } from "lucide-react";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // Track expanded row
  const [ticketChanges, setTicketChanges] = useState([]);

  // Helper function to safely extract stats data
  const getStatValue = (key, defaultValue = 0) => {
    if (!event) return defaultValue;
    
    // Check direct properties first
    if (event[key] !== undefined) return event[key];
    
    // Check metadata properties
    if (event.metadata && event.metadata[key] !== undefined) return event.metadata[key];
    
    // Check for nested properties in ticketStats
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      
      // Check in root level
      if (event[parent] && event[parent][child] !== undefined) return event[parent][child];
      
      // Check in metadata
      if (event.metadata && event.metadata[parent] && event.metadata[parent][child] !== undefined) {
        return event.metadata[parent][child];
      }
    }
    
    return defaultValue;
  };

  const fetchTicketChanges = async () => {
    try {
      const response = await get(`/api/tickets/changes?eventId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch ticket changes");
      const { data } = await response.json();
      setTicketChanges(data);
    } catch (err) {
      console.error("Error fetching ticket changes:", err);
    }
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await get(`/api/events/${id}`);
      if (!response.ok) throw new Error("Failed to fetch event details");
      const data = await response.json();
      console.log("Event data:", data.data);
      console.log("Event metadata:", data.data.metadata); // More specific debug logging
      setEvent(data.data);

      // Fetch error logs
      const errorResponse = await get(`/api/events/${id}/errors`);
      if (errorResponse.ok) {
        const errorData = await errorResponse.json();
        setErrorLogs(errorData.data);
      }

      // Fetch ticket changes
      await fetchTicketChanges();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await del(`/api/events/${id}`);

      if (!response.ok) throw new Error("Failed to delete event");

      setStatusMessage({ type: "success", text: "Event deleted successfully" });
      setTimeout(() => navigate("/events"), 1500);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch(`/api/events/${id}/inventory/csv`);
      if (!response.ok) throw new Error('Failed to download CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${event.Event_Name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to download CSV: " + error.message });
    }
  };

  // Toggle expanded row
  const toggleRow = (index) => {
    if (expandedRow === index) {
      setExpandedRow(null); // Collapse if already expanded
    } else {
      setExpandedRow(index); // Expand the clicked row
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-gray-50 border-l-4 border-gray-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-gray-700">Event not found</p>
          </div>
        </div>
      </div>
    );
  }

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return "0 minutes";
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes`;
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-4 rounded-lg ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <span>←</span>
            Back to Events
          </button>
          <h1 className="text-2xl font-bold">{event.Event_Name}</h1>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium"
          >
            <span className="font-bold">↓</span> Download Inventory CSV
          </button>
          <button
            onClick={fetchEventDetails}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            <span className="inline-block transform rotate-90">↻</span> Refresh
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
          >
            ✕ Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Event Details</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Event ID</dt>
              <dd className="text-gray-600">{event.Event_ID}</dd>
            </div>
            <div>
              <dt className="font-medium">Date & Time</dt>
              <dd className="text-gray-600">
                {new Date(event.Event_DateTime).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Available Seats</dt>
              <dd className="text-gray-600">{event.Available_Seats}</dd>
            </div>
            <div>
              <dt className="font-medium">Last Updated</dt>
              <dd className="text-gray-600">
                {new Date(event.Last_Updated).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Mapping ID</dt>
              <dd className="text-gray-600 font-mono">{event.mapping_id || "Not set"}</dd>
            </div>
            <div>
              <dt className="font-medium">URL</dt>
              <dd className="text-gray-600 break-all">{event.URL}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scraping Stats</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Iteration Number</dt>
              <dd className="text-gray-600">
                {getStatValue('iterationNumber')}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Last Scrape Duration</dt>
              <dd className="text-gray-600">
                {formatDuration(getStatValue('scrapeDurationSeconds'))}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Total Running Time</dt>
              <dd className="text-gray-600">
                {getStatValue('totalRunningTimeMinutes', '0')} minutes
              </dd>
            </div>
            <div>
              <dt className="font-medium">Total Tickets</dt>
              <dd className="text-gray-600">
                {getStatValue('ticketStats.totalTickets')}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Ticket Count Change</dt>
              <dd
                className={getChangeColor(
                  getStatValue('ticketStats.ticketCountChange')
                )}
              >
                {getStatValue('ticketStats.ticketCountChange') > 0 ? "+" : ""}
                {getStatValue('ticketStats.ticketCountChange')}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Previous Ticket Count</dt>
              <dd className="text-gray-600">
                {getStatValue('ticketStats.previousTicketCount')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Available Seat Groups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {event.seatGroups?.map((group, index) => (
                <React.Fragment key={index}>
                  <tr
                    onClick={() => toggleRow(index)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {group.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{group.row}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {group.seatRange}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {group.seatCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${Math.min(...group.seats.map((s) => s.price)).toFixed(2)}{" "}
                      - $
                      {Math.max(...group.seats.map((s) => s.price)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(group.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <h3 className="font-medium">Inventory Details</h3>
                          <dl className="space-y-2">
                            <div>
                              <dt className="font-medium">Quantity</dt>
                              <dd className="text-gray-600">
                                {group.inventory.quantity}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Hide Seat Numbers</dt>
                              <dd className="text-gray-600">
                                {group.inventory.hideSeatNumbers ? "Yes" : "No"}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Cost</dt>
                              <dd className="text-gray-600">
                                ${group.inventory.cost.toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Stock Type</dt>
                              <dd className="text-gray-600">
                                {group.inventory.stockType}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Line Type</dt>
                              <dd className="text-gray-600">
                                {group.inventory.lineType}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Seat Type</dt>
                              <dd className="text-gray-600">
                                {group.inventory.seatType}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">In-Hand Date</dt>
                              <dd className="text-gray-600">
                                {new Date(
                                  group.inventory.inHandDate
                                ).toLocaleString()}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Notes</dt>
                              <dd className="text-gray-600">
                                {group.inventory.notes}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Tags</dt>
                              <dd className="text-gray-600">
                                {group.inventory.tags}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Inventory ID</dt>
                              <dd className="text-gray-600">
                                {group.inventory.inventoryId}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Offer ID</dt>
                              <dd className="text-gray-600">
                                {group.inventory.offerId}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Split Type</dt>
                              <dd className="text-gray-600">
                                {group.inventory.splitType}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Public Notes</dt>
                              <dd className="text-gray-600">
                                {group.inventory.publicNotes}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">List Price</dt>
                              <dd className="text-gray-600">
                                ${group.inventory.listPrice.toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium">Custom Split</dt>
                              <dd className="text-gray-600">
                                {group.inventory.customSplit}
                              </dd>
                            </div>
                          </dl>

                          <h3 className="font-medium">Tickets</h3>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Seat Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Cost
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Face Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {group.inventory.tickets?.map(
                                (ticket, ticketIndex) => (
                                  <tr key={ticketIndex}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {ticket.seatNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      ${ticket.cost.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      ${ticket.faceValue.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {ticket.status}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {(!event.seatGroups || event.seatGroups.length === 0) && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No seat groups available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Error Log</h2>
        <div className="space-y-4">
          {errorLogs.length === 0 ? (
            <p className="text-center text-gray-500">No errors recorded</p>
          ) : (
            errorLogs.map((errorLog, index) => (
              <div
                key={index}
                className="border-l-4 border-red-500 bg-red-50 p-4"
              >
                <div className="flex justify-between">
                  <h3 className="text-red-800 font-medium">
                    {errorLog.errorType}
                  </h3>
                  <span className="text-gray-500 text-sm">
                    {new Date(errorLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-red-700 mt-1">{errorLog.message}</p>
                {errorLog.stack && (
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                    {errorLog.stack}
                  </pre>
                )}
                {errorLog.metadata && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Iteration: {errorLog.metadata.iteration}</p>
                    {errorLog.metadata.additionalInfo && (
                      <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(
                          errorLog.metadata.additionalInfo,
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
