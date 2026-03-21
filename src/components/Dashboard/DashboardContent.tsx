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

const viewMap: Record<string, React.ComponentType> = {
    dashboard: DashboardOverview,
    events: EventsView,
    registrations: RegistrationsView,
    users: UsersView,
    payments: PaymentsView,
    'create-event': CreateEventView,
    reports: ReportsView,
    settings: SettingsView,
};

const DashboardContent = () => {
    const { activeSection } = useApp();
    const View = viewMap[activeSection] || DashboardOverview;

    return (
        <div className="animate-fade-in w-full">
            <View />
        </div>
    )
}

export default DashboardContent
