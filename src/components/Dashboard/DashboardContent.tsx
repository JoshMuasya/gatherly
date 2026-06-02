"use client"

import { useApp } from "@/lib/context/AppContext";
import { DashboardOverview } from "./views/DashboardOverview";
import CreateEventView from "./views/CreateEventView";
import { EventsView } from "./views/EventsView";
import { PaymentsView } from "./views/PaymentsView";
import { RegistrationsView } from "./views/RegistrationsView";
import { ReportsView } from "./views/ReportsView";
import { SettingsView } from "./views/SettingsView";
import { UsersView } from "./views/UsersView";
import { UserRole } from "@/lib/types";
import CheckInView from "./views/CheckInView";
import { AuditLogsView } from "./views/AuditLogsView";

interface ViewMapProps {
    userRole?: UserRole;
}

const viewMap: Record<string, React.ComponentType<any>> = {
    dashboard: DashboardOverview,
    events: EventsView,
    registrations: RegistrationsView,
    users: UsersView,
    payments: PaymentsView,
    "create-event": CreateEventView,
    'check-in': CheckInView,
    reports: ReportsView,
    'audit-logs': AuditLogsView,
    settings: SettingsView,
};

const DashboardContent = () => {
    const { activeSection, currentUser } = useApp();

    // Determine which props to pass to the current view
    const viewProps: ViewMapProps =
        activeSection === "payments"
            ? {
                userRole: currentUser?.role,
            }
            : {};

    const View = viewMap[activeSection] || DashboardOverview;

    return (
        <div className="animate-fade-in w-full">
            <View {...viewProps} />
        </div>
    )
}

export default DashboardContent
