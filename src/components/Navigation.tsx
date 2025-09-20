import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Smartphone, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Erfolgreich abgemeldet');
      navigate('/');
    } catch (error) {
      toast.error('Fehler beim Abmelden');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Button
        variant={isActive("/") ? "festival" : "outline"}
        size="sm"
        onClick={() => navigate("/")}
      >
        <Home className="h-4 w-4" />
      </Button>
      
      {user && (
        <>
          <Button
            variant={isActive("/dashboard") ? "festival" : "outline"}
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isActive("/mobile-waiter") ? "festival" : "outline"}
            size="sm"
            onClick={() => navigate("/mobile-waiter")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </>
      )}
      
      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user.email}
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white"
            title={`Abmelden (${user.email})`}
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>
      ) : (
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => navigate("/auth")}
        >
          <User className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Anmelden</span>
        </Button>
      )}
    </div>
  );
}