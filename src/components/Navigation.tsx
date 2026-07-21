import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, MoreVertical } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function Navigation() {
	const navigate = useNavigate();
	const { user, signOut } = useAuth();

	const handleSignOut = async () => {
		await signOut();
		navigate('/');
	};

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
			<div className="w-full px-2 sm:px-4">
				<div className="flex items-center justify-between h-12 sm:h-14">
					{/* Logo/Brand — eingeloggt → Dashboard, ausgeloggt → Landing-Page */}
					<button
						type="button"
						onClick={() => navigate(user ? '/dashboard' : '/')}
						className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 shrink">
						<div className="w-7 h-7 sm:w-8 sm:h-8 bg-gruen flex items-center justify-center shrink-0">
							<span className="text-primary-foreground font-bold text-xs sm:text-sm">F</span>
						</div>
						<span className="font-semibold text-sm sm:text-base truncate">Festmeister</span>
					</button>

					{/* User Actions */}
					<div className="flex items-center shrink-0">
						{user ? (
							<>
								{/* Desktop: sichtbarer Abmelden-Button */}
								<Button
									variant="outline"
									size="sm"
									onClick={handleSignOut}
									className="hidden md:inline-flex items-center gap-2 text-sm px-3">
									Abmelden
								</Button>
								{/* Mobile: ⋮-Menü */}
								<div className="md:hidden">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Menü">
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={handleSignOut} className="gap-2">
												<LogOut className="h-4 w-4" />
												Abmelden
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</>
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
