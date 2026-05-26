import { Outlet } from 'react-router';
import { AuthProvider } from '../contexts/auth-context';
import { AuthModalProvider } from '../components/auth/AuthModalProvider';
import { ThemeProvider } from '../contexts/theme-context';
import { Toaster } from '../components/ui/sonner';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function RootLayout() {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<AuthProvider>
					<AuthModalProvider>
						<Outlet />
						<Toaster richColors position="top-right" />
					</AuthModalProvider>
				</AuthProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
