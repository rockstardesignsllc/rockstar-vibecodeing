import React from 'react';
import { Outlet } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '../components/layout/app-sidebar';
import { GlobalHeader } from '../components/layout/global-header';
import { AppsDataProvider } from '../contexts/apps-data-context';

export function AppShell() {
	return (
		<AppsDataProvider>
			<SidebarProvider
				defaultOpen={false}
				style={
					{
						'--sidebar-width': '320px',
						'--sidebar-width-mobile': '280px',
						'--sidebar-width-icon': '52px',
					} as React.CSSProperties
				}
			>
				<AppSidebar />
				<SidebarInset className="bg-bg-3 flex flex-col h-screen">
					<GlobalHeader />
					<div className="flex-1 overflow-auto bg-bg-3">
						<Outlet />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</AppsDataProvider>
	);
}
