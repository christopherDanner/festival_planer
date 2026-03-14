import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Calendar } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function Navigation() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, signOut } = useAuth();

	const isActive = (path: string) => location.pathname === path;

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
			<div className="w-full px-2 sm:px-4">
				<div className="flex items-center justify-between h-14 sm:h-16">
					{/* Logo/Brand */}
					<div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 shrink">
						<div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-hero rounded-lg flex items-center justify-center shrink-0">
							<span className="text-primary-foreground font-bold text-xs sm:text-sm">F</span>
						</div>
						<span className="font-semibold text-sm sm:text-base truncate">Festmeister</span>
					</div>

					{/* Navigation Links */}
					<div className="flex items-center space-x-0.5 sm:space-x-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate('/')}
							className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 ${isActive('/') ? 'border-b-2 border-primary rounded-none' : ''}`}>
							<Home className="h-4 w-4" />
							<span className="hidden sm:inline">Start</span>
						</Button>

						{user && (
							<>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => navigate('/dashboard')}
									className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 ${isActive('/dashboard') ? 'border-b-2 border-primary rounded-none' : ''}`}>
									<LayoutDashboard className="h-4 w-4" />
									<span className="hidden sm:inline">Dashboard</span>
								</Button>
							</>
						)}
					</div>

					{/* User Actions */}
					<div className="flex items-center shrink-0">
						{user ? (
							<Button
								variant="outline"
								size="sm"
								onClick={handleSignOut}
								className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
								<span className="hidden sm:inline">Abmelden</span>
								<span className="sm:hidden">Aus</span>
							</Button>
						) : (
							<Button
								variant="default"
								size="sm"
								onClick={() => navigate('/auth')}
								className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3">
								<span>Anmelden</span>
							</Button>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}
