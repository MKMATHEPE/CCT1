import { useState } from "react";
import { TopBar } from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import ClaimDrawer from "./components/ClaimDrawer";
import RecordClaimModal from "./components/RecordClaimModal";
import { findDeviceByQuery } from "./services/deviceDataService";
import { exportAuditLogToPDF } from "./services/auditExportService";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AccessDenied from "./pages/AccessDenied";
import { useAuth } from "./auth/useAuth";
import CasesPage from "./pages/CasesPage";
import RiskQueuePage from "./pages/RiskQueuePage";
import InsightsPage from "./pages/InsightsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import InvestigationCaseViewPage from "./pages/InvestigationCaseViewPage";
import OpenCaseModal from "./components/OpenCaseModal";
import RegisterDeviceModal from "./components/RegisterDeviceModal";
import PlaceholderPage from "./pages/PlaceholderPage";
import ClaimDeviceNewClaimPage from "./pages/ClaimDeviceNewClaimPage";
import ClaimDeviceExistingDevicesPage from "./pages/ClaimDeviceExistingDevicesPage";
import ClaimDeviceHistoryPage from "./pages/ClaimDeviceHistoryPage";
import ClaimDeviceDuplicateDevicesPage from "./pages/ClaimDeviceDuplicateDevicesPage";
import ClaimDeviceDuplicateDetailPage from "./pages/ClaimDeviceDuplicateDetailPage";
import InvestigationsAssignedToMePage from "./pages/InvestigationsAssignedToMePage";
import InvestigationsOpenCasesPage from "./pages/InvestigationsOpenCasesPage";
import InvestigationsHighRiskPage from "./pages/InvestigationsHighRiskPage";
import InvestigationsClosedCasesPage from "./pages/InvestigationsClosedCasesPage";
import RiskQueueUnifiedPage from "./pages/RiskQueueUnifiedPage";
import LoggedOutPage from "./pages/LoggedOutPage";
import { writeAuditLog } from "./services/auditLogService";
import type { DuplicateEvidenceContext } from "./services/duplicateEvidenceService";

