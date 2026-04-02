import { Bell, HelpCircle, LogOut, Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { CompactUserHUD } from "@/components/CompactUserHUD";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { ScanList } from "@/components/dashboard/ScanList";
import { ScanManager } from "@/components/dashboard/ScanManager";
import { DashboardStatusCard } from "@/components/dashboard/DashboardStatusCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RecurringScanManager } from "@/components/dashboard/RecurringScanManager";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { DashboardOverlays } from "@/components/dashboard/DashboardOverlays";
import { useDashboardPage } from "@/pages/useDashboardPage";

export default function Dashboard() {
  const d = useDashboardPage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        showDashboard={false}
        onCompareSites={() => d.setShowCompetitorDialog(true)}
        toolbarItems={
          <>
            {d.user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => d.setShowTrophyCase(true)}
                className="btn-hover-scale text-muted-foreground hover:text-yellow-400"
                title="View Achievements"
                data-testid="button-trophy-case"
              >
                <Trophy className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={d.runTour}
              className="btn-hover-scale text-muted-foreground hover:text-primary"
              title="Start Feature Tour"
              data-testid="button-tour"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            <button
              type="button"
              onClick={() => d.setShowNotificationsSheet(true)}
              className="relative p-2 hover:bg-white/5 rounded-lg transition-smooth btn-hover-scale group"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              {d.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {d.unreadCount > 9 ? "9+" : d.unreadCount}
                </span>
              )}
            </button>

            {d.user && <CompactUserHUD />}

            {d.user && (
              <div className="flex items-center gap-3">
                {d.user.profileImageUrl && (
                  <img
                    src={d.user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-primary/30"
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {d.user.firstName || d.user.email}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
              className="border-border btn-hover-scale"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </>
        }
      />

      <div className="container mx-auto px-6 pt-24 pb-12">
        <DashboardHeader user={d.user} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ScanManager
            allTags={d.allTags}
            onScanComplete={d.handleScanComplete}
          />
          <DashboardStatusCard
            isAgencyView={d.isAgencyView}
            recurringScans={d.recurringScans}
            scans={d.scans}
          />
        </div>

        <div className="mb-8">
          <SubscriptionStatus />
        </div>

        <RecurringScanManager
          onOpenPreferences={d.openPreferences}
          onRecurringScansChange={d.onRecurringScansChange}
        />

        <ScanList
          loading={d.loading}
          scans={
            d.hasActiveSubscription
              ? d.scans.map((scan) => ({ ...scan, isPurchased: true }))
              : d.scans
          }
          allTags={d.allTags}
          selectedTags={d.selectedTags}
          showTagFilter={d.showTagFilter}
          setShowTagFilter={d.setShowTagFilter}
          comparisonMode={d.comparisonMode}
          selectedScanForComparison={d.selectedScanForComparison}
          onToggleTagFilter={d.handleToggleTagFilter}
          onClearTagFilter={d.handleClearTagFilter}
          onCancelComparison={d.cancelComparison}
          getScansForUrl={d.getScansForUrl}
          onQuickCompare={d.handleQuickCompare}
          onCompareScans={d.handleCompareScans}
          onUnlock={d.handleUnlock}
          onAddTag={d.handleAddTag}
          onRemoveTag={d.handleRemoveTag}
          downloadFile={d.downloadFile}
          botAccessTests={d.botAccessTests}
          testingBots={d.testingBots}
          onTestBotAccess={d.testBotAccess}
          expandedScan={d.expandedScan}
          setExpandedScan={d.setExpandedScan}
        />
      </div>

      <SettingsPanel ref={d.settingsPanelRef} />

      <DashboardOverlays
        user={d.user}
        selectedScan={d.selectedScan}
        showPaymentModal={d.showPaymentModal}
        setShowPaymentModal={d.setShowPaymentModal}
        handlePaymentSuccess={d.handlePaymentSuccess}
        showTrophyCase={d.showTrophyCase}
        setShowTrophyCase={d.setShowTrophyCase}
        showScanDetailsModal={d.showScanDetailsModal}
        setShowScanDetailsModal={d.setShowScanDetailsModal}
        scanDetailsData={d.scanDetailsData}
        setScanDetailsData={d.setScanDetailsData}
        showNotificationsSheet={d.showNotificationsSheet}
        setShowNotificationsSheet={d.setShowNotificationsSheet}
        notifications={d.notifications}
        unreadCount={d.unreadCount}
        handleMarkAllRead={d.handleMarkAllRead}
        handleMarkNotificationRead={d.handleMarkNotificationRead}
        formatRelativeTime={d.formatRelativeTime}
        loadingScanId={d.loadingScanId}
        setLoadingScanId={d.setLoadingScanId}
        showComparison={d.showComparison}
        setShowComparison={d.setShowComparison}
        comparisonOldScan={d.comparisonOldScan}
        comparisonNewScan={d.comparisonNewScan}
        comparisonLabels={d.comparisonLabels}
        setComparisonOldScan={d.setComparisonOldScan}
        setComparisonNewScan={d.setComparisonNewScan}
        showCompetitorDialog={d.showCompetitorDialog}
        setShowCompetitorDialog={d.setShowCompetitorDialog}
        competitorUrl={d.competitorUrl}
        setCompetitorUrl={d.setCompetitorUrl}
        myUrlForCompare={d.myUrlForCompare}
        setMyUrlForCompare={d.setMyUrlForCompare}
        isAnalyzingCompetitor={d.isAnalyzingCompetitor}
        competitorError={d.competitorError}
        handleCompetitorAnalysis={d.handleCompetitorAnalysis}
        setSelectedScan={d.setSelectedScan}
      />
    </div>
  );
}
