import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NEW_FESTIVAL_PATH } from '@/lib/festivalRoutes';
import { Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Sponsors from './pages/Sponsors';
import FestivalResults from './pages/FestivalResults';
import Kopierwerk from './pages/Kopierwerk';
import MaterialUebernahme from './pages/MaterialUebernahme';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Toolkit-Schaukasten: nur im Dev-Build registriert (Issue #74); im
// Prod-Build entfällt Route und Chunk (import.meta.env.DEV → false).
const Werkstatt = import.meta.env.DEV ? lazy(() => import('./pages/Werkstatt')) : null;

const App = () => (
	<QueryClientProvider client={queryClient}>
		<BrowserRouter>
			<AuthProvider>
				<TooltipProvider>
					<Toaster />
					<Sonner />
					<Routes>
						<Route path="/" element={<Navigate to="/dashboard" replace />} />
						<Route path="/auth" element={<Auth />} />
						<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
						<Route path="/sponsors" element={<ProtectedRoute><Sponsors /></ProtectedRoute>} />
						<Route path="/festival-results" element={<ProtectedRoute><FestivalResults /></ProtectedRoute>} />
						{/* Kopierwerk (#93): Route aus der Konstante, damit Link und Route nicht auseinanderlaufen */}
						<Route path={NEW_FESTIVAL_PATH} element={<ProtectedRoute><Kopierwerk /></ProtectedRoute>} />
						<Route path="/festivals/:festivalId/material-uebernahme" element={<ProtectedRoute><MaterialUebernahme /></ProtectedRoute>} />
						{Werkstatt && (
							<Route
								path="/werkstatt"
								element={
									<Suspense fallback={null}>
										<Werkstatt />
									</Suspense>
								}
							/>
						)}
						{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
						<Route path="*" element={<NotFound />} />
					</Routes>
				</TooltipProvider>
			</AuthProvider>
		</BrowserRouter>
	</QueryClientProvider>
);

export default App;
