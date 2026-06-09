import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Sponsors from './pages/Sponsors';
import FestivalResults from './pages/FestivalResults';
import MaterialUebernahme from './pages/MaterialUebernahme';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

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
						<Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
						<Route path="/sponsors" element={<ProtectedRoute><Sponsors /></ProtectedRoute>} />
						<Route path="/festival-results" element={<ProtectedRoute><FestivalResults /></ProtectedRoute>} />
						<Route path="/festivals/:festivalId/material-uebernahme" element={<ProtectedRoute><MaterialUebernahme /></ProtectedRoute>} />
						{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
						<Route path="*" element={<NotFound />} />
					</Routes>
				</TooltipProvider>
			</AuthProvider>
		</BrowserRouter>
	</QueryClientProvider>
);

export default App;