export default function App() {
  const [selectedIMEI, setSelectedIMEI] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showRecordClaim, setShowRecordClaim] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOpenCase, setShowOpenCase] = useState(false);
  const [openCaseImei, setOpenCaseImei] = useState<string | null>(null);
  const [openCaseContext, setOpenCaseContext] =
    useState<DuplicateEvidenceContext | null>(null);
  const [showRegisterDevice, setShowRegisterDevice] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  function handleLogin(role: "analyst" | "manager") {
    sessionStorage.setItem("cct:logged-out", "false");
    sessionStorage.setItem("cct:demo-role", role);
    window.location.reload();
  }

  if (!user) {
    return <LoggedOutPage onLogin={handleLogin} />;
  }
  const isManagerOrAdmin =
    user?.role === "manager" || user?.role === "admin";
  const isAnalyst = user?.role === "analyst";
  const readOnlyCaseView =
    location.pathname.startsWith("/cases/closed") ||
    (location.pathname.startsWith("/cases/open") &&
      user?.role === "analyst");
  const allowReopenFromView = !location.pathname.startsWith("/cases/closed");
  const allowReassignFromView = !location.pathname.startsWith("/cases/closed");

  function handleSearch(query: string) {
    const imei = findDeviceByQuery(query);
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    const outcome = imei ? "SUCCESS" : "FAILURE";

    if (query.trim()) {
      writeAuditLog({
        actor,
        actorRole,
        action: "SEARCH",
        target: query.trim(),
        outcome,
        context: "Global search via top bar",
      });
    }

    if (!imei) {
      setSearchError("No device found");
      return;
    }

    setSearchError(null);
    setSelectedIMEI(imei);
  }

  function handleAuditExport() {
    const ok = confirm(
      "This will export the full audit log for compliance purposes. Continue?"
    );

    if (ok) {
      const actor = user?.id ?? "system";
      const actorRole = user?.role ?? "unknown";
      writeAuditLog({
        actor,
        actorRole,
        action: "AUDIT_EXPORTED",
        target: "audit-log",
        outcome: "SUCCESS",
        context: "Audit log export initiated",
      });
      exportAuditLogToPDF();
    }
  }

  function handleViewCase(imei: string) {
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "CASE_VIEWED",
      target: imei,
      outcome: "SUCCESS",
      context: "Case view opened",
    });
    setSelectedIMEI(imei);
  }

  function handleOpenCase(imei?: string, serial?: string) {
    setOpenCaseContext(null);
    if (!imei && serial) {
      setOpenCaseImei(serial);
    } else {
      setOpenCaseImei(imei ?? null);
    }
    setShowOpenCase(true);
  }

  function handleOpenCaseFromDuplicate(context: DuplicateEvidenceContext) {
    setOpenCaseContext(context);
    setOpenCaseImei(context.serial);
    setShowOpenCase(true);
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 🔍 Top Bar */}
      <TopBar
        onSearch={handleSearch}
        searchError={searchError}
        onProfile={() => navigate("/settings/profile")}
        onLogout={logout}
        onLogin={() => window.location.reload()}
      />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <Sidebar
          onRecordClaim={() => setShowRecordClaim(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onOpenCase={() => handleOpenCase()}
          onRegisterDevice={() => setShowRegisterDevice(true)}
          onDownloadAudit={handleAuditExport}
          onLogout={logout}
        />

        <main className="flex-1 p-6 bg-bg space-y-6 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={<DashboardPage />}
            />
            <Route
              path="/register-devices"
              element={
                <PlaceholderPage
                  title="Register Device / Registered Devices"
                  description="View registered devices (structure only)."
                />
              }
            />
            <Route
              path="/register-devices/duplicates"
              element={
                <PlaceholderPage
                  title="Register Device / Duplicate Serials"
                  description="Devices flagged as duplicates (structure only)."
                />
              }
            />
            <Route
              path="/claim-device"
              element={
                <PlaceholderPage
                  title="Claim Device"
                  description="Claim device workspace (structure only)."
                />
              }
            />
            <Route
              path="/claim-device/new"
              element={
                isAnalyst ? (
                  <ClaimDeviceNewClaimPage />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/claim-device/existing"
              element={<ClaimDeviceExistingDevicesPage />}
            />
            <Route
              path="/claim-device/existing/:serial"
              element={<ClaimDeviceHistoryPage />}
            />
            <Route
              path="/claim-device/duplicates"
              element={
                <ClaimDeviceDuplicateDevicesPage
                  onOpenCase={isAnalyst ? handleOpenCaseFromDuplicate : undefined}
                />
              }
            />
            <Route
              path="/claim-device/duplicates/:serial"
              element={
                <ClaimDeviceDuplicateDetailPage
                  onOpenCase={isAnalyst ? handleOpenCaseFromDuplicate : undefined}
                />
              }
            />
            <Route
              path="/investigations"
              element={
                <PlaceholderPage
                  title="Investigations"
                  description="Investigations overview (placeholder)."
                />
              }
            />
            <Route
              path="/investigations/open"
              element={
                <InvestigationsOpenCasesPage
                  onOpenCase={isAnalyst ? () => handleOpenCase() : undefined}
                />
              }
            />
            <Route
              path="/investigations/assigned"
              element={<InvestigationsAssignedToMePage />}
            />
            <Route
              path="/investigations/high-risk"
              element={
                <InvestigationsHighRiskPage
                  onOpenCase={isAnalyst ? () => handleOpenCase() : undefined}
                />
              }
            />
            <Route
              path="/investigations/closed"
              element={<InvestigationsClosedCasesPage />}
            />
            <Route
              path="/investigations/cases/:caseId"
              element={<InvestigationCaseViewPage />}
            />
            <Route
              path="/cases/open"
              element={
                <CasesPage
                  filter="open"
                  title="Open Cases"
                  description="Active investigations awaiting resolution."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/cases/closed"
              element={
                <CasesPage
                  filter="closed"
                  title="Closed Cases"
                  description="Resolved investigations with final decisions."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/cases/assigned"
              element={
                <CasesPage
                  filter="assigned"
                  title="Assigned to Me"
                  description="Cases currently assigned to your queue."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/cases/high-risk"
              element={
                <CasesPage
                  filter="high-risk"
                  title="High-Risk Cases"
                  description="Priority cases requiring immediate attention."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/search/imei"
              element={
                <SearchPage
                  mode="imei"
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/search/serial"
              element={
                <SearchPage
                  mode="serial"
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/search/policy"
              element={
                <SearchPage
                  mode="policy"
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/search/claim"
              element={
                <SearchPage
                  mode="claim"
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/risk/high"
              element={
                <RiskQueuePage
                  level="high"
                  title="High Risk Queue"
                  description="Claims with the strongest risk signals."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/risk/medium"
              element={
                <RiskQueuePage
                  level="medium"
                  title="Medium Risk Queue"
                  description="Claims that require secondary review."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/risk/pending"
              element={
                <RiskQueuePage
                  level="pending"
                  title="Pending Review"
                  description="Claims waiting for a decision."
                  onViewCase={handleViewCase}
                />
              }
            />
            <Route
              path="/risk-queue"
              element={
                <RiskQueueUnifiedPage
                  onOpenCase={isAnalyst ? handleOpenCaseFromDuplicate : undefined}
                />
              }
            />
            <Route
              path="/insights/duplicate-rate"
              element={
                isManagerOrAdmin ? (
                  <InsightsPage view="duplicate-rate" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/insights/fraud-prevented"
              element={
                isManagerOrAdmin ? (
                  <InsightsPage view="fraud-prevented" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/insights/top-devices"
              element={
                isManagerOrAdmin ? (
                  <InsightsPage view="top-devices" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/reports/audit"
              element={
                isManagerOrAdmin ? (
                  <ReportsPage
                    view="audit"
                    onExportAudit={handleAuditExport}
                  />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/reports/case"
              element={
                isManagerOrAdmin ? (
                  <ReportsPage view="case" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/reports/monthly"
              element={
                isManagerOrAdmin ? (
                  <ReportsPage view="monthly" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/settings/profile"
              element={
                <SettingsPage view="profile" />
              }
            />
            <Route
              path="/settings/access"
              element={
                isManagerOrAdmin ? (
                  <SettingsPage view="access" />
                ) : (
                  <AccessDenied />
                )
              }
            />
            <Route
              path="/settings/session"
              element={
                <SettingsPage view="session" />
              }
            />
            <Route
              path="/settings/system"
              element={
                <SettingsPage view="system" />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* 🧾 Side Drawer */}
      <ClaimDrawer
        imei={selectedIMEI}
        onClose={() => setSelectedIMEI(null)}
        readOnly={readOnlyCaseView}
        allowReopen={allowReopenFromView}
        allowReassign={allowReassignFromView}
        onOpenCase={(imei) => handleOpenCase(imei)}
      />

      <OpenCaseModal
        isOpen={showOpenCase}
        defaultImei={openCaseImei}
        context={openCaseContext}
        onClose={() => setShowOpenCase(false)}
      />

      <RegisterDeviceModal
        isOpen={showRegisterDevice}
        onClose={() => setShowRegisterDevice(false)}
        onOpenCase={(imei) => handleOpenCase(imei)}
      />

      {/* ➕ Record Claim Modal */}
      {showRecordClaim && (
        <RecordClaimModal
          onClose={() => setShowRecordClaim(false)}
          onRecorded={(imei) => setSelectedIMEI(imei)}
        />
      )}
    </div>
  );
}
