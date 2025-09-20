import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Smartphone, Users } from "lucide-react";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Button
        variant={isActive("/") ? "festival" : "outline"}
        size="sm"
        onClick={() => navigate("/")}
      >
        <Home className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive("/dashboard") ? "festival" : "outline"}
        size="sm"
        onClick={() => navigate("/dashboard")}
      >
        <LayoutDashboard className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive("/members") ? "festival" : "outline"}
        size="sm"
        onClick={() => navigate("/members")}
      >
        <Users className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive("/mobile-waiter") ? "festival" : "outline"}
        size="sm"
        onClick={() => navigate("/mobile-waiter")}
      >
        <Smartphone className="h-4 w-4" />
      </Button>
    </div>
  );
}