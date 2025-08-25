import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import CreatorAppLayoutExact from '@/pages/creator-app-layout-exact';

export function CreatorAppPreview() {
  return (
    <div className="h-full flex flex-col">
      {/* CRM Preview Header with Standardized Back Button */}
      <PageHeader
        title="Creator App Layout Preview"
        showBackButton={true}
        useBrowserBack={true}
      />

      {/* Embedded Creator App */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <CreatorAppLayoutExact isAdminPreview={true} />
        </div>
      </div>
    </div>
  );
}