"use client";

import React, { useState, useEffect } from "react";
import { ModalShell } from "./ModalShell";
import { ModalHeader, type TokenDisplay } from "./ModalHeader";
import { ModalTabs, type TabConfig } from "./ModalTabs";
import { SectionHeading } from "./SectionHeading";

export interface BaseManageModalTabConfig extends TabConfig {
  sectionHeading: string;
  renderContent: (ctx: TabContentContext) => React.ReactNode;
}

export interface TabContentContext {
  tabId: string;
  activeTab: string;
  onClose: () => void;
}

export interface BaseManageModalConfig {
  protocol: string;
  header: {
    primaryToken: TokenDisplay;
    secondaryToken?: TokenDisplay;
  };
  tabs: BaseManageModalTabConfig[];
  initialTab?: string;
  sectionHeadingWithBorder?: boolean;
  onTabChange?: (tabId: string) => void;
}

interface BaseManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BaseManageModalConfig;
}

/**
 * Config-driven modal for Genesis, Anchor, Sail. Renders shell, header, tabs,
 * and per-tab section heading + content via renderContent. Simple flow only;
 * wizard (Anchor deposit) uses extended config later.
 */
export function BaseManageModal({
  isOpen,
  onClose,
  config,
}: BaseManageModalProps) {
  const { protocol, header, tabs, initialTab, sectionHeadingWithBorder = false, onTabChange } = config;
  const firstTabId = tabs[0]?.id ?? "";
  const [activeTab, setActiveTab] = useState(initialTab ?? firstTabId);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab ?? firstTabId);
    }
  }, [isOpen, initialTab, firstTabId]);

  const activeTabConfig = tabs.find((t) => t.id === activeTab);
  const tabConfigForTabs = tabs.map(({ sectionHeading, renderContent, ...rest }) => rest);

  if (!isOpen) return null;

  const ctx: TabContentContext = { tabId: activeTab, activeTab, onClose };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    onTabChange?.(id);
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader
        protocol={protocol}
        primaryToken={header.primaryToken}
        secondaryToken={header.secondaryToken}
      />
      <ModalTabs
        tabs={tabConfigForTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {activeTabConfig && (
          <div className="space-y-4">
            <SectionHeading withBorder={sectionHeadingWithBorder}>
              {activeTabConfig.sectionHeading}
            </SectionHeading>
            {activeTabConfig.renderContent(ctx)}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
