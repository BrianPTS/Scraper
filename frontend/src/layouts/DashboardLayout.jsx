import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Play, List } from "lucide-react";
const DashboardLayout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navItems = [
        {
            path: "/",
            label: "Dashboard",
            icon: _jsx(LayoutDashboard, { className: "w-5 h-5" }),
        },
        {
            path: "/events",
            label: "Events",
            icon: _jsx(Calendar, { className: "w-5 h-5" }),
        },
        {
            path: "/scraper",
            label: "Start Scraping",
            icon: _jsx(Play, { className: "w-5 h-5" }),
        },
    ];
    return (_jsxs("div", { className: "flex h-screen bg-gray-100", children: [_jsxs("aside", { className: `bg-white w-64 min-h-screen p-4 shadow-lg transition-all ${isSidebarOpen ? "" : "-ml-64"}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsx("h1", { className: "text-xl font-bold", children: "Ticket Scraper" }), _jsx("button", { onClick: () => setIsSidebarOpen(!isSidebarOpen), className: "p-2 hover:bg-gray-100 rounded-lg", children: _jsx(List, { className: "w-6 h-6" }) })] }), _jsx("nav", { children: navItems.map((item) => (_jsxs(Link, { to: item.path, className: `flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${location.pathname === item.path
                                ? "bg-blue-50 text-blue-600"
                                : "hover:bg-gray-50"}`, children: [item.icon, _jsx("span", { children: item.label })] }, item.path))) })] }), _jsx("main", { className: "flex-1 overflow-x-hidden overflow-y-auto p-6", children: _jsx(Outlet, {}) })] }));
};
export default DashboardLayout;
