import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Smartphone, Calendar } from 'lucide-react';
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
		<nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					{/* Logo/Brand */}
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
							<span className="text-primary-foreground font-bold text-sm">F</span>
						</div>
						<span className="font-semibold text-lg">Festmeister Österreich</span>
					</div>

					{/* Navigation Links */}
					<div className="flex items-center space-x-1">
						<Button
							variant={isActive('/') ? 'festival' : 'ghost'}
							size="sm"
							onClick={() => navigate('/')}
							className="flex items-center gap-2">
							<Home className="h-4 w-4" />
							<span className="hidden sm:inline">Start</span>
						</Button>

						{user && (
							<>
								<Button
									variant={isActive('/dashboard') ? 'festival' : 'ghost'}
									size="sm"
									onClick={() => navigate('/dashboard')}
									className="flex items-center gap-2">
									<LayoutDashboard className="h-4 w-4" />
									<span className="hidden sm:inline">Dashboard</span>
								</Button>

								{/* Mobile Waiter feature temporarily hidden
								<Button
									variant={isActive('/mobile-waiter') ? 'festival' : 'ghost'}
									size="sm"
									onClick={() => navigate('/mobile-waiter')}
									className="flex items-center gap-2">
									<Smartphone className="h-4 w-4" />
									<span className="hidden sm:inline">Mobile</span>
								</Button>
								*/}
							</>
						)}
					</div>

					{/* User Actions */}
					<div className="flex items-center space-x-2">
						{user ? (
							<Button
								variant="outline"
								size="sm"
								onClick={handleSignOut}
								className="flex items-center gap-2">
								<span>Abmelden</span>
							</Button>
						) : (
							<Button
								variant="festival"
								size="sm"
								onClick={() => navigate('/auth')}
								className="flex items-center gap-2">
								<span>Anmelden</span>
							</Button>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}
